// Petits utilitaires sans Firebase (utilisables partout, y compris dans les tests)
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const COULEURS = ["c0", "c1", "c2", "c3"];
export const LETTRES = ["A", "B", "C", "D"];
// Taille de police adaptée à la longueur du texte : "" (court), "t2" (moyen), "t3" (long)
export const fit = (t, a = 80, b = 140) => { const n = typeof t === "number" ? t : String(t ?? "").length; return n > b ? "t3" : n > a ? "t2" : ""; };

export const ord = (n) => (n ? n + (n === 1 ? "er" : "ème") : "–");
export const fmt = (n) => (n || 0).toLocaleString("fr-FR");

// Points d'une bonne réponse : 1000 si instantanée, 500 si à la dernière seconde (el et limit dans la même unité)
export const points = (el, limit) => Math.round(1000 * (1 - Math.min(Math.max(el, 0), limit) / limit / 2));

// Clé unique d'un pseudo (identifiant du document qui réserve le pseudo) : "Léa", "lea" et " LEA " donnent la même clé.
// Renvoie "" si le pseudo ne contient ni lettre ni chiffre.
export function pseudoKey(p) {
  const k = String(p ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[\/\\.#$\[\]%]/g, "-")
    .slice(0, 40);
  return k.replace(/[-_]/g, "") ? k : "";
}
