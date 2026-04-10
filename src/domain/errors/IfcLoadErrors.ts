import { formatIfcSizeForUi, IFC_ABSOLUTE_MAX_BYTES } from "../constants/ifcLoadLimits";

export class IfcFileExceedsAbsoluteLimitError extends Error {
  readonly limitBytes: number;

  constructor(limitBytes: number = IFC_ABSOLUTE_MAX_BYTES) {
    super(`IFC_FILE_EXCEEDS_ABSOLUTE_LIMIT:${limitBytes}`);
    this.name = "IfcFileExceedsAbsoluteLimitError";
    this.limitBytes = limitBytes;
  }

  userMessage(): string {
    return `Este archivo supera el tamaño máximo permitido (${formatIfcSizeForUi(this.limitBytes)}). El navegador puede quedarse sin memoria. Reduce el modelo o divídelo antes de cargarlo.`;
  }
}
