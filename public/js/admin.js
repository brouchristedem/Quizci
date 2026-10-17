import {
  auth, db, currentUser, googleLogin, signOut, doc, collection, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "./fb.js";
import { ADMIN_EMAIL, PRICE_FCFA } from "./config.js";
import { $, $$, esc, toast, fmtDate, deleteQuizTree } from "./common.js";

const show = (v) => $$(".view").forEach((x) => (x.hidden = x.id !== "a-" + v));
const STAT = {
  brouillon: ["À activer", "b-wait"],
  actif: ["Actif", "b-ok"],
  en_cours: ["En cours", "b-live"],
  termine: ["Terminé", "b-done"]
};
let ALL = [], filter = "all", term = "";

(async () => {
  const u = await currentUser();
  if (!u || u.isAnonymous) return show("login");
  gate(u);
})();

$("#a-login-btn").addEventListener("click", async () => {
  try { gate(await googleLogin()); } catch { toast("Connexion annulée."); }
});
const logout = async () => { await signOut(auth); location.reload(); };
$("#a-switch").addEventListener("click", logout);
$("#a-out").addEventListener("click", logout);

function gate(u) {
  if (u.email !== ADMIN_EMAIL) return show("deny");
  show("main");
  onSnapshot(query(collection(db, "quizzes"), orderBy("createdAt", "desc")),
    (snap) => { ALL = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (e) => { console.error(e); toast("Erreur de chargement."); });
}

function render() {
  const n = (s) => ALL.filter((q) => s.includes(q.statut)).length;
  $("#s-total").textContent = ALL.length;
  $("#s-wait").textContent = n(["brouillon"]);
  $("#s-live").textContent = n(["actif", "en_cours"]);
  $("#s-done").textContent = n(["termine"]);
  $("#s-rev").textContent = (n(["actif", "en_cours", "termine"]) * PRICE_FCFA).toLocaleString("fr-FR");

  const groups = { all: null, wait: ["brouillon"], live: ["actif", "en_cours"], done: ["termine"] };
  const t = term.trim().toLowerCase();
  const rows = ALL.filter((q) =>
    (!groups[filter] || groups[filter].includes(q.statut)) &&
    (!t || [q.id, q.title, q.ownerEmail].some((x) => String(x || "").toLowerCase().includes(t))));

  $("#a-list").innerHTML = rows.map((q) => {
    const [label, cls] = STAT[q.statut] || ["?", "b-done"];
    let actions = "";
    if (q.statut === "brouillon") actions += `<button class="btn good sm" data-act="on" data-id="${q.id}" type="button">Rendre actif</button>`;
    if (q.statut === "actif") actions += `<span class="pinline">PIN ${esc(q.pin)}</span><button class="btn sec sm" data-act="off" data-id="${q.id}" type="button">Désactiver</button>`;
    if (q.statut === "en_cours") actions += `<span class="pinline">PIN ${esc(q.pin)}</span>`;
    actions += `<button class="btn danger sm" data-act="del" data-id="${q.id}" type="button">Supprimer</button>`;
    return `<div class="qcard">
      <div class="qc-head"><b>${esc(q.title)}</b><span class="badge ${cls}">${label}</span></div>
      <div class="muted">${esc(q.ownerEmail || "—")} · ${q.questionCount || 0} questions · ${fmtDate(q.createdAt)}</div>
      <div class="idline muted">ID : <code>${q.id}</code> <button class="btn sec sm" data-act="copy" data-id="${q.id}" type="button">Copier</button></div>
      <div class="qc-actions">${actions}</div>
    </div>`;
  }).join("") || `<p class="muted">Aucun quiz.</p>`;
}

$("#a-search").addEventListener("input", (e) => { term = e.target.value; render(); });
$("#a-tabs").addEventListener("click", (e) => {
  const b = e.target.closest(".tab");
  if (!b) return;
  filter = b.dataset.f;
  $$(".tab").forEach((x) => x.classList.toggle("on", x === b));
  render();
});

function newPin() {
  const used = new Set(ALL.filter((q) => q.statut === "actif" || q.statut === "en_cours").map((q) => q.pin));
  let pin;
  do { pin = String(100000 + Math.floor(Math.random() * 900000)); } while (used.has(pin));
  return pin;
}

$("#a-list").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = b.dataset.id, q = ALL.find((x) => x.id === id);
  try {
    if (b.dataset.act === "copy") { await navigator.clipboard.writeText(id); return toast("ID copié."); }
    if (b.dataset.act === "on") {
      if (!confirm(`Le paiement de ${PRICE_FCFA} F est bien reçu pour « ${q.title} » ?`)) return;
      await updateDoc(doc(db, "quizzes", id), { statut: "actif", pin: newPin(), phase: "lobby", currentIndex: -1, activatedAt: serverTimestamp() });
      toast("Quiz activé ✅");
    }
    if (b.dataset.act === "off") {
      if (!confirm("Désactiver ce quiz ?")) return;
      await updateDoc(doc(db, "quizzes", id), { statut: "brouillon", pin: null });
      toast("Quiz désactivé.");
    }
    if (b.dataset.act === "del") {
      if (!confirm(`Supprimer définitivement « ${q.title} » ?`)) return;
      await deleteQuizTree(id);
      toast("Quiz supprimé.");
    }
  } catch (err) { console.error(err); toast("Action impossible."); }
});
