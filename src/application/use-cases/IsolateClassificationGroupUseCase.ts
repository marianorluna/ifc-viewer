import type { ClassificationKey } from "../../domain/entities/Classification";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class IsolateClassificationGroupUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  async execute(classification: ClassificationKey, groupKey: string): Promise<void> {
    await this.viewer.isolateClassificationGroup(classification, groupKey);
  }
}
