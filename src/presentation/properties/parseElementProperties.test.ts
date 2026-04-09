import assert from "node:assert/strict";
import test from "node:test";
import {
  omitIfcGraphKeysForPropertiesPanel,
  parseElementProperties
} from "./parseElementProperties";

test("parseElementProperties extrae value/type al estilo IFC", () => {
  const rows = parseElementProperties({
    _category: { value: "IFCROOF" },
    Name: { value: "Roof A", type: "IFCLABEL" },
    _localId: { value: 42 }
  });

  assert.equal(rows[0]?.key, "_category");
  assert.equal(rows[0]?.value, "IFCROOF");
  assert.equal(rows[1]?.key, "_localId");
  assert.equal(rows[1]?.value, "42");
  assert.equal(rows[2]?.key, "Name");
  assert.equal(rows[2]?.value, "Roof A");
  assert.equal(rows[2]?.type, "IFCLABEL");
});

test("parseElementProperties hace fallback en valores planos", () => {
  const rows = parseElementProperties({
    custom: "texto",
    nulo: null
  });

  const custom = rows.find((r) => r.key === "custom");
  assert.equal(custom?.value, "texto");
  const nulo = rows.find((r) => r.key === "nulo");
  assert.equal(nulo?.value, "—");
});

test("parseElementProperties anida bolsas IFC", () => {
  const rows = parseElementProperties({
    Nested: { value: { value: "inner", type: "IFCTEXT" } }
  });

  assert.equal(rows[0]?.value, "inner");
});

test("parseElementProperties oculta relaciones IFC en tabla", () => {
  const rows = parseElementProperties({
    Name: { value: "Muro", type: "IFCLABEL" },
    IsDefinedBy: [{ _category: { value: "IFCELEMENTQUANTITY" } }],
    HasAssociations: [{ _category: { value: "IFCMATERIALLAYERSETUSAGE" } }]
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.key, "Name");
});

test("omitIfcGraphKeysForPropertiesPanel elimina las mismas claves que la tabla", () => {
  const raw = {
    Name: { value: "Muro" },
    IsDefinedBy: [{ big: "tree" }],
    _localId: { value: 1 }
  };
  const vis = omitIfcGraphKeysForPropertiesPanel(raw);
  assert.deepEqual(Object.keys(vis ?? {}), ["Name", "_localId"]);
  assert.equal(JSON.stringify(vis), JSON.stringify({ Name: raw.Name, _localId: raw._localId }));
});
