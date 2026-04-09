import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class LoadModelUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  async execute(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const modelId = this.buildModelId(file.name);
    await this.viewer.loadIfcBuffer(new Uint8Array(arrayBuffer), modelId);
  }

  private buildModelId(fileName: string): string {
    const safeName = fileName.replace(/\W+/g, "-").toLowerCase();
    return `model-${safeName}-${Date.now()}`;
  }
}
