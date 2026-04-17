export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeProfile(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);

  return normalized || "";
}

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function capitalize(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

export function roundToOne(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getCompletionRating(habits) {
  return habits.reduce((total, done) => total + (done ? 1 : 0), 0);
}

export function toStoredRating(rating) {
  return rating >= 1 && rating <= 12 ? rating : null;
}

export function formatCompletionRating(rating) {
  return `${rating}/12`;
}

export function rgbToExcelArgb(hex) {
  const raw = hex.replace("#", "").toUpperCase();
  return `FF${raw}`;
}

export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

export function makeExportFilename(monthValue, extension) {
  const month = (monthValue || "month").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `habit-tracker-${month || "month"}.${extension}`;
}
