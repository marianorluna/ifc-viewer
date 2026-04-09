import { Manager } from "@thatopen/ui";
import { ViewerFacade } from "./application/services/ViewerFacade";
import type { ClassificationGroup, SpatialTreeNode } from "./domain/entities/Classification";
import type { ThemeMode } from "./domain/entities/Theme";
import { ThatOpenViewerAdapter } from "./infrastructure/thatopen/ThatOpenViewerAdapter";
import "./style.css";

type BimGridElement = HTMLElement & {
  layouts?: Record<string, { template: string }>;
  layout?: string;
};

const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No se encontro el elemento requerido: ${id}`);
  }

  return element as T;
};

const setupLayout = (): void => {
  getRequiredElement<BimGridElement>("app-grid");
};

const renderGroupNode = (
  root: HTMLElement,
  label: string,
  count: number,
  onIsolate: () => Promise<void>,
  onHide: () => Promise<void>
): void => {
  const row = document.createElement("div");
  row.className = "tree-item";

  const caption = document.createElement("span");
  caption.textContent = `${label} (${count})`;

  const actions = document.createElement("div");
  const isolateButton = document.createElement("button");
  isolateButton.textContent = "Aislar";
  isolateButton.addEventListener("click", async () => {
    await onIsolate();
  });

  const hideButton = document.createElement("button");
  hideButton.textContent = "Ocultar";
  hideButton.addEventListener("click", async () => {
    await onHide();
  });

  actions.append(isolateButton, hideButton);
  row.append(caption, actions);
  root.appendChild(row);
};

const loadNavigationTrees = async (
  viewerFacade: ViewerFacade,
  storeyRoot: HTMLElement,
  categoryRoot: HTMLElement
): Promise<void> => {
  const [storeys, categories] = await Promise.all([
    viewerFacade.getSpatialTree(),
    viewerFacade.getCategoryGroups()
  ]);

  storeyRoot.innerHTML = "";
  if (storeys.length === 0) {
    storeyRoot.textContent = "Sin datos (carga un modelo IFC)";
  } else {
    for (const node of storeys) {
      renderGroupNode(
        storeyRoot,
        node.label,
        node.count,
        async () => viewerFacade.isolateGroup("storeys", node.id),
        async () => viewerFacade.hideGroup("storeys", node.id)
      );
    }
  }

  categoryRoot.innerHTML = "";
  if (categories.length === 0) {
    categoryRoot.textContent = "Sin datos (carga un modelo IFC)";
  } else {
    for (const node of categories) {
      renderGroupNode(
        categoryRoot,
        node.label,
        node.itemCount,
        async () => viewerFacade.isolateGroup("categories", node.key),
        async () => viewerFacade.hideGroup("categories", node.key)
      );
    }
  }
};

const app = async (): Promise<void> => {
  Manager.init();
  setupLayout();

  const viewerContainer = getRequiredElement<HTMLDivElement>("viewer-container");
  const ifcInput = getRequiredElement<HTMLInputElement>("ifc-input");
  const loadButton = getRequiredElement<HTMLButtonElement>("btn-load");
  const clearSelectionButton = getRequiredElement<HTMLButtonElement>("btn-clear-selection");
  const showAllButton = getRequiredElement<HTMLButtonElement>("btn-show-all");
  const toggleThemeButton = getRequiredElement<HTMLButtonElement>("btn-toggle-theme");
  const sidebarToggleButton = getRequiredElement<HTMLButtonElement>("btn-sidebar-toggle");
  const propertiesContent = getRequiredElement<HTMLElement>("properties-content");
  const storeyRoot = getRequiredElement<HTMLElement>("storey-tree");
  const categoryRoot = getRequiredElement<HTMLElement>("category-tree");

  const viewerFacade = new ViewerFacade(new ThatOpenViewerAdapter());
  await viewerFacade.init(viewerContainer);
  let currentTheme: ThemeMode = "light";
  document.body.dataset.theme = currentTheme;
  viewerFacade.setTheme(currentTheme);

  viewerFacade.onSelectionChange(async (selection, properties) => {
    const hasSelection = Object.values(selection).some((ids) => ids.size > 0);
    propertiesContent.textContent = hasSelection
      ? JSON.stringify(properties, null, 2)
      : "Sin seleccion";
  });

  loadButton.addEventListener("click", () => {
    ifcInput.click();
  });

  sidebarToggleButton.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  clearSelectionButton.addEventListener("click", async () => {
    await viewerFacade.clearSelection();
    propertiesContent.textContent = "Sin seleccion";
  });

  showAllButton.addEventListener("click", async () => {
    await viewerFacade.showAll();
  });

  toggleThemeButton.addEventListener("click", () => {
    currentTheme = currentTheme === "light" ? "dark" : "light";
    document.body.dataset.theme = currentTheme;
    viewerFacade.setTheme(currentTheme);
    toggleThemeButton.setAttribute("label", currentTheme === "light" ? "Tema: claro" : "Tema: oscuro");
  });

  ifcInput.addEventListener("change", async () => {
    const file = ifcInput.files?.[0];
    if (!file) {
      return;
    }

    propertiesContent.textContent = "Cargando modelo...";
    await viewerFacade.loadIfc(file);
    await loadNavigationTrees(viewerFacade, storeyRoot, categoryRoot);
    propertiesContent.textContent = "Modelo cargado. Selecciona un elemento.";
    ifcInput.value = "";
  });

  window.addEventListener("beforeunload", () => {
    viewerFacade.dispose();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) {
      document.body.classList.remove("sidebar-open");
    }
  });
};

void app();
