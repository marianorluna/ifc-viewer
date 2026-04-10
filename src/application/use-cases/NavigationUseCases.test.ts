import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BuildNavigationDataUseCase } from "./BuildNavigationDataUseCase";
import { GetCategoryGroupsUseCase } from "./GetCategoryGroupsUseCase";
import { GetSpatialTreeUseCase } from "./GetSpatialTreeUseCase";
import { HideClassificationGroupUseCase } from "./HideClassificationGroupUseCase";
import { IsolateClassificationGroupUseCase } from "./IsolateClassificationGroupUseCase";
import { ShowAllUseCase } from "./ShowAllUseCase";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

describe("Navigation use-cases", () => {
  it("ejecuta aislamiento, ocultado y showAll por clasificación", async () => {
    const calls: string[] = [];
    const viewer: ViewerPort = {
      init: async () => {},
      dispose: () => {},
      clearSelection: async () => {},
      loadIfcBuffer: async () => {},
      disposeModelIfPresent: async () => {},
      onSelectionChange: () => {},
      getFirstSelectedProperties: async () => null,
      buildNavigationData: async () => {
        calls.push("build");
      },
      getSpatialTree: async () => [{ id: "L1", label: "Nivel 1", count: 10 }],
      getCategoryGroups: async () => [{ key: "IFCWALL", label: "IFCWALL", itemCount: 24 }],
      isolateClassificationGroup: async (classification, groupKey) => {
        calls.push(`isolate:${classification}:${groupKey}`);
      },
      hideClassificationGroup: async (classification, groupKey) => {
        calls.push(`hide:${classification}:${groupKey}`);
      },
      showClassificationGroup: async (_classification, _groupKey) => {},
      showAll: async () => {
        calls.push("showAll");
      },
      setTheme: () => {},
      setCameraView: async () => {},
      setGridVisible: () => {},
      toggleCameraProjection: async () => {},
      getCameraProjection: () => "Perspective"
    };

    await new BuildNavigationDataUseCase(viewer).execute();
    const storeys = await new GetSpatialTreeUseCase(viewer).execute();
    const categories = await new GetCategoryGroupsUseCase(viewer).execute();
    await new IsolateClassificationGroupUseCase(viewer).execute("storeys", "L1");
    await new HideClassificationGroupUseCase(viewer).execute("categories", "IFCWALL");
    await new ShowAllUseCase(viewer).execute();

    assert.equal(storeys.length, 1);
    assert.equal(categories.length, 1);
    assert.deepEqual(calls, ["build", "isolate:storeys:L1", "hide:categories:IFCWALL", "showAll"]);
  });
});
