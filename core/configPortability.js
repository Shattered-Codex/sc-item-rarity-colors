export const SCIRC_CONFIG_FORMAT = "scirc-config";
export const SCIRC_CONFIG_VERSION = 1;

const DEFAULT_EXPORT_DIRECTORY = () => {
  const worldId = String(game?.world?.id || "").trim();
  return worldId ? `worlds/${worldId}` : "";
};

function deepClone(value) {
  if (typeof foundry?.utils?.deepClone === "function") {
    return foundry.utils.deepClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function buildTimestampLabel(date = new Date()) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
    "_",
    padNumber(date.getHours()),
    "-",
    padNumber(date.getMinutes()),
    "-",
    padNumber(date.getSeconds()),
  ].join("");
}

export function buildConfigEnvelope(kind, data, { moduleId = null } = {}) {
  return {
    format: SCIRC_CONFIG_FORMAT,
    version: SCIRC_CONFIG_VERSION,
    kind: String(kind || "").trim(),
    moduleId: moduleId || null,
    exportedAt: new Date().toISOString(),
    data: deepClone(data),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeJsonFileName(fileName, fallbackBaseName) {
  const trimmed = String(fileName || "").trim();
  const fallback = `${String(fallbackBaseName || "scirc-config").trim() || "scirc-config"}-${buildTimestampLabel()}.json`;
  if (!trimmed) return fallback;
  return trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`;
}

function getPathFileName(path) {
  const normalized = String(path || "").trim().replaceAll("\\", "/");
  if (!normalized) return "";
  const segments = normalized.split("/");
  return segments[segments.length - 1] || "";
}

function getPathDirectory(path) {
  const normalized = String(path || "").trim().replaceAll("\\", "/");
  if (!normalized) return DEFAULT_EXPORT_DIRECTORY();
  const separatorIndex = normalized.lastIndexOf("/");
  if (separatorIndex < 0) return DEFAULT_EXPORT_DIRECTORY();
  return normalized.slice(0, separatorIndex) || DEFAULT_EXPORT_DIRECTORY();
}

async function promptForFileName(defaultValue, title) {
  const dialogV2 = foundry?.applications?.api?.DialogV2;
  const content = `
    <form>
      <div class="form-group">
        <label>File Name</label>
        <input type="text" name="file-name" value="${escapeHtml(defaultValue)}" autofocus>
      </div>
    </form>
  `;

  if (dialogV2?.prompt) {
    const result = await dialogV2.prompt({
      rejectClose: false,
      window: { title },
      content,
      ok: {
        label: "Save",
        icon: "fas fa-floppy-disk",
        callback: (_event, button) => String(button?.form?.elements?.["file-name"]?.value || "").trim(),
      },
      cancel: {
        label: "Cancel",
        icon: "fas fa-xmark",
      },
    });

    const fileName = String(result || "").trim();
    if (!fileName) throw new Error("No file selected.");
    return fileName;
  }

  const fallbackValue = window.prompt(title || "File name", defaultValue);
  const fileName = String(fallbackValue || "").trim();
  if (!fileName) throw new Error("No file selected.");
  return fileName;
}

function openFilePicker({ type, current, callback }) {
  return new Promise((resolve, reject) => {
    if (typeof FilePicker !== "function") {
      reject(new Error("Foundry FilePicker is not available."));
      return;
    }

    let settled = false;
    const picker = new FilePicker({
      type,
      current,
      callback: (path, pickerInstance) => {
        settled = true;
        if (typeof callback === "function") {
          resolve(callback(path, pickerInstance));
          return;
        }
        resolve(path);
      },
    });

    const originalClose = picker.close.bind(picker);
    picker.close = async (...args) => {
      const result = await originalClose(...args);
      if (!settled) reject(new Error("No file selected."));
      return result;
    };

    picker.render(true);
  });
}

async function pickFoundryFolder(current = DEFAULT_EXPORT_DIRECTORY()) {
  return openFilePicker({
    type: "folder",
    current,
  });
}

async function pickFoundryJsonFile(current = DEFAULT_EXPORT_DIRECTORY()) {
  return openFilePicker({
    type: "text",
    current,
  });
}

async function readTextFromFoundryPath(path) {
  const request = typeof foundry?.utils?.fetchWithTimeout === "function"
    ? foundry.utils.fetchWithTimeout(path)
    : fetch(path);
  const response = await request;
  if (!response?.ok) {
    throw new Error(`Failed to read ${getPathFileName(path) || "selected file"}.`);
  }
  return response.text();
}

export async function downloadConfigEnvelope(envelope, fileBaseName) {
  const payload = JSON.stringify(envelope, null, 2);
  const defaultFileName = `${String(fileBaseName || "scirc-config").trim() || "scirc-config"}-${buildTimestampLabel()}.json`;
  const directory = await pickFoundryFolder(DEFAULT_EXPORT_DIRECTORY());
  const fileName = normalizeJsonFileName(
    await promptForFileName(defaultFileName, "Save SCIRC Config"),
    fileBaseName
  );
  const file = new File([payload], fileName, { type: "application/json" });

  await FilePicker.upload("data", directory, file, {}, { notify: false });

  return {
    fileName,
    filePath: `${String(directory || "").replace(/\/+$/u, "")}/${fileName}`,
  };
}

export async function promptForConfigEnvelope(expectedKind) {
  const selectedPath = await pickFoundryJsonFile(DEFAULT_EXPORT_DIRECTORY());
  const rawText = await readTextFromFoundryPath(selectedPath);

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Invalid JSON in ${getPathFileName(selectedPath)}.`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Imported file does not contain a valid configuration object.");
  }

  if (parsed.format !== SCIRC_CONFIG_FORMAT) {
    throw new Error("Imported file is not a SCIRC configuration export.");
  }

  if (parsed.version !== SCIRC_CONFIG_VERSION) {
    throw new Error(`Unsupported SCIRC config version: ${parsed.version}.`);
  }

  if (String(parsed.kind || "").trim() !== String(expectedKind || "").trim()) {
    throw new Error("Imported file type does not match this editor.");
  }

  return {
    fileName: getPathFileName(selectedPath),
    filePath: selectedPath,
    directoryPath: getPathDirectory(selectedPath),
    envelope: parsed,
  };
}
