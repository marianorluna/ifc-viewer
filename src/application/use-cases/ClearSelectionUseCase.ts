import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class ClearSelectionUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  async execute(): Promise<void> {
    await this.viewer.clearSelection();
  }
}
