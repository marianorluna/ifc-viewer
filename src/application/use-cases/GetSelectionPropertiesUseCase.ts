import type { SelectionMap } from "../../domain/entities/Selection";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class GetSelectionPropertiesUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  async execute(selection: SelectionMap): Promise<Record<string, unknown> | null> {
    return this.viewer.getFirstSelectedProperties(selection);
  }
}
