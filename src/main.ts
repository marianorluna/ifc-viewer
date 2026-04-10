import { ViewerFacade } from "./application/services/ViewerFacade";
import {
  IFC_ABSOLUTE_MAX_BYTES,
  IFC_RECOMMENDED_MAX_BYTES
} from "./domain/constants/ifcLoadLimits";
import { IfcFileExceedsAbsoluteLimitError } from "./domain/errors/IfcLoadErrors";
import type { ThemeMode } from "./domain/entities/Theme";
import type { VisualizationStyle } from "./domain/entities/VisualizationStyle";
import { ThatOpenViewerAdapter } from "./infrastructure/thatopen/ThatOpenViewerAdapter";
import { parseElementProperties } from "./presentation/properties/parseElementProperties";
import {
  applyPropertiesViewMode,
  renderPropertiesPlaceholder,
  renderPropertiesTable,
  setJsonPropertiesView
} from "./presentation/properties/renderPropertiesView";
import type { SelectionMap } from "./domain/entities/Selection";
import { confirmLoadLargeIfc, showIfcAlert } from "./presentation/ifcLoadDialogs";

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
  const viewerToolbar = getRequiredElement<HTMLDivElement>("viewer-toolbar");
  const toolbarToggleBtn = getRequiredElement<HTMLButtonElement>("btn-toolbar-toggle");
  const loadButton = getRequiredElement<HTMLButtonElement>("btn-load");
  const clearSelectionButton = getRequiredElement<HTMLButtonElement>("btn-clear-selection");
  const showAllButton = getRequiredElement<HTMLButtonElement>("btn-show-all");
  const toggleThemeButton = getRequiredElement<HTMLButtonElement>("btn-toggle-theme");
  const sidebarCollapseButton = getRequiredElement<HTMLButtonElement>("btn-sidebar-collapse");
  const sidebarExpandButton = getRequiredElement<HTMLButtonElement>("btn-sidebar-expand");
  const sidebarResizer = getRequiredElement<HTMLDivElement>("sidebar-resizer");
  const propertiesFormatted = getRequiredElement<HTMLElement>("properties-formatted");
  const propertiesJson = getRequiredElement<HTMLPreElement>("properties-json");
  const propertiesViewToggle = getRequiredElement<HTMLButtonElement>("btn-toggle-properties-view");
  const storeyRoot = getRequiredElement<HTMLElement>("storey-tree");
  const categoryRoot = getRequiredElement<HTMLElement>("category-tree");
  const ifcModelLoader = getRequiredElement<HTMLDivElement>("ifc-model-loader");
  const ifcModelLoaderFilename = getRequiredElement<HTMLElement>("ifc-model-loader-filename");
  const viewerNav = getRequiredElement<HTMLElement>("viewer-nav");
  const viewerNavToggle = getRequiredElement<HTMLButtonElement>("btn-viewer-nav-toggle");
  const navFitBtn = getRequiredElement<HTMLButtonElement>("btn-nav-fit");
  const navIsoBtn = getRequiredElement<HTMLButtonElement>("btn-nav-iso");
  const navTopBtn = getRequiredElement<HTMLButtonElement>("btn-nav-top");
  const navFrontBtn = getRequiredElement<HTMLButtonElement>("btn-nav-front");
  const navRightBtn = getRequiredElement<HTMLButtonElement>("btn-nav-right");
  const gridToggleBtn = getRequiredElement<HTMLButtonElement>("btn-toggle-grid");
  const projectionToggleBtn = getRequiredElement<HTMLButtonElement>("btn-toggle-projection");
  const projectionLabel = getRequiredElement<HTMLSpanElement>("viewer-nav-projection-label");
  const stylesTriggerBtn = getRequiredElement<HTMLButtonElement>("btn-styles-toggle");
  const stylesFlyout = getRequiredElement<HTMLDivElement>("viewer-style-flyout");
  const styleOriginalBtn = getRequiredElement<HTMLButtonElement>("btn-style-original");
  const styleWhiteBtn = getRequiredElement<HTMLButtonElement>("btn-style-white");
  const styleGhostBtn = getRequiredElement<HTMLButtonElement>("btn-style-ghost");

  const VIEWER_NAV_COLLAPSED_KEY = "arqfi_viewer_nav_collapsed";
  const VIEWER_TOOLBAR_COLLAPSED_KEY = "arqfi_viewer_toolbar_collapsed";

  const setIfcModelLoading = (active: boolean, fileName?: string): void => {
    if (active) {
      ifcModelLoaderFilename.textContent = fileName ?? "";
      ifcModelLoader.hidden = false;
      ifcModelLoader.setAttribute("aria-busy", "true");
    } else {
      ifcModelLoader.hidden = true;
      ifcModelLoader.removeAttribute("aria-busy");
      ifcModelLoaderFilename.textContent = "";
    }
  };

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

  const applyViewerToolbarCollapsed = (collapsed: boolean): void => {
    viewerToolbar.classList.toggle("viewer-toolbar--collapsed", collapsed);
    toolbarToggleBtn.setAttribute("aria-expanded", String(!collapsed));
    const showLabel = "Mostrar barra de acciones";
    const hideLabel = "Ocultar barra de acciones";
    toolbarToggleBtn.title = collapsed ? showLabel : hideLabel;
    toolbarToggleBtn.setAttribute("aria-label", collapsed ? showLabel : hideLabel);
    try {
      sessionStorage.setItem(VIEWER_TOOLBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  };

  const viewerFacade = new ViewerFacade(new ThatOpenViewerAdapter());
  await viewerFacade.init(viewerContainer);
  let currentTheme: ThemeMode = "light";
  document.body.dataset.theme = currentTheme;
  viewerFacade.setTheme(currentTheme);

  let gridVisible = true;
  const syncGridToggleUi = (): void => {
    gridToggleBtn.setAttribute("aria-pressed", String(gridVisible));
    const hideLabel = "Ocultar rejilla";
    const showLabel = "Mostrar rejilla";
    gridToggleBtn.title = gridVisible ? hideLabel : showLabel;
    gridToggleBtn.setAttribute("aria-label", gridVisible ? hideLabel : showLabel);
    gridToggleBtn.classList.toggle("viewer-nav-btn--grid-off", !gridVisible);
  };
  syncGridToggleUi();

  const syncProjectionToggleUi = (): void => {
    const mode = viewerFacade.getCameraProjection();
    const isPerspective = mode === "Perspective";
    projectionLabel.textContent = isPerspective ? "Perspectiva" : "Ortogonal";
    projectionToggleBtn.title = isPerspective ? "Cambiar a vista ortogonal" : "Cambiar a vista en perspectiva";
    projectionToggleBtn.setAttribute(
      "aria-label",
      isPerspective ? "Cambiar a vista ortogonal" : "Cambiar a vista en perspectiva"
    );
  };
  syncProjectionToggleUi();

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

  sidebarCollapseButton.addEventListener("click", () => {
    if (window.innerWidth <= 1024) {
      document.body.classList.remove("sidebar-open");
    } else {
      document.body.classList.add("sidebar-desktop-collapsed");
    }
  });

  sidebarExpandButton.addEventListener("click", () => {
    if (window.innerWidth <= 1024) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-desktop-collapsed");
    }
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

  let initialToolbarCollapsed = false;
  try {
    if (sessionStorage.getItem(VIEWER_TOOLBAR_COLLAPSED_KEY) === "1") {
      initialToolbarCollapsed = true;
    }
  } catch {
    initialToolbarCollapsed = false;
  }
  applyViewerToolbarCollapsed(initialToolbarCollapsed);

  toolbarToggleBtn.addEventListener("click", () => {
    applyViewerToolbarCollapsed(!viewerToolbar.classList.contains("viewer-toolbar--collapsed"));
  });

  navFitBtn.addEventListener("click", () => { void viewerFacade.setCameraView("fit"); });
  navIsoBtn.addEventListener("click", () => { void viewerFacade.setCameraView("isometric"); });
  navTopBtn.addEventListener("click", () => { void viewerFacade.setCameraView("top"); });
  navFrontBtn.addEventListener("click", () => { void viewerFacade.setCameraView("front"); });
  navRightBtn.addEventListener("click", () => { void viewerFacade.setCameraView("right"); });

  gridToggleBtn.addEventListener("click", () => {
    gridVisible = !gridVisible;
    viewerFacade.setGridVisible(gridVisible);
    syncGridToggleUi();
  });

  projectionToggleBtn.addEventListener("click", () => {
    void viewerFacade.toggleCameraProjection().then(() => {
      syncProjectionToggleUi();
    });
  });

  const allStyleBtns: ReadonlyArray<[HTMLButtonElement, VisualizationStyle]> = [
    [styleOriginalBtn, "original"],
    [styleWhiteBtn, "white"],
    [styleGhostBtn, "ghost"]
  ];

  const syncStyleUi = (active: VisualizationStyle): void => {
    for (const [btn, style] of allStyleBtns) {
      const isActive = style === active;
      btn.classList.toggle("viewer-nav-btn--active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
    }
    const hasNonDefault = active !== "original";
    stylesTriggerBtn.classList.toggle("viewer-nav-btn--active", hasNonDefault);
  };

  const positionStyleFlyout = (): void => {
    const btnRect = stylesTriggerBtn.getBoundingClientRect();
    const wrapperRect = viewerContainer.parentElement!.getBoundingClientRect();
    const top = btnRect.top - wrapperRect.top;
    const right = wrapperRect.right - btnRect.left + 8;
    stylesFlyout.style.top = `${top}px`;
    stylesFlyout.style.right = `${right}px`;
  };

  const openStyleFlyout = (): void => {
    positionStyleFlyout();
    stylesFlyout.hidden = false;
    stylesTriggerBtn.setAttribute("aria-expanded", "true");
  };

  const closeStyleFlyout = (): void => {
    stylesFlyout.hidden = true;
    stylesTriggerBtn.setAttribute("aria-expanded", "false");
  };

  stylesTriggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (stylesFlyout.hidden) {
      openStyleFlyout();
    } else {
      closeStyleFlyout();
    }
  });

  stylesFlyout.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    if (!stylesFlyout.hidden) {
      closeStyleFlyout();
    }
  });

  for (const [btn, style] of allStyleBtns) {
    btn.addEventListener("click", () => {
      viewerFacade.setVisualizationStyle(style);
      syncStyleUi(style);
      closeStyleFlyout();
    });
  }

  ifcInput.addEventListener("change", async () => {
    const file = ifcInput.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > IFC_ABSOLUTE_MAX_BYTES) {
      await showIfcAlert(
        document,
        "No se puede cargar el archivo",
        new IfcFileExceedsAbsoluteLimitError(IFC_ABSOLUTE_MAX_BYTES).userMessage()
      );
      ifcInput.value = "";
      return;
    }

    if (file.size > IFC_RECOMMENDED_MAX_BYTES) {
      const proceed = await confirmLoadLargeIfc(document, file);
      if (!proceed) {
        ifcInput.value = "";
        return;
      }
    }

    renderPropertiesPlaceholder(propertiesFormatted, "Cargando modelo…");
    setJsonPropertiesView(propertiesJson, null);
    lastPropertiesPayload = null;
    applyPropertiesViewMode(propertiesViewMode, propertiesFormatted, propertiesJson, propertiesViewToggle, false);

    setIfcModelLoading(true, file.name);

    try {
      await viewerFacade.loadIfc(file);
      await loadNavigationTrees(viewerFacade, storeyRoot, categoryRoot);
      renderPropertiesPlaceholder(propertiesFormatted, "Modelo cargado. Selecciona un elemento.");
    } catch (error) {
      const message =
        error instanceof IfcFileExceedsAbsoluteLimitError
          ? error.userMessage()
          : error instanceof Error && error.message.length > 0
            ? `No se pudo completar la carga: ${error.message}`
            : "No se pudo cargar el IFC. El archivo puede ser demasiado pesado para tu navegador o estar dañado.";

      await showIfcAlert(document, "Error al cargar el modelo", message);
      renderPropertiesPlaceholder(propertiesFormatted, "No se pudo cargar el modelo.");
      setJsonPropertiesView(propertiesJson, null);
      lastPropertiesPayload = null;
      applyPropertiesViewMode(propertiesViewMode, propertiesFormatted, propertiesJson, propertiesViewToggle, false);
      await viewerFacade.clearSelection();
      await loadNavigationTrees(viewerFacade, storeyRoot, categoryRoot);
    } finally {
      setIfcModelLoading(false);
      ifcInput.value = "";
    }
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
