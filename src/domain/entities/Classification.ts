export type ClassificationKey = "storeys" | "categories";

export interface ClassificationGroup {
  key: string;
  label: string;
  itemCount: number;
}

export interface SpatialTreeNode {
  id: string;
  label: string;
  count: number;
}
