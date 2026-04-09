import type { ClassificationGroup, ClassificationKey, SpatialTreeNode } from "../../domain/entities/Classification";
import type { SelectionMap } from "../../domain/entities/Selection";
import type { ThemeMode } from "../../domain/entities/Theme";
import type { ViewerPort } from "../../domain/ports/ViewerPort";
import { BuildNavigationDataUseCase } from "../use-cases/BuildNavigationDataUseCase";
import { ClearSelectionUseCase } from "../use-cases/ClearSelectionUseCase";
import { GetCategoryGroupsUseCase } from "../use-cases/GetCategoryGroupsUseCase";
import { GetSelectionPropertiesUseCase } from "../use-cases/GetSelectionPropertiesUseCase";
import { GetSpatialTreeUseCase } from "../use-cases/GetSpatialTreeUseCase";
import { HideClassificationGroupUseCase } from "../use-cases/HideClassificationGroupUseCase";
import { IsolateClassificationGroupUseCase } from "../use-cases/IsolateClassificationGroupUseCase";
import { LoadModelUseCase } from "../use-cases/LoadModelUseCase";
import { ShowAllUseCase } from "../use-cases/ShowAllUseCase";
import { SetThemeUseCase } from "../use-cases/SetThemeUseCase";

export class ViewerFacade {
  private readonly loadModelUseCase: LoadModelUseCase;
  private readonly clearSelectionUseCase: ClearSelectionUseCase;
  private readonly getSelectionPropertiesUseCase: GetSelectionPropertiesUseCase;
  private readonly buildNavigationDataUseCase: BuildNavigationDataUseCase;
  private readonly getSpatialTreeUseCase: GetSpatialTreeUseCase;
  private readonly getCategoryGroupsUseCase: GetCategoryGroupsUseCase;
  private readonly isolateClassificationGroupUseCase: IsolateClassificationGroupUseCase;
  private readonly hideClassificationGroupUseCase: HideClassificationGroupUseCase;
  private readonly showAllUseCase: ShowAllUseCase;
  private readonly setThemeUseCase: SetThemeUseCase;

  constructor(private readonly viewer: ViewerPort) {
    this.loadModelUseCase = new LoadModelUseCase(viewer);
    this.clearSelectionUseCase = new ClearSelectionUseCase(viewer);
    this.getSelectionPropertiesUseCase = new GetSelectionPropertiesUseCase(viewer);
    this.buildNavigationDataUseCase = new BuildNavigationDataUseCase(viewer);
    this.getSpatialTreeUseCase = new GetSpatialTreeUseCase(viewer);
    this.getCategoryGroupsUseCase = new GetCategoryGroupsUseCase(viewer);
    this.isolateClassificationGroupUseCase = new IsolateClassificationGroupUseCase(viewer);
    this.hideClassificationGroupUseCase = new HideClassificationGroupUseCase(viewer);
    this.showAllUseCase = new ShowAllUseCase(viewer);
    this.setThemeUseCase = new SetThemeUseCase(viewer);
  }

  async init(container: HTMLElement): Promise<void> {
    await this.viewer.init(container);
  }

  async loadIfc(file: File): Promise<void> {
    await this.loadModelUseCase.execute(file);
    await this.buildNavigationDataUseCase.execute();
  }

  async clearSelection(): Promise<void> {
    await this.clearSelectionUseCase.execute();
  }

  async getSpatialTree(): Promise<SpatialTreeNode[]> {
    return this.getSpatialTreeUseCase.execute();
  }

  async getCategoryGroups(): Promise<ClassificationGroup[]> {
    return this.getCategoryGroupsUseCase.execute();
  }

  async isolateGroup(classification: ClassificationKey, groupKey: string): Promise<void> {
    await this.isolateClassificationGroupUseCase.execute(classification, groupKey);
  }

  async hideGroup(classification: ClassificationKey, groupKey: string): Promise<void> {
    await this.hideClassificationGroupUseCase.execute(classification, groupKey);
  }

  async showGroup(classification: ClassificationKey, groupKey: string): Promise<void> {
    await this.viewer.showClassificationGroup(classification, groupKey);
  }

  async showAll(): Promise<void> {
    await this.showAllUseCase.execute();
  }

  setTheme(mode: ThemeMode): void {
    this.setThemeUseCase.execute(mode);
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
