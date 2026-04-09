import type { SelectionMap } from "../entities/Selection";
import type { ClassificationGroup, SpatialTreeNode } from "../entities/Classification";
import type { ThemeMode } from "../entities/Theme";

export interface ViewerPort {
  init(container: HTMLElement): Promise<void>;
  dispose(): void;
  clearSelection(): Promise<void>;
  loadIfcBuffer(buffer: Uint8Array, modelId: string): Promise<void>;
  onSelectionChange(callback: (selection: SelectionMap) => Promise<void> | void): void;
  getFirstSelectedProperties(selection: SelectionMap): Promise<Record<string, unknown> | null>;
  buildNavigationData(): Promise<void>;
  getSpatialTree(): Promise<SpatialTreeNode[]>;
  getCategoryGroups(): Promise<ClassificationGroup[]>;
  isolateClassificationGroup(classification: "storeys" | "categories", groupKey: string): Promise<void>;
  hideClassificationGroup(classification: "storeys" | "categories", groupKey: string): Promise<void>;
  showClassificationGroup(classification: "storeys" | "categories", groupKey: string): Promise<void>;
  showAll(): Promise<void>;
  setTheme(mode: ThemeMode): void;
}
