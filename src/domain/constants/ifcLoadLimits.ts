/** Tamaño recomendado para carga en navegador sin advertencia (100 MiB). */
export const IFC_RECOMMENDED_MAX_BYTES = 100 * 1024 * 1024;

/**
 * Tope duro: por encima no se intenta cargar (riesgo de límites del navegador y memoria).
 * 1 GiB; el buffer se duplica en adaptador durante la carga.
 */
export const IFC_ABSOLUTE_MAX_BYTES = 1024 * 1024 * 1024;

export function formatIfcSizeForUi(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
