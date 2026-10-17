import {
  db, currentUser, googleLogin, doc, collection, getDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, writeBatch, serverTimestamp
} from "./fb.js";
import { ADMIN_EMAIL } from "./config.js";
import { $, $$, esc, pseudoKey, SHAPES, loadScript, toast } from "./common.js";

const qid = new URLSearchParams(location.search).get("q");
const H = { quiz: null, qs: [], answers: [], players: [], key: "", t: null, local: {}, revealing: false, qrDone: false, busy: false };

const show = (v) => $$(".view").forEach((x) => (x.hidden = x.id !== "h-" + v));
const qref = () => doc(db, "quizzes", qid);
const fail = (m) => { $("#err-msg").textContent = m; show("err"); };
const sorted = () => [...H.players].sort((a, b) => (b.score || 0) - (a.score || 0));
const answeredCount = () => H.players.filter((p) => p.reponse && p.reponse.q === H.quiz.currentIndex).length;
const once = (fn) => async () => {
  if (H.busy) return;
  H.busy = true;
  try { await fn(); } catch (e) { console.error(e); toast("Erreur, réessaie."); } finally { H.busy = false; }
};

// ---------- Démarrage ----------
(async () => {
  if (!qid) return fail("Quiz introuvable.");
  const u = await currentUser();
  if (!u || u.isAnonymous) return show("login");
  load(u);
})();

$("#login-btn").addEventListener("click", async () => {
  try { load(await googleLogin()); } catch { toast("Connexion annulée."); }
});

async function load(u) {
  show("load");
  try {
    const s = await getDoc(qref());
    if (!s.exists()) return fail("Quiz introuvable.");
    const q = s.data();
    if (q.ownerId !== u.uid && u.email !== ADMIN_EMAIL) return fail("Ce quiz ne t'appartient pas.");
    if (q.statut === "brouillon") return fail("Ce quiz n'est pas encore activé.");
    const qs = await getDocs(query(collection(db, "quizzes", qid, "questions"), orderBy("order")));
    H.qs = qs.docs.map((d) => d.data());
    const a = await getDoc(doc(db, "quizzes", qid, "private", "answers"));
    H.answers = a.exists() ? a.data().answers : [];
    onSnapshot(qref(), (snap) => { H.quiz = snap.data(); render(); });
    onSnapshot(collection(db, "quizzes", qid, "players"), (snap) => {
      H.players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onPlayers();
    });
  } catch (e) { console.error(e); fail("Erreur de chargement."); }
}

// ---------- Rendu selon la phase ----------
function render() {
  const q = H.quiz;
  if (!q) return;
  if (q.statut === "termine" || q.phase === "podium") return vPodium();
  if (q.phase === "question") return vQuestion();
  if (q.phase === "reveal") return vReveal();
  if (q.phase === "leaderboard") return vBoard();
  vLobby();
}

function onPlayers() {
  const q = H.quiz;
  if (!q) return;
  if (q.statut === "termine" || q.phase === "podium") return vPodium();
  if (q.phase === "leaderboard") return vBoard();
  if (q.phase === "question") {
    const n = answeredCount();
    $("#q-count").textContent = `${n}/${H.players.length} ont répondu`;
    if (H.players.length && n >= H.players.length && !H.revealing) { clearInterval(H.t); setTimeout(doReveal, 700); }
    return;
  }
  if (!q.phase || q.phase === "lobby") vLobby();
}

function vLobby() {
  const q = H.quiz;
  show("lobby");
  H.key = "lobby";
  $("#l-pin").textContent = q.pin || "------";
  $("#l-url").textContent = location.host;
  if (!H.qrDone && q.pin) { H.qrDone = true; makeQR(`${location.origin}/?pin=${q.pin}`); }
  const ps = [...H.players].sort((a, b) => ((a.joinedAt && a.joinedAt.toMillis && a.joinedAt.toMillis()) || 0) - ((b.joinedAt && b.joinedAt.toMillis && b.joinedAt.toMillis()) || 0));
  $("#l-count").textContent = ps.length + " joueur" + (ps.length > 1 ? "s" : "");
  $("#l-players").innerHTML = ps.map((p) => `<span class="chip">${esc(p.pseudo)}<button data-kick="${p.id}" title="Exclure" type="button">×</button></span>`).join("");
  $("#btn-start").disabled = ps.length === 0 || !H.qs.length;
}

async function makeQR(url) {
  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js");
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    const img = new Image();
    img.alt = "QR code";
    img.src = qr.createDataURL(8, 2);
    $("#l-qr").innerHTML = "";
    $("#l-qr").appendChild(img);
  } catch (e) { console.warn("QR indisponible", e); }
}

$("#l-players").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-kick]");
  if (!b) return;
  const p = H.players.find((x) => x.id === b.dataset.kick);
  if (!p || !confirm(`Exclure « ${p.pseudo} » ?`)) return;
  try {
    await deleteDoc(doc(db, "quizzes", qid, "players", p.id));
    await deleteDoc(doc(db, "quizzes", qid, "pseudos", pseudoKey(p.pseudo)));
  } catch (err) { console.error(err); toast("Impossible d'exclure ce joueur."); }
});

$("#btn-start").addEventListener("click", once(() => startQuestion(0)));

async function startQuestion(i) {
  H.revealing = false;
  H.local[i] = Date.now();
  await updateDoc(qref(), { statut: "en_cours", phase: "question", currentIndex: i, questionStartedAt: serverTimestamp(), revealed: null, counts: null });
}

function vQuestion() {
  const q = H.quiz, i = q.currentIndex, ques = H.qs[i];
  if (!ques) return;
  show("question");
  const key = "q" + i;
  if (H.key !== key) {
    H.key = key;
    H.revealing = false;
    $("#q-n").textContent = `Question ${i + 1} / ${H.qs.length}`;
    $("#q-text").textContent = ques.text;
    $("#q-tiles").innerHTML = ques.choices.map((c, k) => `<div class="tile c${k}"><span class="shape">${SHAPES[k]}</span><span>${esc(c)}</span></div>`).join("");
    const limit = q.timePerQuestion || 20;
    const start = H.local[i] || (q.questionStartedAt && q.questionStartedAt.toMillis ? q.questionStartedAt.toMillis() : Date.now());
    H.local[i] = start;
    clearInterval(H.t);
    const tick = () => {
      const left = Math.max(0, limit - (Date.now() - start) / 1000);
      $("#q-time").textContent = Math.ceil(left);
      $("#q-bar").style.width = (left / limit) * 100 + "%";
      if (left <= 0) { clearInterval(H.t); setTimeout(doReveal, 1200); }
    };
    tick();
    H.t = setInterval(tick, 200);
  }
  $("#q-count").textContent = `${answeredCount()}/${H.players.length} ont répondu`;
}

// Calcule les points (jusqu'à 1000, moins si la réponse est tardive) puis révèle la bonne réponse
async function doReveal() {
  const q = H.quiz;
  if (!q || H.revealing || q.phase !== "question") return;
  H.revealing = true;
  clearInterval(H.t);
  const i = q.currentIndex, limit = q.timePerQuestion || 20, n = H.qs[i].choices.length, correct = H.answers[i];
  const start = q.questionStartedAt && q.questionStartedAt.toMillis ? q.questionStartedAt.toMillis() : H.local[i];
  const counts = Array(n).fill(0);

  const rows = H.players.map((p) => {
    let delta = 0, ok = false;
    const r = p.reponse;
    if (r && r.q === i && r.c >= 0 && r.c < n) {
      counts[r.c]++;
      if (r.c === correct) {
        const t = p.reponseAt && p.reponseAt.toMillis ? p.reponseAt.toMillis() : null;
        const el = t ? (t - start) / 1000 : limit;
        if (el <= limit + 1.5) {
          const e = Math.min(Math.max(el, 0), limit);
          delta = Math.round(1000 * (1 - e / limit / 2));
          ok = true;
        }
      }
    }
    return { id: p.id, score: (p.score || 0) + delta, delta, ok };
  });
  const rank = {};
  [...rows].sort((a, b) => b.score - a.score).forEach((r, k) => (rank[r.id] = k + 1));

  for (let k = 0; k < rows.length; k += 400) {
    const b = writeBatch(db);
    rows.slice(k, k + 400).forEach((r) =>
      b.update(doc(db, "quizzes", qid, "players", r.id), { score: r.score, lastDelta: r.delta, lastCorrect: r.ok, rank: rank[r.id] }));
    await b.commit();
  }
  await updateDoc(qref(), { phase: "reveal", revealed: correct, counts });
}

function vReveal() {
  const q = H.quiz, i = q.currentIndex, ques = H.qs[i];
  if (!ques) return;
  show("reveal");
  H.key = "r" + i;
  const counts = q.counts || [];
  $("#r-text").textContent = ques.text;
  $("#r-tiles").innerHTML = ques.choices.map((c, k) =>
    `<div class="tile c${k} ${k === q.revealed ? "good" : "dim"}"><span class="shape">${k === q.revealed ? "✓" : SHAPES[k]}</span><span>${esc(c)}</span><span class="cnt">${counts[k] || 0}</span></div>`).join("");
}

$("#btn-board").addEventListener("click", once(() => updateDoc(qref(), { phase: "leaderboard" })));

function vBoard() {
  const q = H.quiz;
  show("board");
  const last = q.currentIndex >= H.qs.length - 1;
  const top = sorted().slice(0, 5);
  const max = Math.max(1, (top[0] && top[0].score) || 1);
  $("#b-list").innerHTML = top.map((p, k) =>
    `<div class="lb-row"><i style="width:${Math.max(4, ((p.score || 0) / max) * 100)}%"></i><span>${k + 1}</span><span class="nm">${esc(p.pseudo)}</span><span>${p.score || 0}</span></div>`).join("") || `<p class="muted">Aucun joueur</p>`;
  $("#btn-next").textContent = last ? "Voir le podium 🏆" : "Question suivante →";
}

$("#btn-next").addEventListener("click", once(async () => {
  const next = H.quiz.currentIndex + 1;
  if (next >= H.qs.length) await updateDoc(qref(), { phase: "podium", statut: "termine" });
  else await startQuestion(next);
}));

function vPodium() {
  show("podium");
  clearInterval(H.t);
  const s = sorted();
  const medals = ["🥇", "🥈", "🥉"];
  const col = (p, k) => p ? `<div class="pod p${k + 1}"><div class="medal">${medals[k]}</div><div class="nm">${esc(p.pseudo)}</div><div class="sc">${p.score || 0} pts</div></div>` : "";
  $("#p-top").innerHTML = [col(s[1], 1), col(s[0], 0), col(s[2], 2)].join("");
  $("#p-rest").innerHTML = s.slice(3).map((p, k) =>
    `<div class="lb-row"><span>${k + 4}</span><span class="nm">${esc(p.pseudo)}</span><span>${p.score || 0}</span></div>`).join("");
}
