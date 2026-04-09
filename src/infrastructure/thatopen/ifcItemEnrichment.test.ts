import assert from "node:assert/strict";
import test from "node:test";
import type { IfcProjectUnits } from "./ifcProjectUnits";
import {
  extractIfcMaterialNames,
  extractIfcQuantitiesMap,
  inferLinearLabelUnit,
  mergeMeasurementMaterialOverlay
} from "./ifcItemEnrichment";

test("extractIfcQuantitiesMap lee IFCELEMENTQUANTITY con valores numéricos", () => {
  const item = {
    IsDefinedBy: [
      {
        _category: { value: "IFCELEMENTQUANTITY" },
        Name: { value: "Qto_WallBaseQuantities" },
        Quantities: [
          {
            Name: { value: "Height" },
            LengthValue: { value: 3.2, type: "IFCLENGTHMEASURE" }
          },
          {
            Name: { value: "Width" },
            LengthValue: { value: 0.2, type: "IFCLENGTHMEASURE" }
          }
        ]
      }
    ]
  };

  const map = extractIfcQuantitiesMap(item as Record<string, unknown>);
  assert.equal(map.get("Qto_WallBaseQuantities.Height")?.numeric, 3.2);
  assert.equal(map.get("Qto_WallBaseQuantities.Width")?.numeric, 0.2);
});

test("inferLinearLabelUnit: cotas en metros", () => {
  assert.equal(inferLinearLabelUnit([3.2, 0.2, 8.5]), "m");
});

test("inferLinearLabelUnit: cotas en milímetros (Revit)", () => {
  assert.equal(inferLinearLabelUnit([1500, 18409.999999999996, 280]), "mm");
});

test("extractIfcMaterialNames recoge IFCMATERIAL en HasAssociations", () => {
  const item = {
    HasAssociations: [
      {
        _category: { value: "IFCMATERIAL" },
        Name: { value: "Ladrillo cerámico" }
      }
    ]
  };

  const names = extractIfcMaterialNames(item as Record<string, unknown>);
  assert.deepEqual(names, ["Ladrillo cerámico"]);
});

test("extractIfcMaterialNames incluye materiales del tipo (IsTypedBy)", () => {
  const item = {
    HasAssociations: [],
    IsTypedBy: [
      {
        HasAssociations: [
          {
            _category: { value: "IFCMATERIAL" },
            Name: { value: "Mortero" }
          }
        ]
      }
    ]
  };

  const names = extractIfcMaterialNames(item as Record<string, unknown>);
  assert.deepEqual(names, ["Mortero"]);
});

test("mergeMeasurementMaterialOverlay prioriza Qto en metros y rellena volumen con bbox", () => {
  const item = {
    IsDefinedBy: [
      {
        _category: { value: "IFCELEMENTQUANTITY" },
        Name: { value: "BaseQuantities" },
        Quantities: [
          {
            Name: { value: "Height" },
            LengthValue: { value: 2.5, type: "IFCLENGTHMEASURE" }
          }
        ]
      }
    ],
    HasAssociations: []
  } as Record<string, unknown>;

  const merged = mergeMeasurementMaterialOverlay(item, { dx: 1, dy: 2, dz: 8, volume: 16 });
  const bag = merged["Medida: alto (m)"] as { value: string };
  assert.equal(bag.value, "2.50");
  const volKey = Object.keys(merged).find((k) => k.startsWith("Medida: volumen"));
  assert.ok(volKey?.includes("(m³)"));
  const vol = merged[volKey ?? ""] as { value: string };
  assert.ok(vol.value.includes("16.00"));
});

test("mergeMeasurementMaterialOverlay redondea mm sin decimales", () => {
  const item = {
    IsDefinedBy: [
      {
        _category: { value: "IFCELEMENTQUANTITY" },
        Name: { value: "Qto_WallBaseQuantities" },
        Quantities: [
          { Name: { value: "Height" }, LengthValue: { value: 1500, type: "IFCLENGTHMEASURE" } },
          {
            Name: { value: "Length" },
            LengthValue: { value: 18409.999999999996, type: "IFCLENGTHMEASURE" }
          },
          { Name: { value: "Width" }, LengthValue: { value: 280, type: "IFCLENGTHMEASURE" } }
        ]
      }
    ],
    HasAssociations: []
  } as Record<string, unknown>;

  const merged = mergeMeasurementMaterialOverlay(item, null);
  assert.equal((merged["Medida: alto (mm)"] as { value: string }).value, "1500");
  assert.equal((merged["Medida: largo (mm)"] as { value: string }).value, "18410");
  assert.equal((merged["Medida: ancho / espesor (mm)"] as { value: string }).value, "280");
});

test("mergeMeasurementMaterialOverlay usa IfcProjectUnits (mm) aunque la heurística diría metros", () => {
  const item = {
    IsDefinedBy: [
      {
        _category: { value: "IFCELEMENTQUANTITY" },
        Name: { value: "BaseQuantities" },
        Quantities: [{ Name: { value: "Height" }, LengthValue: { value: 300, type: "IFCLENGTHMEASURE" } }]
      }
    ],
    HasAssociations: []
  } as Record<string, unknown>;

  const units: IfcProjectUnits = {
    length: { metresPerUnit: 0.001, label: "mm" },
    volume: { cubicMetresPerUnit: 1e-9, label: "mm³" }
  };

  const merged = mergeMeasurementMaterialOverlay(item, null, units);
  assert.equal((merged["Medida: alto (mm)"] as { value: string }).value, "300");
});
