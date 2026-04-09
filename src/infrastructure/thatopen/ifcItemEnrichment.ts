import * as THREE from "three";
import type { IfcProjectUnits } from "./ifcProjectUnits";

/**
 * Configuración alineada con el pipeline That Open (IDS / Properties) para traer
 * Psets, cantidades (Qto), tipo y relaciones de material en un solo `getItemsData`.
 */
export const IFC_ITEM_RELATIONS_CONFIG = {
  relations: {
    IsDefinedBy: { attributes: true, relations: true },
    IsTypedBy: { attributes: true, relations: false },
    HasPropertySets: { attributes: true, relations: true },
    DefinesOcurrence: { attributes: false, relations: false },
    HasAssociations: { attributes: true, relations: true },
    AssociatedTo: { attributes: false, relations: false },
    MaterialConstituents: { attributes: true, relations: true },
    ForLayerSet: { attributes: true, relations: true },
    MaterialLayers: { attributes: true, relations: true },
    Materials: { attributes: true, relations: false }
  }
} as const;

type IfcBag = { value: unknown; type?: unknown };

export type QuantityCell = {
  numeric: number;
  ifcType?: string;
  kind: "length" | "area" | "volume" | "count" | "weight" | "time" | "other";
};

const QUANTITY_VALUE_KEYS = [
  ["LengthValue", "length"],
  ["AreaValue", "area"],
  ["VolumeValue", "volume"],
  ["CountValue", "count"],
  ["TimeValue", "time"],
  ["WeightValue", "weight"]
] as const;

/** Sufijo de unidad en la etiqueta; null = no mostrar unidad (ambiguo). */
export type LengthLabelUnit = "mm" | "m" | null;
export type VolumeLabelUnit = "mm³" | "m³" | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readIfcBag(entity: unknown, key: string): IfcBag | null {
  if (!isRecord(entity)) {
    return null;
  }

  const cell = entity[key];
  if (!isRecord(cell) || !("value" in cell)) {
    return null;
  }

  return cell as IfcBag;
}

function readName(entity: unknown): string | null {
  const bag = readIfcBag(entity, "Name");
  if (!bag) {
    return null;
  }

  return bag.value === undefined || bag.value === null ? null : String(bag.value);
}

function getEntityCategory(entity: unknown): string | null {
  const bag = readIfcBag(entity, "_category");
  if (!bag || !("value" in bag)) {
    return null;
  }

  return String(bag.value);
}

function readQuantityCell(qty: Record<string, unknown>): QuantityCell | null {
  for (const [key, kind] of QUANTITY_VALUE_KEYS) {
    const bag = qty[key];
    if (!isRecord(bag) || !("value" in bag)) {
      continue;
    }

    const raw = (bag as IfcBag).value;
    const typ = (bag as IfcBag).type;
    const num = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(num)) {
      continue;
    }

    const result: QuantityCell = {
      numeric: num,
      kind: kind as QuantityCell["kind"]
    };
    if (typ !== undefined && typ !== null) {
      result.ifcType = String(typ);
    }

    return result;
  }

  return null;
}

function forEachQuantityDefinition(item: Record<string, unknown>, visit: (def: Record<string, unknown>) => void): void {
  const defs = item.IsDefinedBy;
  if (Array.isArray(defs)) {
    for (const d of defs) {
      if (isRecord(d)) {
        visit(d);
      }
    }
  }

  const typed = item.IsTypedBy;
  if (!Array.isArray(typed) || typed.length === 0) {
    return;
  }

  const firstType = typed[0];
  if (!isRecord(firstType)) {
    return;
  }

  const psets = firstType.HasPropertySets;
  if (!Array.isArray(psets)) {
    return;
  }

  for (const d of psets) {
    if (isRecord(d)) {
      visit(d);
    }
  }
}

/**
 * Mapa nombre de cantidad (IFC) → valor numérico + tipo.
 */
export function extractIfcQuantitiesMap(item: Record<string, unknown>): Map<string, QuantityCell> {
  const map = new Map<string, QuantityCell>();

  forEachQuantityDefinition(item, (def) => {
    if (getEntityCategory(def) !== "IFCELEMENTQUANTITY") {
      return;
    }

    const quantities = def.Quantities;
    if (!Array.isArray(quantities)) {
      return;
    }

    const setName = readName(def);

    for (const q of quantities) {
      if (!isRecord(q)) {
        continue;
      }

      const qName = readName(q);
      if (!qName) {
        continue;
      }

      const cell = readQuantityCell(q);
      if (!cell) {
        continue;
      }

      const label = setName ? `${setName}.${qName}` : qName;
      map.set(label, cell);
    }
  });

  return map;
}

function collectMaterialNames(node: unknown, acc: Set<string>): void {
  if (!isRecord(node)) {
    return;
  }

  if (readIfcBag(node, "_category")?.value === "IFCMATERIAL") {
    const n = readName(node);
    if (n) {
      acc.add(n);
    }

    return;
  }

  for (const key of ["MaterialLayers", "MaterialConstituents", "Materials", "ForLayerSet", "Material"] as const) {
    const v = node[key];
    if (Array.isArray(v)) {
      for (const child of v) {
        collectMaterialNames(child, acc);
      }
    } else if (v) {
      collectMaterialNames(v, acc);
    }
  }
}

export function extractIfcMaterialNames(item: Record<string, unknown>): string[] {
  const acc = new Set<string>();
  const assoc = item.HasAssociations;
  if (Array.isArray(assoc)) {
    for (const a of assoc) {
      collectMaterialNames(a, acc);
    }
  }

  const typed = item.IsTypedBy;
  if (Array.isArray(typed)) {
    for (const t of typed) {
      if (!isRecord(t)) {
        continue;
      }

      const typeAssoc = t.HasAssociations;
      if (Array.isArray(typeAssoc)) {
        for (const a of typeAssoc) {
          collectMaterialNames(a, acc);
        }
      }
    }
  }

  return [...acc].sort((a, b) => a.localeCompare(b));
}

function pickFirstMatchingCell(map: Map<string, QuantityCell>, patterns: RegExp[]): QuantityCell | undefined {
  for (const [key, val] of map) {
    const base = key.includes(".") ? key.split(".").pop() ?? key : key;
    for (const p of patterns) {
      if (p.test(base) || p.test(key)) {
        return val;
      }
    }
  }

  return undefined;
}

function ifcTextBag(value: string): { value: string; type: string } {
  return { value, type: "IFCTEXT" };
}

/**
 * Infiere milímetros vs metros a partir de cotas lineales típicas de elementos de edificación.
 * Si no hay suficiente señal, devuelve null (no mostrar unidad en etiqueta).
 */
export function inferLinearLabelUnit(samples: number[]): LengthLabelUnit {
  const pos = samples.filter((n) => Number.isFinite(n) && n > 0);
  if (pos.length === 0) {
    return null;
  }

  const max = Math.max(...pos);
  const min = Math.min(...pos);
  if (max >= 1000) {
    return "mm";
  }

  if (max <= 50) {
    return "m";
  }

  if (max > 50 && min < 5) {
    return "m";
  }

  if (max > 50 && min >= 5) {
    return "mm";
  }

  return null;
}

function formatLinearValue(n: number, unit: LengthLabelUnit): string {
  if (unit === "mm") {
    return String(Math.round(n));
  }

  if (unit === "m") {
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  return (Math.round(n * 100) / 100).toFixed(2);
}

function formatVolumeValue(n: number, volLabel: VolumeLabelUnit): string {
  if (volLabel === "mm³") {
    return String(Math.round(n));
  }

  if (volLabel === "m³") {
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Volumen IFC suele ir en m³ aunque las longitudes vengan en mm; mm³ da números enormes.
 */
export function inferVolumeLabelUnit(n: number, linear: LengthLabelUnit): VolumeLabelUnit {
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }

  if (n >= 1e8) {
    return "mm³";
  }

  if (linear === "mm" && n > 1_000_000) {
    return "mm³";
  }

  if (n < 1e6) {
    return "m³";
  }

  return null;
}

function medidaKey(dimLabel: string, unit: LengthLabelUnit | string | null): string {
  if (unit === null || unit === "") {
    return `Medida: ${dimLabel}`;
  }

  return `Medida: ${dimLabel} (${unit})`;
}

function volumenKey(unit: VolumeLabelUnit | string | null): string {
  if (unit === null || unit === "") {
    return "Medida: volumen";
  }

  return `Medida: volumen (${unit})`;
}

function formatLengthRawForProject(raw: number, len: IfcProjectUnits["length"]): string {
  if (!Number.isFinite(raw)) {
    return "—";
  }

  if (len.label === "mm") {
    return String(Math.round(raw));
  }

  if (len.label === "m") {
    return (Math.round(raw * 100) / 100).toFixed(2);
  }

  if (len.label === "cm" || len.label === "dm") {
    return (Math.round(raw * 100) / 100).toFixed(2);
  }

  if (len.label === "ft") {
    return (Math.round(raw * 1000) / 1000).toFixed(3);
  }

  return (Math.round(raw * 1e6) / 1e6).toFixed(6);
}

function formatVolumeRawForProject(raw: number, vol: IfcProjectUnits["volume"]): string {
  if (!Number.isFinite(raw)) {
    return "—";
  }

  if (vol.label === "mm³") {
    return String(Math.round(raw));
  }

  if (vol.label === "m³") {
    return (Math.round(raw * 100) / 100).toFixed(2);
  }

  if (vol.label === "cm³" || vol.label === "dm³") {
    return (Math.round(raw * 100) / 100).toFixed(2);
  }

  return (Math.round(raw * 1000) / 1000).toFixed(3);
}

const GEOM_NOTE = " (aprox., geometría)";

/**
 * Añade filas tipo “Medida: …” y “Material (IFC)” fusionadas al objeto del ítem
 * (mismo formato `{ value, type }` que el resto) para que el parser del panel las muestre.
 *
 * @param projectUnits Si se pasa, las cantidades IFC se interpretan en las unidades del archivo
 * (`IfcUnitAssignment`) y el fallback de geometría convierte desde metros de escena.
 */
export function mergeMeasurementMaterialOverlay(
  item: Record<string, unknown>,
  bbox: { dx: number; dy: number; dz: number; volume: number } | null,
  projectUnits: IfcProjectUnits | null = null
): Record<string, unknown> {
  const qMap = extractIfcQuantitiesMap(item);
  const materials = extractIfcMaterialNames(item);

  const heightCell = pickFirstMatchingCell(qMap, [/height/i, /altura/i, /unroundedheight/i]);
  const lengthCell = pickFirstMatchingCell(qMap, [/^netlength$/i, /^grosslength$/i, /^length$/i, /longitud/i]);
  const widthCell = pickFirstMatchingCell(qMap, [/^width$/i, /^thickness$/i, /anchura/i, /espesor/i]);
  const volumeCell = pickFirstMatchingCell(qMap, [/volume/i, /volumen/i]);

  const linearSamples = [heightCell, lengthCell, widthCell]
    .filter((c): c is QuantityCell => !!c && c.kind === "length")
    .map((c) => c.numeric);

  const linearLabelUnit = inferLinearLabelUnit(linearSamples);
  const lenTag = projectUnits?.length.label ?? null;
  const volTag = projectUnits?.volume.label ?? null;

  let d1 = 0;
  let d2 = 0;
  let d3 = 0;
  let vBox = 0;
  let hasBbox = false;
  if (bbox) {
    const dims = [bbox.dx, bbox.dy, bbox.dz].sort((a, b) => a - b);
    d1 = dims[0] ?? 0;
    d2 = dims[1] ?? 0;
    d3 = dims[2] ?? 0;
    vBox = bbox.volume;
    hasBbox = true;
  }

  const envNote = " (envolvente, ejes modelo)";
  const fmtEnvLinear = (n: number): string => `${(Math.round(n * 100) / 100).toFixed(2)}${envNote}`;
  const fmtEnvVolume = (n: number): string => `${(Math.round(n * 100) / 100).toFixed(2)}${envNote}`;

  const fmtBboxLinear = (dimMetres: number): string => {
    if (projectUnits) {
      const rawFile = dimMetres / projectUnits.length.metresPerUnit;
      return `${formatLengthRawForProject(rawFile, projectUnits.length)}${GEOM_NOTE}`;
    }

    return fmtEnvLinear(dimMetres);
  };

  const fmtBboxVolume = (volMetresCubed: number): string => {
    if (projectUnits) {
      const rawFile = volMetresCubed / projectUnits.volume.cubicMetresPerUnit;
      return `${formatVolumeRawForProject(rawFile, projectUnits.volume)}${GEOM_NOTE}`;
    }

    return fmtEnvVolume(volMetresCubed);
  };

  const altoVal =
    heightCell !== undefined && heightCell.kind === "length"
      ? projectUnits
        ? formatLengthRawForProject(heightCell.numeric, projectUnits.length)
        : formatLinearValue(heightCell.numeric, linearLabelUnit)
      : hasBbox
        ? fmtBboxLinear(d3)
        : "—";
  const largoVal =
    lengthCell !== undefined && lengthCell.kind === "length"
      ? projectUnits
        ? formatLengthRawForProject(lengthCell.numeric, projectUnits.length)
        : formatLinearValue(lengthCell.numeric, linearLabelUnit)
      : hasBbox
        ? fmtBboxLinear(d2)
        : "—";
  const anchoVal =
    widthCell !== undefined && widthCell.kind === "length"
      ? projectUnits
        ? formatLengthRawForProject(widthCell.numeric, projectUnits.length)
        : formatLinearValue(widthCell.numeric, linearLabelUnit)
      : hasBbox
        ? fmtBboxLinear(d1)
        : "—";

  let volVal = "—";
  let volKeyUnit: VolumeLabelUnit | string | null = null;
  if (volumeCell?.kind === "volume") {
    if (projectUnits) {
      volKeyUnit = projectUnits.volume.label;
      volVal = formatVolumeRawForProject(volumeCell.numeric, projectUnits.volume);
    } else {
      const inferredVol = inferVolumeLabelUnit(volumeCell.numeric, linearLabelUnit);
      volKeyUnit = inferredVol;
      volVal = formatVolumeValue(volumeCell.numeric, inferredVol);
    }
  } else if (hasBbox && hasBboxVolume(bbox!)) {
    if (projectUnits) {
      volKeyUnit = projectUnits.volume.label;
      volVal = fmtBboxVolume(vBox);
    } else {
      const inferredVol = inferVolumeLabelUnit(vBox, linearLabelUnit);
      volKeyUnit = inferredVol;
      volVal = formatVolumeValue(vBox, inferredVol);
      if (inferredVol === null) {
        volVal = fmtEnvVolume(vBox);
      }
    }
  }

  const altoKey = medidaKey("alto", projectUnits ? lenTag : heightCell?.kind === "length" ? linearLabelUnit : null);
  const largoKey = medidaKey("largo", projectUnits ? lenTag : lengthCell?.kind === "length" ? linearLabelUnit : null);
  const anchoKey = medidaKey(
    "ancho / espesor",
    projectUnits ? lenTag : widthCell?.kind === "length" ? linearLabelUnit : null
  );

  const volKey = volumenKey(
    projectUnits
      ? volTag
      : volumeCell?.kind === "volume"
        ? volKeyUnit
        : hasBbox
          ? volKeyUnit
          : null
  );

  const overlay: Record<string, unknown> = {
    [altoKey]: ifcTextBag(altoVal),
    [largoKey]: ifcTextBag(largoVal),
    [anchoKey]: ifcTextBag(anchoVal),
    [volKey]: ifcTextBag(volVal),
    "Material (IFC)": ifcTextBag(materials.length > 0 ? materials.join(", ") : "—")
  };

  return { ...item, ...overlay };
}

function hasBboxVolume(bbox: { volume: number }): boolean {
  return Number.isFinite(bbox.volume) && bbox.volume > 0;
}

export function bboxSizeAndVolume(box: THREE.Box3): { dx: number; dy: number; dz: number; volume: number } {
  const size = new THREE.Vector3();
  box.getSize(size);
  const dx = size.x;
  const dy = size.y;
  const dz = size.z;
  return { dx, dy, dz, volume: dx * dy * dz };
}

export function unionBoxes(boxes: THREE.Box3[]): THREE.Box3 | null {
  if (boxes.length === 0) {
    return null;
  }

  const first = boxes[0];
  if (!first) {
    return null;
  }

  const u = first.clone();
  for (let i = 1; i < boxes.length; i++) {
    const b = boxes[i];
    if (b) {
      u.union(b);
    }
  }

  return u;
}
