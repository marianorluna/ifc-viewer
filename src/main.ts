import { Manager } from "@thatopen/ui";
import { ViewerFacade } from "./application/services/ViewerFacade";
import { ThatOpenViewerAdapter } from "./infrastructure/thatopen/ThatOpenViewerAdapter";
import "./style.css";

type BimGridElement = HTMLElement & {
  layouts: Record<string, string>;
  setLayout: (layoutName: string) => void;
};

const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No se encontro el elemento requerido: ${id}`);
  }

  return element as T;
};

const setupLayout = (): void => {
  const grid = getRequiredElement<BimGridElement>("app-grid");
  grid.layouts = {
    main: `
      "header header" auto
      "sidebar content" 1fr
      / 340px 1fr
    `
  };
  grid.setLayout("main");
};

const app = async (): Promise<void> => {
  Manager.init();
  setupLayout();

  const viewerContainer = getRequiredElement<HTMLDivElement>("viewer-container");
  const ifcInput = getRequiredElement<HTMLInputElement>("ifc-input");
  const loadButton = getRequiredElement<HTMLElement>("btn-load");
  const clearSelectionButton = getRequiredElement<HTMLElement>("btn-clear-selection");
  const propertiesContent = getRequiredElement<HTMLElement>("properties-content");

  const viewerFacade = new ViewerFacade(new ThatOpenViewerAdapter());
  await viewerFacade.init(viewerContainer);

  viewerFacade.onSelectionChange(async (selection, properties) => {
    const hasSelection = Object.values(selection).some((ids) => ids.size > 0);
    propertiesContent.textContent = hasSelection
      ? JSON.stringify(properties, null, 2)
      : "Sin seleccion";
  });

  loadButton.addEventListener("click", () => {
    ifcInput.click();
  });

  clearSelectionButton.addEventListener("click", async () => {
    await viewerFacade.clearSelection();
    propertiesContent.textContent = "Sin seleccion";
  });

  ifcInput.addEventListener("change", async () => {
    const file = ifcInput.files?.[0];
    if (!file) {
      return;
    }

    propertiesContent.textContent = "Cargando modelo...";
    await viewerFacade.loadIfc(file);
    propertiesContent.textContent = "Modelo cargado. Selecciona un elemento.";
    ifcInput.value = "";
  });

  window.addEventListener("beforeunload", () => {
    viewerFacade.dispose();
  });
};

void app();
