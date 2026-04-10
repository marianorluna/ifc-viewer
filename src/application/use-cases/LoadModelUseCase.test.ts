import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IFC_ABSOLUTE_MAX_BYTES } from "../../domain/constants/ifcLoadLimits";
import { IfcFileExceedsAbsoluteLimitError } from "../../domain/errors/IfcLoadErrors";
import { LoadModelUseCase } from "./LoadModelUseCase";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

const createViewerStub = (
  overrides: Partial<Pick<ViewerPort, "loadIfcBuffer" | "disposeModelIfPresent">> = {}
): ViewerPort => {
  const loadIfcBuffer =
    overrides.loadIfcBuffer ??
    (async (buffer: Uint8Array, modelId: string): Promise<void> => {
      void buffer;
      void modelId;
    });
  const disposeModelIfPresent = overrides.disposeModelIfPresent ?? (async (): Promise<void> => {});

  return {
    init: async () => {},
    dispose: () => {},
    clearSelection: async () => {},
    loadIfcBuffer,
    disposeModelIfPresent,
    disposeAllIfcModels: async () => {},
    onSelectionChange: () => {},
    getFirstSelectedProperties: async () => null,
    buildNavigationData: async () => {},
    getSpatialTree: async () => [],
    getCategoryGroups: async () => [],
    isolateClassificationGroup: async () => {},
    hideClassificationGroup: async () => {},
    showClassificationGroup: async () => {},
    showAll: async () => {},
    setTheme: () => {},
    setCameraView: async () => {},
    setGridVisible: () => {},
    toggleCameraProjection: async () => {},
    getCameraProjection: () => "Perspective",
    setVisualizationStyle: () => {},
    hasIfcModels: () => false
  };
};

describe("LoadModelUseCase", () => {
  it("carga buffer y genera un modelId", async () => {
    const calls: Array<{ buffer: Uint8Array; modelId: string }> = [];
    const viewer = createViewerStub({
      loadIfcBuffer: async (buffer, modelId) => {
        calls.push({ buffer, modelId });
      }
    });

    const useCase = new LoadModelUseCase(viewer);
    const file = new File([new Uint8Array([1, 2, 3])], "demo.ifc");
    const modelId = await useCase.execute(file);

    assert.equal(calls.length, 1);
    assert.equal(modelId.startsWith("model-demo-ifc-"), true);
    assert.equal(calls[0]?.modelId, modelId);
  });

  it("rechaza archivos por encima del tope absoluto", async () => {
    const viewer = createViewerStub();
    const useCase = new LoadModelUseCase(viewer);
    const oversize = {
      name: "huge.ifc",
      size: IFC_ABSOLUTE_MAX_BYTES + 1,
      arrayBuffer: async (): Promise<ArrayBuffer> => new ArrayBuffer(0)
    } as File;

    await assert.rejects(() => useCase.execute(oversize), IfcFileExceedsAbsoluteLimitError);
  });

  it("llama disposeModelIfPresent si loadIfcBuffer falla", async () => {
    const disposed: string[] = [];
    const viewer = createViewerStub({
      loadIfcBuffer: async (): Promise<void> => {
        throw new Error("fallo de carga");
      },
      disposeModelIfPresent: async (id): Promise<void> => {
        disposed.push(id);
      }
    });

    const useCase = new LoadModelUseCase(viewer);
    const file = new File([new Uint8Array([1])], "x.ifc");

    await assert.rejects(() => useCase.execute(file), /fallo de carga/);
    assert.equal(disposed.length, 1);
    assert.equal(disposed[0]?.startsWith("model-x-ifc-"), true);
  });
});
