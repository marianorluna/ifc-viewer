import type { SpatialTreeNode } from "../../domain/entities/Classification";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class GetSpatialTreeUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  async execute(): Promise<SpatialTreeNode[]> {
    return this.viewer.getSpatialTree();
  }
}
