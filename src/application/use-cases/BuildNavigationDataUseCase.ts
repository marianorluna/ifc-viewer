import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class BuildNavigationDataUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  async execute(): Promise<void> {
    await this.viewer.buildNavigationData();
  }
}
