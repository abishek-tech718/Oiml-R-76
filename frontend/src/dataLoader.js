export async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return parseCsv(await response.text());
}

export function parseCsv(text) {
  const rows = [];
  let current = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      current.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      current.push(value);
      if (current.some((item) => item.trim() !== "")) rows.push(current);
      current = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || current.length) {
    current.push(value);
    rows.push(current);
  }

  const headers = rows.shift().map((header) => header.trim());
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

export function numberValue(value) {
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
