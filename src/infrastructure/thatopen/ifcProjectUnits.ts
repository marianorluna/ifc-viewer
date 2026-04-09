import { IfcAPI, IFCUNITASSIGNMENT, LogLevel } from "web-ifc";

/**
 * Unidades de proyecto IFC (`IfcUnitAssignment`) para formatear cantidades
 * en la misma escala que el archivo (no heurística por magnitud).
 */
export type IfcProjectUnits = {
  length: {
    /** Metros equivalentes a 1 unidad de longitud del modelo (p. ej. mm → 0,001). */
    metresPerUnit: number;
    /** Etiqueta corta para UI: mm, m, cm, ft. */
    label: string;
  };
  volume: {
    /** Metros cúbicos equivalentes a 1 unidad de volumen del modelo. */
    cubicMetresPerUnit: number;
    label: string;
  };
};

function siPrefixToLinearMetreFactor(prefix: string | undefined): number {
  if (prefix === undefined || prefix === null || prefix === "") {
    return 1;
  }

  const p = String(prefix).toUpperCase();
  if (p === "MILLI") {
    return 1e-3;
  }

  if (p === "CENTI") {
    return 1e-2;
  }

  if (p === "DECI") {
    return 1e-1;
  }

  if (p === "KILO") {
    return 1e3;
  }

  if (p === "DECA") {
    return 10;
  }

  if (p === "HECTO") {
    return 100;
  }

  return 1;
}

function lengthLabelFromMetresPerUnit(metresPerUnit: number): string {
  const pairs: [number, string][] = [
    [1, "m"],
    [0.001, "mm"],
    [0.01, "cm"],
    [0.1, "dm"],
    [0.3048, "ft"]
  ];

  for (const [v, label] of pairs) {
    if (Math.abs(metresPerUnit - v) <= 1e-12 * Math.max(1, Math.abs(v))) {
      return label;
    }
  }

  return "m";
}

function volumeLabelFromCubicMetresPerUnit(f: number): string {
  const ft3 = 0.3048 ** 3;
  const pairs: [number, string][] = [
    [1, "m³"],
    [1e-9, "mm³"],
    [1e-6, "cm³"],
    [1e-3, "dm³"],
    [ft3, "ft³"]
  ];

  for (const [v, label] of pairs) {
    if (Math.abs(f - v) <= 1e-18 + 1e-12 * Math.abs(v)) {
      return label;
    }
  }

  return "m³";
}

function readLengthFromSiUnit(line: Record<string, unknown>): { metresPerUnit: number; label: string } | null {
  const unitType = (line.UnitType as { value?: string } | undefined)?.value;
  if (unitType !== "LENGTHUNIT") {
    return null;
  }

  const name = (line.Name as { value?: string } | undefined)?.value;
  const prefixVal = (line.Prefix as { value?: string } | undefined)?.value;
  const pf = siPrefixToLinearMetreFactor(prefixVal);

  if (name === "METRE") {
    const metresPerUnit = pf;
    return { metresPerUnit, label: lengthLabelFromMetresPerUnit(metresPerUnit) };
  }

  if (name === "FOOT") {
    const metresPerUnit = 0.3048 * pf;
    return { metresPerUnit, label: lengthLabelFromMetresPerUnit(metresPerUnit) };
  }

  return null;
}

function readVolumeFromSiUnit(line: Record<string, unknown>): { cubicMetresPerUnit: number; label: string } | null {
  const unitType = (line.UnitType as { value?: string } | undefined)?.value;
  if (unitType !== "VOLUMEUNIT") {
    return null;
  }

  const name = (line.Name as { value?: string } | undefined)?.value;
  const prefixVal = (line.Prefix as { value?: string } | undefined)?.value;
  const pf = siPrefixToLinearMetreFactor(prefixVal);

  if (name === "CUBIC_METRE") {
    const edgeMetres = pf;
    const cubicMetresPerUnit = edgeMetres ** 3;
    return { cubicMetresPerUnit, label: volumeLabelFromCubicMetresDerived(edgeMetres, cubicMetresPerUnit) };
  }

  if (name === "CUBIC_FOOT") {
    const edge = 0.3048 * pf;
    const cubicMetresPerUnit = edge ** 3;
    return { cubicMetresPerUnit, label: "ft³" };
  }

  return null;
}

function volumeLabelFromCubicMetresDerived(edgeMetres: number, cubicMetresPerUnit: number): string {
  if (Math.abs(edgeMetres - 1) < 1e-12) {
    return "m³";
  }

  if (Math.abs(edgeMetres - 0.001) < 1e-15) {
    return "mm³";
  }

  if (Math.abs(edgeMetres - 0.01) < 1e-15) {
    return "cm³";
  }

  return volumeLabelFromCubicMetresPerUnit(cubicMetresPerUnit);
}

function defaultVolumeFromLength(length: IfcProjectUnits["length"]): IfcProjectUnits["volume"] {
  const cubicMetresPerUnit = length.metresPerUnit ** 3;
  const label =
    length.label === "m"
      ? "m³"
      : length.label === "mm"
        ? "mm³"
        : length.label === "cm"
          ? "cm³"
          : `${length.label}³`;

  return { cubicMetresPerUnit, label };
}

/** Interpreta `IfcUnitAssignment` del modelo abierto en web-ifc. */
export function readIfcProjectUnitsFromApi(api: IfcAPI, modelID: number): IfcProjectUnits {
  let length: IfcProjectUnits["length"] | null = null;
  let volume: IfcProjectUnits["volume"] | null = null;

  const ids = api.GetLineIDsWithType(modelID, IFCUNITASSIGNMENT);
  for (let i = 0; i < ids.size(); i++) {
    const row = api.GetLine(modelID, ids.get(i)) as Record<string, unknown> | null;
    const unitsRaw = row?.Units;
    const unitRefs = Array.isArray(unitsRaw) ? unitsRaw : [];
    for (const ref of unitRefs) {
      const expressId =
        typeof ref === "object" && ref !== null && "value" in ref
          ? (ref as { value: number }).value
          : (ref as number);
      if (typeof expressId !== "number") {
        continue;
      }

      const unitLine = api.GetLine(modelID, expressId) as Record<string, unknown>;
      if (!length) {
        const len = readLengthFromSiUnit(unitLine);
        if (len) {
          length = len;
        }
      }

      if (!volume) {
        const vol = readVolumeFromSiUnit(unitLine);
        if (vol) {
          volume = vol;
        }
      }
    }
  }

  if (!length) {
    length = { metresPerUnit: 1, label: "m" };
  }

  if (!volume) {
    volume = defaultVolumeFromLength(length);
  }

  return { length, volume };
}

export type IfcWasmConfig = {
  path: string;
  absolute: boolean;
};

/**
 * Abre el buffer IFC en web-ifc, lee unidades de proyecto y cierra el modelo.
 * Pensado para llamarse con el mismo buffer y WASM que `IfcLoader.setup`.
 */
export async function loadIfcProjectUnitsFromBuffer(
  buffer: Uint8Array,
  wasm: IfcWasmConfig
): Promise<IfcProjectUnits> {
  const api = new IfcAPI();
  api.SetWasmPath(wasm.path, wasm.absolute);
  await api.Init();
  api.SetLogLevel(LogLevel.LOG_LEVEL_OFF);
  let modelID: number | undefined;
  try {
    modelID = api.OpenModel(buffer);
    return readIfcProjectUnitsFromApi(api, modelID);
  } finally {
    if (modelID !== undefined) {
      api.CloseModel(modelID);
    }
  }
}
