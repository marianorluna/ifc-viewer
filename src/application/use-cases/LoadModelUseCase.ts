import { IFC_ABSOLUTE_MAX_BYTES } from "../../domain/constants/ifcLoadLimits";
import { IfcFileExceedsAbsoluteLimitError } from "../../domain/errors/IfcLoadErrors";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class LoadModelUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  async execute(file: File): Promise<string> {
    if (file.size > IFC_ABSOLUTE_MAX_BYTES) {
      throw new IfcFileExceedsAbsoluteLimitError(IFC_ABSOLUTE_MAX_BYTES);
    }

    const modelId = this.buildModelId(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      await this.viewer.loadIfcBuffer(new Uint8Array(arrayBuffer), modelId);
      return modelId;
    } catch (error) {
      await this.viewer.disposeModelIfPresent(modelId);
      throw error;
    }
  }

  private buildModelId(fileName: string): string {
    const safeName = fileName.replace(/\W+/g, "-").toLowerCase();
    return `model-${safeName}-${Date.now()}`;
  }
}
