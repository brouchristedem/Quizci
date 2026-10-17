import {
  db, ensureAnon, doc, collection, getDoc, getDocs, setDoc, updateDoc,
  onSnapshot, query, where, orderBy, serverTimestamp
} from "./fb.js";
import { $, $$, esc, pseudoKey, SHAPES, toast } from "./common.js";

const KEY = "quizci_session";
const S = { uid: null, quizId: null, quiz: null, me: null, qs: [], hadMe: false, renderedQ: null, timer: null, endAt: 0, sending: false };

const show = (v) => $$(".view").forEach((x) => (x.hidden = x.id !== "v-" + v));
const meRef = () => doc(db, "quizzes", S.quizId, "players", S.uid);
const ordinal = (n) => (n === 1 ? "1er" : n + "e");
const clearTimer = () => { clearInterval(S.timer); S.timer = null; };

// PIN dans l'URL (QR code ou lien WhatsApp)
const pinParam = new URLSearchParams(location.search).get("pin");
if (pinParam) $("#pin").value = pinParam.replace(/\D/g, "").slice(0, 6);

$("#pin").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); });

// Étape 1 : trouver la partie avec le PIN
$("#f-pin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pin = $("#pin").value.trim();
  const err = $("#e-pin");
  err.textContent = "";
  if (pin.length !== 6) { err.textContent = "Le PIN a 6 chiffres."; return; }
  try {
    S.uid = (await ensureAnon()).uid;
    const snap = await getDocs(query(collection(db, "quizzes"), where("pin", "==", pin), where("statut", "in", ["actif", "en_cours"])));
    if (snap.empty) { err.textContent = "PIN introuvable ou partie pas encore ouverte."; return; }
    S.quizId = snap.docs[0].id;
    show("name");
  } catch (ex) {
    console.error(ex);
    err.textContent = "Connexion impossible. Vérifie ta connexion internet.";
  }
});

$("#n-back").addEventListener("click", () => show("pin"));

// Étape 2 : choisir un pseudo et rejoindre
$("#f-name").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#e-name");
  err.textContent = "";
  const pseudo = $("#pseudo").value.trim().replace(/\s+/g, " ");
  const key = pseudoKey(pseudo);
  if (pseudo.length < 2 || pseudo.length > 15 || !key) { err.textContent = "Ton pseudo doit faire entre 2 et 15 caractères."; return; }
  const btn = e.submitter; if (btn) btn.disabled = true;
  try {
    const mine = await getDoc(meRef());
    if (!mine.exists()) {
      try {
        await setDoc(doc(db, "quizzes", S.quizId, "pseudos", key), { uid: S.uid, pseudo });
      } catch (ex) {
        if (ex.code === "permission-denied") { err.textContent = "Ce pseudo est déjà pris, choisis-en un autre."; return; }
        throw ex;
      }
      await setDoc(meRef(), { pseudo, score: 0, lastDelta: 0, lastCorrect: null, joinedAt: serverTimestamp() });
    }
    localStorage.setItem(KEY, JSON.stringify({ quizId: S.quizId }));
    await enter();
  } catch (ex) {
    console.error(ex);
    err.textContent = "Impossible de rejoindre. Réessaie.";
  } finally { if (btn) btn.disabled = false; }
});

// Entrée dans la partie : on écoute l'état du jeu et notre propre fiche joueur
async function enter() {
  S.hadMe = false; S.renderedQ = null; S.me = null; S.quiz = null;
  try {
    const qsnap = await getDocs(query(collection(db, "quizzes", S.quizId, "questions"), orderBy("order")));
    S.qs = qsnap.docs.map((d) => d.data());
  } catch (ex) { S.qs = []; }
  show("wait");
  onSnapshot(doc(db, "quizzes", S.quizId), (s) => { S.quiz = s.data() || null; render(); },
    (ex) => { console.error(ex); toast("Connexion perdue…"); });
  onSnapshot(meRef(), (s) => {
    if (!s.exists()) { if (S.hadMe) kicked(); return; }
    S.hadMe = true; S.me = s.data(); render();
  });
}

function kicked() {
  clearTimer();
  localStorage.removeItem(KEY);
  show("kicked");
}

function render() {
  const q = S.quiz, me = S.me;
  if (!q || !me) return;
  if (q.phase !== "question") clearTimer();
  if (q.statut === "termine" || q.phase === "podium") return end();
  switch (q.phase) {
    case "question": return renderQuestion(q.currentIndex);
    case "reveal": return renderReveal(q.currentIndex);
    case "leaderboard": return renderBoard();
    default:
      S.renderedQ = null;
      $("#w-pseudo").textContent = me.pseudo;
      show("wait");
  }
}

function renderQuestion(idx) {
  const q = S.quiz, me = S.me, ques = S.qs[idx];
  if (!ques) { show("wait"); return; }
  if (me.reponse && me.reponse.q === idx) { clearTimer(); $("#a-msg").textContent = "Réponse envoyée !"; show("answered"); return; }
  if (S.renderedQ !== idx) {
    S.renderedQ = idx;
    $("#p-n").textContent = `Question ${idx + 1} / ${S.qs.length}`;
    $("#p-choices").innerHTML = ques.choices.map((c, k) =>
      `<button class="choice c${k}" data-k="${k}" type="button"><span class="shape">${SHAPES[k]}</span><span>${esc(c)}</span></button>`).join("");
    const limit = q.timePerQuestion || 20;
    S.endAt = Date.now() + limit * 1000;
    clearTimer();
    const tick = () => {
      const left = Math.max(0, (S.endAt - Date.now()) / 1000);
      $("#p-time").textContent = Math.ceil(left);
      $("#p-bar").style.width = (left / limit) * 100 + "%";
      if (left <= 0) {
        clearTimer();
        if (!(S.me && S.me.reponse && S.me.reponse.q === idx)) { $("#a-msg").textContent = "Temps écoulé ⏱"; show("answered"); }
      }
    };
    tick();
    S.timer = setInterval(tick, 200);
  }
  show("question");
}

$("#p-choices").addEventListener("click", async (e) => {
  const b = e.target.closest(".choice");
  if (!b || S.sending || !S.quiz) return;
  if (Date.now() > S.endAt + 500) return;
  S.sending = true;
  try {
    await updateDoc(meRef(), { reponse: { q: S.quiz.currentIndex, c: Number(b.dataset.k) }, reponseAt: serverTimestamp() });
    if (navigator.vibrate) navigator.vibrate(30);
  } catch (ex) { console.error(ex); toast("Erreur, réessaie !"); }
  S.sending = false;
});

function renderReveal(idx) {
  const q = S.quiz, me = S.me;
  const answered = me.reponse && me.reponse.q === idx;
  const ok = answered && me.reponse.c === q.revealed;
  $("#r-card").className = "result " + (ok ? "ok" : "ko");
  $("#r-title").textContent = ok ? "Bonne réponse !" : answered ? "Raté…" : "Pas de réponse";
  $("#r-delta").textContent = ok ? `+${me.lastDelta || 0} pts` : "0 pt";
  $("#r-score").textContent = me.score || 0;
  $("#r-rank").textContent = me.rank ? `Tu es ${ordinal(me.rank)}` : "";
  show("result");
}

function renderBoard() {
  const me = S.me;
  $("#b-score").textContent = me.score || 0;
  $("#b-rank").textContent = me.rank ? `Tu es ${ordinal(me.rank)}` : "";
  show("board");
}

function end() {
  const me = S.me;
  $("#z-score").textContent = me.score || 0;
  $("#z-rank").textContent = me.rank ? `Tu finis ${ordinal(me.rank)}` : "";
  localStorage.removeItem(KEY);
  show("end");
}

const restart = () => { localStorage.removeItem(KEY); location.href = location.pathname; };
$("#w-quit").addEventListener("click", restart);
$("#z-new").addEventListener("click", restart);
$("#k-new").addEventListener("click", restart);

// Reprise automatique après un rechargement de la page
(async () => {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { s = null; }
  if (!s || !s.quizId) { show("pin"); return; }
  try {
    S.uid = (await ensureAnon()).uid;
    S.quizId = s.quizId;
    const mine = await getDoc(meRef());
    if (mine.exists()) { await enter(); return; }
  } catch (ex) { console.error(ex); }
  localStorage.removeItem(KEY);
  show("pin");
})();
