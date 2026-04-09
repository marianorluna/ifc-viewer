import type { ClassificationGroup } from "../../domain/entities/Classification";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class GetCategoryGroupsUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  async execute(): Promise<ClassificationGroup[]> {
    return this.viewer.getCategoryGroups();
  }
}
