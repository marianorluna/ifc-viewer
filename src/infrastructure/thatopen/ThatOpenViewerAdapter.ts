import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import type { SelectionMap } from "../../domain/entities/Selection";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class ThatOpenViewerAdapter implements ViewerPort {
  private readonly components = new OBC.Components();
  private world?: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;
  private highlighter?: OBF.Highlighter;
  private selectionCallback?: (selection: SelectionMap) => Promise<void> | void;

  async init(container: HTMLElement): Promise<void> {
    const worlds = this.components.get(OBC.Worlds);
    const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

    world.scene = new OBC.SimpleScene(this.components);
    world.renderer = new OBC.SimpleRenderer(this.components, container);
    world.camera = new OBC.SimpleCamera(this.components);

    this.components.init();
    world.scene.setup();
    await world.camera.controls.setLookAt(12, 8, 12, 0, 0, 0);

    const grid = this.components.get(OBC.Grids).create(world);
    if (grid.material.uniforms.uColor) {
      grid.material.uniforms.uColor.value = new THREE.Color("#3a3a3a");
    }

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

    this.world = world;
    this.highlighter = highlighter;
  }

  dispose(): void {
    this.components.dispose();
  }

  onSelectionChange(callback: (selection: SelectionMap) => Promise<void> | void): void {
    this.selectionCallback = callback;
  }

  async clearSelection(): Promise<void> {
    this.highlighter?.clear();
  }

  async loadIfcBuffer(buffer: Uint8Array, modelId: string): Promise<void> {
    const ifcLoader = this.components.get(OBC.IfcLoader);
    await ifcLoader.setup({
      autoSetWasm: false,
      wasm: { path: "https://unpkg.com/web-ifc@0.0.74/", absolute: true }
    });
    await ifcLoader.load(buffer, false, modelId);
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

    const items = await model.getItemsData([firstLocalId]);
    const firstItem = items[0];
    if (!firstItem) {
      return null;
    }

    return firstItem as Record<string, unknown>;
  }
}
