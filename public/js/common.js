import { db, doc, collection, getDocs, deleteDoc, writeBatch } from "./fb.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const SHAPES = ["▲", "◆", "●", "■"];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Clé unique d'un pseudo (sert d'identifiant de document Firestore)
export function pseudoKey(p) {
  return String(p).trim().toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[\/\\.#$\[\]]/g, "-")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 3200);
}

export function fmtDate(ts) {
  try {
    const d = ts && ts.toDate ? ts.toDate() : new Date();
    return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

// Supprime un quiz et tout ce qu'il contient (questions, réponses, joueurs, pseudos)
export async function deleteQuizTree(id) {
  for (const sub of ["questions", "players", "pseudos", "private"]) {
    const snap = await getDocs(collection(db, "quizzes", id, sub));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const b = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
  }
  await deleteDoc(doc(db, "quizzes", id));
}
