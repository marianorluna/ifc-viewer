import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LoadModelUseCase } from "./LoadModelUseCase";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

describe("LoadModelUseCase", () => {
  it("carga buffer y genera un modelId", async () => {
    const calls: Array<{ buffer: Uint8Array; modelId: string }> = [];
    const loadIfcBuffer = async (buffer: Uint8Array, modelId: string): Promise<void> => {
      calls.push({ buffer, modelId });
    };
    const viewer: ViewerPort = {
      init: async () => {},
      dispose: () => {},
      clearSelection: async () => {},
      loadIfcBuffer,
      onSelectionChange: () => {},
      getFirstSelectedProperties: async () => null
    };

    const useCase = new LoadModelUseCase(viewer);
    const file = new File([new Uint8Array([1, 2, 3])], "demo.ifc");
    await useCase.execute(file);

    assert.equal(calls.length, 1);
    const generatedModelId = calls[0]?.modelId ?? "";
    assert.equal(generatedModelId.startsWith("model-demo-ifc-"), true);
  });
});
