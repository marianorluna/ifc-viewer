import type { SelectionMap } from "../../domain/entities/Selection";
import type { ViewerPort } from "../../domain/ports/ViewerPort";
import { ClearSelectionUseCase } from "../use-cases/ClearSelectionUseCase";
import { GetSelectionPropertiesUseCase } from "../use-cases/GetSelectionPropertiesUseCase";
import { LoadModelUseCase } from "../use-cases/LoadModelUseCase";

export class ViewerFacade {
  private readonly loadModelUseCase: LoadModelUseCase;
  private readonly clearSelectionUseCase: ClearSelectionUseCase;
  private readonly getSelectionPropertiesUseCase: GetSelectionPropertiesUseCase;

  constructor(private readonly viewer: ViewerPort) {
    this.loadModelUseCase = new LoadModelUseCase(viewer);
    this.clearSelectionUseCase = new ClearSelectionUseCase(viewer);
    this.getSelectionPropertiesUseCase = new GetSelectionPropertiesUseCase(viewer);
  }

  async init(container: HTMLElement): Promise<void> {
    await this.viewer.init(container);
  }

  async loadIfc(file: File): Promise<void> {
    await this.loadModelUseCase.execute(file);
  }

  async clearSelection(): Promise<void> {
    await this.clearSelectionUseCase.execute();
  }

  onSelectionChange(
    callback: (selection: SelectionMap, properties: Record<string, unknown> | null) => Promise<void> | void
  ): void {
    this.viewer.onSelectionChange(async (selection) => {
      const properties = await this.getSelectionPropertiesUseCase.execute(selection);
      await callback(selection, properties);
    });
  }

  dispose(): void {
    this.viewer.dispose();
  }
}
