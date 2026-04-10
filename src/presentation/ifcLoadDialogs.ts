import {
  IFC_RECOMMENDED_MAX_BYTES,
  formatIfcSizeForUi
} from "../domain/constants/ifcLoadLimits";

/**
 * Diálogo de confirmación cuando el IFC supera el tamaño recomendado (p. ej. 100 MB).
 */
export async function confirmLoadLargeIfc(doc: Document, file: File): Promise<boolean> {
  const overlay = doc.getElementById("ifc-oversized-dialog");
  const titleEl = doc.getElementById("ifc-oversized-dialog-title");
  const messageEl = doc.getElementById("ifc-oversized-dialog-message");
  const cancelBtn = doc.getElementById("ifc-oversized-dialog-cancel");
  const confirmBtn = doc.getElementById("ifc-oversized-dialog-confirm");

  if (
    !overlay ||
    !titleEl ||
    !messageEl ||
    !(cancelBtn instanceof HTMLButtonElement) ||
    !(confirmBtn instanceof HTMLButtonElement)
  ) {
    return false;
  }

  const recommended = formatIfcSizeForUi(IFC_RECOMMENDED_MAX_BYTES);
  titleEl.textContent = "Archivo IFC grande";
  messageEl.textContent = `“${file.name}” pesa ${formatIfcSizeForUi(
    file.size
  )}. Para un uso estable en el navegador se recomienda no superar ${recommended}. Si confías en la capacidad de tu equipo, puedes continuar de todos modos.`;

  overlay.hidden = false;

  return new Promise((resolve) => {
    const finish = (value: boolean): void => {
      overlay.hidden = true;
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      doc.removeEventListener("keydown", onKey);
      resolve(value);
    };

    const onCancel = (): void => {
      finish(false);
    };
    const onConfirm = (): void => {
      finish(true);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        finish(false);
      }
    };

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    doc.addEventListener("keydown", onKey);
  });
}

/**
 * Confirma antes de quitar todos los IFC cargados y reiniciar el visor (equivalente a limpiar la escena).
 */
export async function confirmClearLoadedIfc(doc: Document): Promise<boolean> {
  const overlay = doc.getElementById("ifc-clear-dialog");
  const cancelBtn = doc.getElementById("ifc-clear-dialog-cancel");
  const confirmBtn = doc.getElementById("ifc-clear-dialog-confirm");

  if (
    !overlay ||
    !(cancelBtn instanceof HTMLButtonElement) ||
    !(confirmBtn instanceof HTMLButtonElement)
  ) {
    return false;
  }

  overlay.hidden = false;

  return new Promise((resolve) => {
    const finish = (value: boolean): void => {
      overlay.hidden = true;
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      doc.removeEventListener("keydown", onKey);
      resolve(value);
    };

    const onCancel = (): void => {
      finish(false);
    };
    const onConfirm = (): void => {
      finish(true);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        finish(false);
      }
    };

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    doc.addEventListener("keydown", onKey);
  });
}

export async function showIfcAlert(doc: Document, title: string, message: string): Promise<void> {
  const overlay = doc.getElementById("ifc-alert-dialog");
  const titleEl = doc.getElementById("ifc-alert-dialog-title");
  const messageEl = doc.getElementById("ifc-alert-dialog-message");
  const okBtn = doc.getElementById("ifc-alert-dialog-ok");

  if (
    !overlay ||
    !titleEl ||
    !messageEl ||
    !(okBtn instanceof HTMLButtonElement)
  ) {
    return;
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  overlay.hidden = false;

  await new Promise<void>((resolve) => {
    const done = (): void => {
      overlay.hidden = true;
      okBtn.removeEventListener("click", onOk);
      doc.removeEventListener("keydown", onKey);
      resolve();
    };

    const onOk = (): void => {
      done();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" || e.key === "Enter") {
        done();
      }
    };

    okBtn.addEventListener("click", onOk);
    doc.addEventListener("keydown", onKey);
  });
}
