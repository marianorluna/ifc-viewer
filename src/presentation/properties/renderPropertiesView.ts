import {
  omitIfcGraphKeysForPropertiesPanel,
  type ElementPropertyRow
} from "./parseElementProperties";

const EMPTY_CLASS = "properties-empty";

export function renderPropertiesTable(container: HTMLElement, rows: ElementPropertyRow[]): void {
  container.innerHTML = "";
  container.classList.remove(EMPTY_CLASS);

  if (rows.length === 0) {
    container.classList.add(EMPTY_CLASS);
    container.textContent = "No hay propiedades para este elemento.";
    return;
  }

  const table = document.createElement("table");
  table.className = "properties-table";

  const tbody = document.createElement("tbody");

  for (const row of rows) {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = row.displayKey;

    const td = document.createElement("td");
    const valueBlock = document.createElement("div");
    valueBlock.className = "properties-value";
    valueBlock.textContent = row.value;
    td.appendChild(valueBlock);

    if (row.type !== undefined) {
      const typeEl = document.createElement("div");
      typeEl.className = "properties-type-hint";
      typeEl.textContent = row.type;
      td.appendChild(typeEl);
    }

    tr.append(th, td);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

export function renderPropertiesPlaceholder(container: HTMLElement, message: string): void {
  container.innerHTML = "";
  container.classList.add(EMPTY_CLASS);
  container.textContent = message;
}

export function setJsonPropertiesView(pre: HTMLPreElement, raw: Record<string, unknown> | null): void {
  const visible = omitIfcGraphKeysForPropertiesPanel(raw);
  pre.textContent = visible === null ? "" : JSON.stringify(visible, null, 2);
}

export function applyPropertiesViewMode(
  mode: "formatted" | "json",
  formatted: HTMLElement,
  jsonPre: HTMLPreElement,
  toggleButton: HTMLButtonElement,
  hasRenderableData: boolean
): void {
  const showJson = mode === "json" && hasRenderableData;
  formatted.hidden = showJson;
  jsonPre.hidden = !showJson;
  toggleButton.textContent = showJson ? "Ver tabla" : "Ver JSON";
  toggleButton.classList.toggle("is-active", showJson);
  toggleButton.disabled = !hasRenderableData;
  toggleButton.setAttribute("aria-pressed", showJson ? "true" : "false");
}
