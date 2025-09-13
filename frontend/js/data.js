// js/data.js
const LS_KEY = "userTokensV1";

function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now();
}

async function loadCatalog(url = "assets/sample/tokens.json") {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("catalog fetch failed");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("No catalog or fetch error:", e.message);
    return [];
  }
}

function loadUserTokens() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveUserToken(token) {
  const arr = loadUserTokens();
  arr.unshift(token);
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function clearAllUserTokens() {
  localStorage.removeItem(LS_KEY);
}

function mergeTokens(catalog = [], user = []) {
  const seen = new Set();
  const out = [];

  for (const t of [...user, ...catalog]) {
    const key = (t.mint?.toLowerCase?.() || t.id || uid()) + "";
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function formatPrice(x){
  const n = Number(x);
  if (Number.isNaN(n)) return "—";
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function short(text, n=120){
  if (!text) return "";
  const s = String(text);
  return s.length > n ? s.slice(0, n-1) + "…" : s;
}

window.DataAPI = {
  uid,
  loadCatalog,
  loadUserTokens,
  saveUserToken,
  clearAllUserTokens,
  mergeTokens,
  formatPrice,
  short
};
