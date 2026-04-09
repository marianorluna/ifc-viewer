import { ViewerFacade } from "./application/services/ViewerFacade";
import type { ThemeMode } from "./domain/entities/Theme";
import { ThatOpenViewerAdapter } from "./infrastructure/thatopen/ThatOpenViewerAdapter";
import { parseElementProperties } from "./presentation/properties/parseElementProperties";
import {
  applyPropertiesViewMode,
  renderPropertiesPlaceholder,
  renderPropertiesTable,
  setJsonPropertiesView
} from "./presentation/properties/renderPropertiesView";
import type { SelectionMap } from "./domain/entities/Selection";

const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No se encontro el elemento requerido: ${id}`);
  }

  return element as T;
};

const initCollapsibleSections = (): void => {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".sidebar-section-btn");
  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("aria-controls");
      if (!targetId) {
        return;
      }

      const body = document.getElementById(targetId);
      if (!body) {
        return;
      }

      const isExpanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isExpanded));
      body.hidden = isExpanded;
    });
  }
};

const renderGroupNode = (
  root: HTMLElement,
  label: string,
  count: number,
  onIsolateToggle: (isolated: boolean) => Promise<void>,
  onHideToggle: (hidden: boolean) => Promise<void>
): void => {
  const row = document.createElement("div");
  row.className = "tree-item";

  const caption = document.createElement("span");
  caption.textContent = `${label} (${count})`;

  const actions = document.createElement("div");
  const isolateButton = document.createElement("button");
  isolateButton.className = "action-button";
  isolateButton.textContent = "Aislar";
  let isolated = false;
  isolateButton.addEventListener("click", async () => {
    isolated = !isolated;
    await onIsolateToggle(isolated);
    isolateButton.textContent = isolated ? "Resetear" : "Aislar";
    isolateButton.classList.toggle("is-active", isolated);
  });

  const hideButton = document.createElement("button");
  hideButton.className = "action-button";
  hideButton.textContent = "Ocultar";
  let hidden = false;
  hideButton.addEventListener("click", async () => {
    hidden = !hidden;
    await onHideToggle(hidden);
    hideButton.textContent = hidden ? "Mostrar" : "Ocultar";
    hideButton.classList.toggle("is-active", hidden);
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
        async (isolated) =>
          isolated
            ? viewerFacade.isolateGroup("storeys", node.id)
            : viewerFacade.showAll(),
        async (hidden) =>
          hidden
            ? viewerFacade.hideGroup("storeys", node.id)
            : viewerFacade.showGroup("storeys", node.id)
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
        async (isolated) =>
          isolated
            ? viewerFacade.isolateGroup("categories", node.key)
            : viewerFacade.showAll(),
        async (hidden) =>
          hidden
            ? viewerFacade.hideGroup("categories", node.key)
            : viewerFacade.showGroup("categories", node.key)
      );
    }
  }
};

const app = async (): Promise<void> => {
  initCollapsibleSections();

  const viewerContainer = getRequiredElement<HTMLDivElement>("viewer-container");
  const ifcInput = getRequiredElement<HTMLInputElement>("ifc-input");
  const loadButton = getRequiredElement<HTMLButtonElement>("btn-load");
  const clearSelectionButton = getRequiredElement<HTMLButtonElement>("btn-clear-selection");
  const showAllButton = getRequiredElement<HTMLButtonElement>("btn-show-all");
  const toggleThemeButton = getRequiredElement<HTMLButtonElement>("btn-toggle-theme");
  const sidebarToggleButton = getRequiredElement<HTMLButtonElement>("btn-sidebar-toggle");
  const sidebarCollapseButton = getRequiredElement<HTMLButtonElement>("btn-sidebar-collapse");
  const sidebarExpandButton = getRequiredElement<HTMLButtonElement>("btn-sidebar-expand");
  const sidebarResizer = getRequiredElement<HTMLDivElement>("sidebar-resizer");
  const propertiesFormatted = getRequiredElement<HTMLElement>("properties-formatted");
  const propertiesJson = getRequiredElement<HTMLPreElement>("properties-json");
  const propertiesViewToggle = getRequiredElement<HTMLButtonElement>("btn-toggle-properties-view");
  const storeyRoot = getRequiredElement<HTMLElement>("storey-tree");
  const categoryRoot = getRequiredElement<HTMLElement>("category-tree");
  const viewerNav = getRequiredElement<HTMLElement>("viewer-nav");
  const viewerNavToggle = getRequiredElement<HTMLButtonElement>("btn-viewer-nav-toggle");
  const navFitBtn = getRequiredElement<HTMLButtonElement>("btn-nav-fit");
  const navIsoBtn = getRequiredElement<HTMLButtonElement>("btn-nav-iso");
  const navTopBtn = getRequiredElement<HTMLButtonElement>("btn-nav-top");
  const navFrontBtn = getRequiredElement<HTMLButtonElement>("btn-nav-front");
  const navRightBtn = getRequiredElement<HTMLButtonElement>("btn-nav-right");

  const VIEWER_NAV_COLLAPSED_KEY = "arqfi_viewer_nav_collapsed";

  const applyViewerNavCollapsed = (collapsed: boolean): void => {
    viewerNav.classList.toggle("viewer-nav--collapsed", collapsed);
    viewerNavToggle.setAttribute("aria-expanded", String(!collapsed));
    const expandLabel = "Mostrar panel de vistas de cámara";
    const collapseLabel = "Ocultar panel de vistas de cámara";
    viewerNavToggle.title = collapsed ? expandLabel : collapseLabel;
    viewerNavToggle.setAttribute("aria-label", collapsed ? expandLabel : collapseLabel);
    try {
      sessionStorage.setItem(VIEWER_NAV_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  };

  const viewerFacade = new ViewerFacade(new ThatOpenViewerAdapter());
  await viewerFacade.init(viewerContainer);
  let currentTheme: ThemeMode = "light";
  document.body.dataset.theme = currentTheme;
  viewerFacade.setTheme(currentTheme);

  let propertiesViewMode: "formatted" | "json" = "formatted";
  let lastPropertiesPayload: Record<string, unknown> | null = null;

  const refreshPropertiesPanel = (
    selection: SelectionMap,
    properties: Record<string, unknown> | null
  ): void => {
    const hasSelection = Object.values(selection).some((ids) => ids.size > 0);
    lastPropertiesPayload = hasSelection ? properties : null;

    if (!hasSelection) {
      setJsonPropertiesView(propertiesJson, null);
      renderPropertiesPlaceholder(propertiesFormatted, "Sin selección");
      applyPropertiesViewMode(propertiesViewMode, propertiesFormatted, propertiesJson, propertiesViewToggle, false);
      return;
    }

    setJsonPropertiesView(propertiesJson, properties ?? null);

    if (properties === null) {
      renderPropertiesPlaceholder(propertiesFormatted, "No se pudieron cargar las propiedades.");
      applyPropertiesViewMode(propertiesViewMode, propertiesFormatted, propertiesJson, propertiesViewToggle, false);
      return;
    }

    const rows = parseElementProperties(properties);
    renderPropertiesTable(propertiesFormatted, rows);
    applyPropertiesViewMode(propertiesViewMode, propertiesFormatted, propertiesJson, propertiesViewToggle, true);
  };

  viewerFacade.onSelectionChange(async (selection, properties) => {
    refreshPropertiesPanel(selection, properties);
  });

  loadButton.addEventListener("click", () => {
    ifcInput.click();
  });

  sidebarToggleButton.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  sidebarCollapseButton.addEventListener("click", () => {
    if (window.innerWidth <= 1024) {
      document.body.classList.remove("sidebar-open");
    } else {
      document.body.classList.add("sidebar-desktop-collapsed");
    }
  });

  sidebarExpandButton.addEventListener("click", () => {
    document.body.classList.remove("sidebar-desktop-collapsed");
  });

  const setSidebarWidthByRatio = (ratio: number): void => {
    const clamped = Math.max(0.15, Math.min(0.5, ratio));
    document.documentElement.style.setProperty("--sidebar-width", `${(clamped * 100).toFixed(2)}vw`);
  };

  setSidebarWidthByRatio(0.25);

  sidebarResizer.addEventListener("pointerdown", (event) => {
    if (window.innerWidth <= 1024) {
      return;
    }

    event.preventDefault();
    sidebarResizer.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent): void => {
      const ratio = moveEvent.clientX / window.innerWidth;
      setSidebarWidthByRatio(ratio);
    };

    const onUp = (upEvent: PointerEvent): void => {
      sidebarResizer.releasePointerCapture(upEvent.pointerId);
      sidebarResizer.removeEventListener("pointermove", onMove);
      sidebarResizer.removeEventListener("pointerup", onUp);
      sidebarResizer.removeEventListener("pointercancel", onUp);
    };

    sidebarResizer.addEventListener("pointermove", onMove);
    sidebarResizer.addEventListener("pointerup", onUp);
    sidebarResizer.addEventListener("pointercancel", onUp);
  });

  propertiesViewToggle.addEventListener("click", () => {
    if (propertiesViewToggle.disabled || lastPropertiesPayload === null) {
      return;
    }

    propertiesViewMode = propertiesViewMode === "formatted" ? "json" : "formatted";
    applyPropertiesViewMode(
      propertiesViewMode,
      propertiesFormatted,
      propertiesJson,
      propertiesViewToggle,
      true
    );
  });

  clearSelectionButton.addEventListener("click", async () => {
    await viewerFacade.clearSelection();
    setJsonPropertiesView(propertiesJson, null);
    renderPropertiesPlaceholder(propertiesFormatted, "Sin selección");
    lastPropertiesPayload = null;
    applyPropertiesViewMode(propertiesViewMode, propertiesFormatted, propertiesJson, propertiesViewToggle, false);
  });

  showAllButton.addEventListener("click", async () => {
    await viewerFacade.showAll();
  });

  toggleThemeButton.addEventListener("click", () => {
    currentTheme = currentTheme === "light" ? "dark" : "light";
    document.body.dataset.theme = currentTheme;
    viewerFacade.setTheme(currentTheme);
    const isDark = currentTheme === "dark";
    toggleThemeButton.classList.toggle("is-active", isDark);
    const nextLabel = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
    toggleThemeButton.title = nextLabel;
    toggleThemeButton.setAttribute("aria-label", nextLabel);
  });

  viewerNavToggle.addEventListener("click", () => {
    applyViewerNavCollapsed(!viewerNav.classList.contains("viewer-nav--collapsed"));
  });

  let initialNavCollapsed = true;
  try {
    const stored = sessionStorage.getItem(VIEWER_NAV_COLLAPSED_KEY);
    if (stored === "0") {
      initialNavCollapsed = false;
    }
  } catch {
    initialNavCollapsed = true;
  }
  applyViewerNavCollapsed(initialNavCollapsed);

  navFitBtn.addEventListener("click", () => { void viewerFacade.setCameraView("fit"); });
  navIsoBtn.addEventListener("click", () => { void viewerFacade.setCameraView("isometric"); });
  navTopBtn.addEventListener("click", () => { void viewerFacade.setCameraView("top"); });
  navFrontBtn.addEventListener("click", () => { void viewerFacade.setCameraView("front"); });
  navRightBtn.addEventListener("click", () => { void viewerFacade.setCameraView("right"); });

  ifcInput.addEventListener("change", async () => {
    const file = ifcInput.files?.[0];
    if (!file) {
      return;
    }

    renderPropertiesPlaceholder(propertiesFormatted, "Cargando modelo…");
    setJsonPropertiesView(propertiesJson, null);
    lastPropertiesPayload = null;
    applyPropertiesViewMode(propertiesViewMode, propertiesFormatted, propertiesJson, propertiesViewToggle, false);
    await viewerFacade.loadIfc(file);
    await loadNavigationTrees(viewerFacade, storeyRoot, categoryRoot);
    renderPropertiesPlaceholder(propertiesFormatted, "Modelo cargado. Selecciona un elemento.");
    ifcInput.value = "";
  });

  window.addEventListener("beforeunload", () => {
    viewerFacade.dispose();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) {
      document.body.classList.remove("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-desktop-collapsed");
    }
  });
};

void app();
