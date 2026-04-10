import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import type { ClassificationGroup, ClassificationKey, SpatialTreeNode } from "../../domain/entities/Classification";
import type { SelectionMap } from "../../domain/entities/Selection";
import type { ThemeMode } from "../../domain/entities/Theme";
import type { CameraProjectionMode } from "../../domain/entities/CameraProjection";
import type { CameraViewPreset } from "../../domain/entities/CameraView";
import type { ViewerPort } from "../../domain/ports/ViewerPort";
import type { VisualizationStyle } from "../../domain/entities/VisualizationStyle";
import {
  bboxSizeAndVolume,
  IFC_ITEM_RELATIONS_CONFIG,
  mergeMeasurementMaterialOverlay,
  unionBoxes
} from "./ifcItemEnrichment";
import { loadIfcProjectUnitsFromBuffer, type IfcProjectUnits } from "./ifcProjectUnits";

interface MaterialSnapshot {
  transparent: boolean;
  opacity: number;
  color: number | undefined;
  lodColor: number | undefined;
}

type MaterialLike = THREE.Material & {
  color?: THREE.Color;
  lodColor?: THREE.Color;
};

export class ThatOpenViewerAdapter implements ViewerPort {
  private static readonly STOREYS_CLASSIFICATION = "NavigationStoreys";
  private static readonly CATEGORIES_CLASSIFICATION = "NavigationCategories";
  private static readonly WEB_IFC_VERSION = "0.0.77";

  private readonly components = new OBC.Components();
  private world?: OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>;
  private grid?: OBC.SimpleGrid;
  private highlighter?: OBF.Highlighter;
  private selectionCallback?: (selection: SelectionMap) => Promise<void> | void;
  private isIfcLoaderReady = false;
  private readonly ifcSourceByModelId = new Map<string, Uint8Array>();
  private readonly projectUnitsByModelId = new Map<string, IfcProjectUnits>();
  private currentVisualizationStyle: VisualizationStyle = "original";
  private readonly materialSnapshots = new Map<THREE.Material, MaterialSnapshot>();

  async init(container: HTMLElement): Promise<void> {
    const worlds = this.components.get(OBC.Worlds);
    const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>();

    world.scene = new OBC.SimpleScene(this.components);
    world.renderer = new OBC.SimpleRenderer(this.components, container);
    world.camera = new OBC.OrthoPerspectiveCamera(this.components);

    this.components.init();
    world.scene.setup();
    world.scene.three.background = new THREE.Color("#f6f7f8");
    await world.camera.controls.setLookAt(12, 8, 12, 0, 0, 0);

    const grid = this.components.get(OBC.Grids).create(world);
    this.grid = grid;
    /* `setTheme` usa `this.world`; debe asignarse antes del tema inicial y del fetch largo del worker. */
    this.world = world;
    world.camera.projection.onChanged.add(() => {
      this.applyActiveCameraToFragmentModels();
    });
    this.setTheme("light");

    const fragments = this.components.get(OBC.FragmentsManager);
    const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
    const workerBlob = await (await fetch(workerUrl)).blob();
    const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
    fragments.init(URL.createObjectURL(workerFile));

    world.camera.controls.addEventListener("update", () => {
      fragments.core.update(false);
    });

    fragments.list.onItemSet.add(({ value: model }) => {
      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      fragments.core.update(true);
    });
    this.applyActiveCameraToFragmentModels();

    this.components.get(OBC.Raycasters).get(world);
    const highlighter = this.components.get(OBF.Highlighter);
    highlighter.setup({
      world,
      selectMaterialDefinition: {
        color: new THREE.Color("#9AFF00"),
        opacity: 1,
        transparent: false,
        renderedFaces: 0
      }
    });

    highlighter.events.select?.onHighlight.add(async (selection) => {
      if (!this.selectionCallback) {
        return;
      }

      await this.selectionCallback(selection as SelectionMap);
    });

    this.highlighter = highlighter;
  }

  dispose(): void {
    this.components.dispose();
  }

  hasIfcModels(): boolean {
    const fragments = this.components.get(OBC.FragmentsManager);
    return fragments.list.size > 0;
  }

  onSelectionChange(callback: (selection: SelectionMap) => Promise<void> | void): void {
    this.selectionCallback = callback;
  }

  async clearSelection(): Promise<void> {
    this.highlighter?.clear();
  }

  async loadIfcBuffer(buffer: Uint8Array, modelId: string): Promise<void> {
    const ifcLoader = this.components.get(OBC.IfcLoader);
    if (!this.isIfcLoaderReady) {
      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: {
          path: `https://unpkg.com/web-ifc@${ThatOpenViewerAdapter.WEB_IFC_VERSION}/`,
          absolute: true
        }
      });
      this.isIfcLoaderReady = true;
    }
    this.ifcSourceByModelId.set(modelId, Uint8Array.from(buffer));
    this.projectUnitsByModelId.delete(modelId);
    await ifcLoader.load(buffer, false, modelId);

    if (this.currentVisualizationStyle !== "original") {
      const fragments = this.components.get(OBC.FragmentsManager);
      const materials = [...fragments.core.models.materials.list.values()] as THREE.Material[];
      this.snapshotMaterials(materials);
      this.applyStyleToMaterials(this.currentVisualizationStyle, materials);
      fragments.core.update(true);
    }
  }

  async disposeModelIfPresent(modelId: string): Promise<void> {
    this.ifcSourceByModelId.delete(modelId);
    this.projectUnitsByModelId.delete(modelId);

    try {
      const fragments = this.components.get(OBC.FragmentsManager);
      if (fragments.list.has(modelId)) {
        await fragments.core.disposeModel(modelId);
      }
    } finally {
      if (this.highlighter) {
        await this.highlighter.clear();
      }
      const hider = this.components.get(OBC.Hider);
      await hider.set(true);
    }
  }

  async disposeAllIfcModels(): Promise<void> {
    const fragments = this.components.get(OBC.FragmentsManager);
    const modelIds = [...fragments.list.keys()];
    for (const modelId of modelIds) {
      this.ifcSourceByModelId.delete(modelId);
      this.projectUnitsByModelId.delete(modelId);
      if (fragments.list.has(modelId)) {
        await fragments.core.disposeModel(modelId);
      }
    }

    this.materialSnapshots.clear();

    if (this.highlighter) {
      await this.highlighter.clear();
    }
    const hider = this.components.get(OBC.Hider);
    await hider.set(true);
  }

  private getWebIfcWasmConfig(): { path: string; absolute: boolean } {
    return {
      path: `https://unpkg.com/web-ifc@${ThatOpenViewerAdapter.WEB_IFC_VERSION}/`,
      absolute: true
    };
  }

  private async resolveProjectUnits(modelId: string): Promise<IfcProjectUnits | null> {
    const cached = this.projectUnitsByModelId.get(modelId);
    if (cached) {
      return cached;
    }

    const bytes = this.ifcSourceByModelId.get(modelId);
    if (!bytes) {
      return null;
    }

    try {
      const units = await loadIfcProjectUnitsFromBuffer(bytes, this.getWebIfcWasmConfig());
      this.projectUnitsByModelId.set(modelId, units);
      return units;
    } catch {
      return null;
    }
  }

  async getFirstSelectedProperties(selection: SelectionMap): Promise<Record<string, unknown> | null> {
    const modelEntry = Object.entries(selection)[0];
    if (!modelEntry) {
      return null;
    }

    const [modelId, localIds] = modelEntry;
    const firstLocalId = [...localIds][0];
    if (firstLocalId === undefined) {
      return null;
    }

    const fragments = this.components.get(OBC.FragmentsManager);
    const model = fragments.list.get(modelId);
    if (!model) {
      return null;
    }

    const items = await model.getItemsData([firstLocalId], IFC_ITEM_RELATIONS_CONFIG);
    const firstItem = items[0];
    if (!firstItem) {
      return null;
    }

    const rawItem = firstItem as Record<string, unknown>;
    const boxes = await model.getBoxes([firstLocalId]);
    const mergedBox = unionBoxes(boxes);
    const dims = mergedBox ? bboxSizeAndVolume(mergedBox) : null;
    const projectUnits = await this.resolveProjectUnits(modelId);

    return mergeMeasurementMaterialOverlay(rawItem, dims, projectUnits);
  }

  async buildNavigationData(): Promise<void> {
    const classifier = this.components.get(OBC.Classifier);
    await classifier.byIfcBuildingStorey({
      classificationName: ThatOpenViewerAdapter.STOREYS_CLASSIFICATION
    });
    await classifier.byCategory({
      classificationName: ThatOpenViewerAdapter.CATEGORIES_CLASSIFICATION
    });
  }

  async getSpatialTree(): Promise<SpatialTreeNode[]> {
    const groups = await this.getGroups("storeys");
    return groups.map((group) => ({
      id: group.key,
      label: group.label,
      count: group.itemCount
    }));
  }

  async getCategoryGroups(): Promise<ClassificationGroup[]> {
    return this.getGroups("categories");
  }

  async isolateClassificationGroup(classification: ClassificationKey, groupKey: string): Promise<void> {
    const hider = this.components.get(OBC.Hider);
    const modelIdMap = await this.getGroupModelIdMap(classification, groupKey);
    if (!modelIdMap) {
      return;
    }
    await hider.isolate(modelIdMap);
  }

  async hideClassificationGroup(classification: ClassificationKey, groupKey: string): Promise<void> {
    const hider = this.components.get(OBC.Hider);
    const modelIdMap = await this.getGroupModelIdMap(classification, groupKey);
    if (!modelIdMap) {
      return;
    }
    await hider.set(false, modelIdMap);
  }

  async showClassificationGroup(classification: ClassificationKey, groupKey: string): Promise<void> {
    const hider = this.components.get(OBC.Hider);
    const modelIdMap = await this.getGroupModelIdMap(classification, groupKey);
    if (!modelIdMap) {
      return;
    }
    await hider.set(true, modelIdMap);
  }

  async showAll(): Promise<void> {
    const hider = this.components.get(OBC.Hider);
    await hider.set(true);
  }

  async setCameraView(preset: CameraViewPreset): Promise<void> {
    if (!this.world) return;
    const controls = this.world.camera.controls;

    switch (preset) {
      case "top":
        await controls.setLookAt(0, 25, 0.01, 0, 0, 0, true);
        break;
      case "front":
        await controls.setLookAt(0, 5, 25, 0, 5, 0, true);
        break;
      case "right":
        await controls.setLookAt(25, 5, 0, 0, 5, 0, true);
        break;
      case "isometric":
        await controls.setLookAt(12, 8, 12, 0, 0, 0, true);
        break;
      case "fit": {
        const fragments = this.components.get(OBC.FragmentsManager);
        const box = new THREE.Box3();
        for (const [, model] of fragments.list) {
          box.expandByObject(model.object);
        }
        if (!box.isEmpty()) {
          await controls.fitToBox(box, true);
        } else {
          await controls.setLookAt(12, 8, 12, 0, 0, 0, true);
        }
        break;
      }
    }
  }

  setGridVisible(visible: boolean): void {
    const grid = this.grid;
    if (!grid) {
      return;
    }

    grid.visible = visible;
  }

  async toggleCameraProjection(): Promise<void> {
    const world = this.world;
    if (!world) {
      return;
    }

    await world.camera.projection.toggle();
  }

  getCameraProjection(): CameraProjectionMode {
    const world = this.world;
    if (!world) {
      return "Perspective";
    }

    return world.camera.projection.current;
  }

  setTheme(mode: ThemeMode): void {
    const world = this.world;
    if (!world) {
      return;
    }

    const palette =
      mode === "light"
        ? {
            sceneBg: "#f6f7f8",
            gridColor: "#c8ced6"
          }
        : {
            sceneBg: "#0f172a",
            gridColor: "#e2e8f0"
          };

    world.scene.three.background = new THREE.Color(palette.sceneBg);
    if (this.grid?.material.uniforms.uColor) {
      this.grid.material.uniforms.uColor.value = new THREE.Color(palette.gridColor);
    }
  }

  private applyActiveCameraToFragmentModels(): void {
    const world = this.world;
    if (!world) {
      return;
    }

    const threeCamera = world.camera.three;
    const fragments = this.components.get(OBC.FragmentsManager);
    for (const [, model] of fragments.list) {
      model.useCamera(threeCamera);
    }
  }

  private getClassificationName(classification: ClassificationKey): string {
    return classification === "storeys"
      ? ThatOpenViewerAdapter.STOREYS_CLASSIFICATION
      : ThatOpenViewerAdapter.CATEGORIES_CLASSIFICATION;
  }

  private async getGroups(classification: ClassificationKey): Promise<ClassificationGroup[]> {
    const fragments = this.components.get(OBC.FragmentsManager);
    const classifier = this.components.get(OBC.Classifier);
    const classificationName = this.getClassificationName(classification);
    const groups = classifier.list.get(classificationName);
    if (!groups) {
      return [];
    }

    const result: ClassificationGroup[] = [];
    for (const [groupName, groupData] of groups) {
      const modelIdMap = await groupData.get();
      let itemCount = 0;
      for (const [modelId, ids] of Object.entries(modelIdMap)) {
        if (fragments.list.has(modelId)) {
          itemCount += ids.size;
        }
      }
      if (itemCount === 0) {
        continue;
      }
      result.push({
        key: groupName,
        label: groupName,
        itemCount
      });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }

  private async getGroupModelIdMap(
    classification: ClassificationKey,
    groupKey: string
  ): Promise<OBC.ModelIdMap | null> {
    const classifier = this.components.get(OBC.Classifier);
    const classificationName = this.getClassificationName(classification);
    const groups = classifier.list.get(classificationName);
    const group = groups?.get(groupKey);
    if (!group) {
      return null;
    }
    return group.get();
  }

  setVisualizationStyle(style: VisualizationStyle): void {
    const fragments = this.components.get(OBC.FragmentsManager);
    const materials = [...fragments.core.models.materials.list.values()] as THREE.Material[];

    if (style === "original") {
      this.restoreMaterialSnapshots();
      this.materialSnapshots.clear();
      this.currentVisualizationStyle = "original";
      fragments.core.update(true);
      return;
    }

    this.snapshotMaterials(materials);
    this.applyStyleToMaterials(style, materials);
    this.currentVisualizationStyle = style;
    fragments.core.update(true);
  }

  private snapshotMaterials(materials: THREE.Material[]): void {
    for (const mat of materials) {
      if (this.materialSnapshots.has(mat)) continue;
      const m = mat as MaterialLike;
      const snapshot: MaterialSnapshot = {
        transparent: mat.transparent,
        opacity: mat.opacity,
        color: m.color instanceof THREE.Color ? m.color.getHex() : undefined,
        lodColor: m.lodColor instanceof THREE.Color ? m.lodColor.getHex() : undefined
      };
      this.materialSnapshots.set(mat, snapshot);
    }
  }

  private restoreMaterialSnapshots(): void {
    for (const [mat, snap] of this.materialSnapshots) {
      const m = mat as MaterialLike;
      mat.transparent = snap.transparent;
      mat.opacity = snap.opacity;
      if (snap.color !== undefined && m.color instanceof THREE.Color) {
        m.color.setHex(snap.color);
      }
      if (snap.lodColor !== undefined && m.lodColor instanceof THREE.Color) {
        m.lodColor.setHex(snap.lodColor);
      }
      mat.needsUpdate = true;
    }
  }

  private applyStyleToMaterials(style: Exclude<VisualizationStyle, "original">, materials: THREE.Material[]): void {
    for (const mat of materials) {
      if (mat.userData?.customId) continue;
      const m = mat as MaterialLike;

      switch (style) {
        case "white":
          mat.transparent = false;
          mat.opacity = 1;
          if (m.color instanceof THREE.Color) m.color.setHex(0xffffff);
          if (m.lodColor instanceof THREE.Color) m.lodColor.setHex(0xffffff);
          break;
        case "ghost":
          mat.transparent = true;
          mat.opacity = 0.12;
          if (m.color instanceof THREE.Color) m.color.setHex(0xffffff);
          if (m.lodColor instanceof THREE.Color) m.lodColor.setHex(0xffffff);
          break;
      }
      mat.needsUpdate = true;
    }
  }
}
