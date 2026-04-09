import type { SelectionMap } from "../entities/Selection";

export interface ViewerPort {
  init(container: HTMLElement): Promise<void>;
  dispose(): void;
  clearSelection(): Promise<void>;
  loadIfcBuffer(buffer: Uint8Array, modelId: string): Promise<void>;
  onSelectionChange(callback: (selection: SelectionMap) => Promise<void> | void): void;
  getFirstSelectedProperties(selection: SelectionMap): Promise<Record<string, unknown> | null>;
}
