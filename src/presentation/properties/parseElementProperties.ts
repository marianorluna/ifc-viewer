/** Fila lista para mostrar en la tabla de propiedades del elemento IFC. */
export type ElementPropertyRow = {
  key: string;
  displayKey: string;
  value: string;
  type?: string;
};

function isIfcPropertyBag(x: unknown): x is { value: unknown; type?: unknown } {
  if (x === null || typeof x !== "object") {
    return false;
  }

  const keys = Object.keys(x as object);
  if (keys.length === 0 || !keys.includes("value")) {
    return false;
  }

  return keys.every((k) => k === "value" || k === "type");
}

const KEY_LABELS_ES: Readonly<Record<string, string>> = {
  _category: "Categoría IFC",
  _localId: "ID local",
  _guid: "GUID",
  Name: "Nombre",
  ObjectType: "Tipo de objeto",
  Tag: "Etiqueta",
  Description: "Descripción",
  GlobalId: "GlobalId",
  ShapeType: "Tipo de forma"
};

function displayKeyFor(originalKey: string): string {
  return KEY_LABELS_ES[originalKey] ?? originalKey.replace(/^_/, "");
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value.trim() === "" ? "—" : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return JSON.stringify(value);
}

function formatDeepValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value !== "object") {
    return formatPrimitive(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "—";
    }

    return value.map((item) => formatDeepValue(item)).join(", ");
  }

  if (isIfcPropertyBag(value)) {
    return formatDeepValue(value.value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function typeLabel(type: unknown): string | undefined {
  if (type === null || type === undefined || type === "") {
    return undefined;
  }

  return String(type);
}

const KEY_SORT_ORDER = (k: string): number => {
  if (k === "_category") {
    return 0;
  }

  if (k === "_localId") {
    return 1;
  }

  if (k === "_guid") {
    return 2;
  }

  if (k === "Name") {
    return 3;
  }

  if (k.startsWith("Medida: alto")) {
    return 4;
  }

  if (k.startsWith("Medida: largo")) {
    return 5;
  }

  if (k.startsWith("Medida: ancho")) {
    return 6;
  }

  if (k.startsWith("Medida: volumen")) {
    return 7;
  }

  if (k === "Material (IFC)") {
    return 8;
  }

  return 100;
};

/**
 * Convierte el objeto devuelto por Fragments/ThatOpen en filas legibles.
 * Acepta el patrón `{ value, type? }` y hace fallback seguro para el resto.
 */
export function parseElementProperties(raw: Record<string, unknown> | null): ElementPropertyRow[] {
  if (!raw) {
    return [];
  }

  const entries = Object.entries(raw).sort(([a], [b]) => {
    const da = KEY_SORT_ORDER(a);
    const db = KEY_SORT_ORDER(b);
    if (da !== db) {
      return da - db;
    }

    return a.localeCompare(b);
  });

  const rows: ElementPropertyRow[] = [];

  for (const [originalKey, cell] of entries) {
    if (isIfcPropertyBag(cell)) {
      const row: ElementPropertyRow = {
        key: originalKey,
        displayKey: displayKeyFor(originalKey),
        value: formatDeepValue(cell.value)
      };
      const type = typeLabel(cell.type);
      if (type !== undefined) {
        row.type = type;
      }

      rows.push(row);
      continue;
    }

    rows.push({
      key: originalKey,
      displayKey: displayKeyFor(originalKey),
      value: formatDeepValue(cell)
    });
  }

  return rows;
}
