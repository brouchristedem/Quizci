import {
  auth, db, currentUser, googleLogin, signOut, doc, collection, setDoc,
  onSnapshot, query, where, writeBatch, serverTimestamp
} from "./fb.js";
import { ADMIN_WHATSAPP, MAX_QUESTIONS, PRICE_FCFA } from "./config.js";
import { parseQuizText } from "./parser.js";
import { $, $$, esc, toast, fmtDate, SHAPES, loadScript, deleteQuizTree } from "./common.js";

const show = (v) => $$(".view").forEach((x) => (x.hidden = x.id !== "t-" + v));
const STAT = {
  brouillon: ["En attente d'activation", "b-wait"],
  actif: ["Prêt à jouer", "b-ok"],
  en_cours: ["En cours", "b-live"],
  termine: ["Terminé", "b-done"]
};
const blank = () => ({ text: "", choices: ["", "", "", ""], correct: -1 });
let USER = null, QUIZZES = [], unsub = null;
let E = { title: "", time: 20, questions: [] };

// ---------- Connexion ----------
(async () => {
  USER = await currentUser();
  if (!USER || USER.isAnonymous) return show("login");
  start();
})();

$("#t-login-btn").addEventListener("click", async () => {
  try { USER = await googleLogin(); start(); } catch { toast("Connexion annulée."); }
});
$("#t-out").addEventListener("click", async () => { await signOut(auth); location.reload(); });

function start() {
  $("#t-user").textContent = USER.displayName || USER.email;
  show("list");
  if (unsub) unsub();
  unsub = onSnapshot(query(collection(db, "quizzes"), where("ownerId", "==", USER.uid)),
    (snap) => { QUIZZES = snap.docs.map((d) => ({ id: d.id, ...d.data() })); renderList(); },
    (e) => { console.error(e); toast("Impossible de charger tes quiz."); });
}

// ---------- Liste des quiz ----------
function waLink(q) {
  const msg = `Bonjour, je souhaite activer mon quiz sur Quizci.\nTitre : ${q.title}\nID du quiz : ${q.id}\nMontant : ${PRICE_FCFA} F`;
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

function renderList() {
  const ms = (q) => (q.createdAt && q.createdAt.toMillis ? q.createdAt.toMillis() : Date.now());
  const list = [...QUIZZES].sort((a, b) => ms(b) - ms(a));
  $("#t-cards").innerHTML = list.map((q) => {
    const [label, cls] = STAT[q.statut] || ["?", "b-done"];
    let actions = "";
    if (q.statut === "brouillon") {
      actions = `<a class="btn sm" target="_blank" rel="noopener" href="${waLink(q)}">Activer mon quiz (${PRICE_FCFA} F)</a>
                 <button class="btn danger sm" data-act="del" data-id="${q.id}" type="button">Supprimer</button>`;
    } else if (q.statut === "actif") {
      actions = `<div class="pinline" style="width:100%">PIN : ${esc(q.pin)}</div>
                 <a class="btn good sm" href="host.html?q=${q.id}">Lancer la partie</a>`;
    } else if (q.statut === "en_cours") {
      actions = `<div class="pinline" style="width:100%">PIN : ${esc(q.pin)}</div>
                 <a class="btn good sm" href="host.html?q=${q.id}">Reprendre la partie</a>`;
    }
    return `<div class="qcard">
      <div class="qc-head"><b>${esc(q.title)}</b><span class="badge ${cls}">${label}</span></div>
      <div class="muted">${q.questionCount || 0} questions · ${q.timePerQuestion || 20} s · ${fmtDate(q.createdAt)}</div>
      <div class="qc-actions">${actions}</div>
    </div>`;
  }).join("") || `<p class="muted">Tu n'as pas encore de quiz. Clique sur « Créer un quiz ».</p>`;
}

$("#t-cards").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act='del']");
  if (!b || !confirm("Supprimer ce quiz ?")) return;
  try { await deleteQuizTree(b.dataset.id); toast("Quiz supprimé."); }
  catch (err) { console.error(err); toast("Suppression impossible."); }
});

// ---------- Éditeur ----------
$("#t-new").addEventListener("click", () => {
  E = { title: "", time: 20, questions: [blank()] };
  $("#e-warn").innerHTML = "";
  $("#e-paste").value = "";
  $("#e-pdf").value = "";
  renderEditor();
  show("edit");
});
$("#e-cancel").addEventListener("click", () => show("list"));
$("#e-title").addEventListener("input", (e) => { E.title = e.target.value; });
$("#e-time").addEventListener("input", (e) => { E.time = Number(e.target.value) || 20; });

function renderEditor() {
  $("#e-title").value = E.title;
  $("#e-time").value = E.time;
  $("#e-count").textContent = `${E.questions.length}/${MAX_QUESTIONS} questions`;
  $("#e-list").innerHTML = E.questions.map((q, i) => `
    <div class="eq" data-i="${i}">
      <div class="eq-h"><b>Question ${i + 1}</b><button class="btn danger sm" data-del="${i}" type="button">Supprimer</button></div>
      <textarea data-f="text" rows="2" placeholder="Texte de la question">${esc(q.text)}</textarea>
      ${q.choices.map((c, k) => `
        <label class="ch">
          <input type="radio" name="c${i}" data-f="correct" value="${k}" ${q.correct === k ? "checked" : ""} title="Bonne réponse">
          <span class="shape-s c${k}">${SHAPES[k]}</span>
          <input data-f="choice" data-k="${k}" value="${esc(c)}" maxlength="120" placeholder="Choix ${"ABCD"[k]}${k < 2 ? "" : " (facultatif)"}">
        </label>`).join("")}
      <p class="muted" style="margin:8px 0 0">Coche le rond de la bonne réponse.</p>
    </div>`).join("");
}

$("#e-list").addEventListener("input", (e) => {
  const card = e.target.closest(".eq");
  if (!card) return;
  const q = E.questions[Number(card.dataset.i)];
  if (e.target.dataset.f === "text") q.text = e.target.value;
  if (e.target.dataset.f === "choice") q.choices[Number(e.target.dataset.k)] = e.target.value;
});
$("#e-list").addEventListener("change", (e) => {
  if (e.target.dataset.f === "correct") E.questions[Number(e.target.closest(".eq").dataset.i)].correct = Number(e.target.value);
});
$("#e-list").addEventListener("click", (e) => {
  const d = e.target.closest("[data-del]");
  if (!d) return;
  E.questions.splice(Number(d.dataset.del), 1);
  renderEditor();
});
$("#e-add").addEventListener("click", () => {
  if (E.questions.length >= MAX_QUESTIONS) return toast(`Maximum ${MAX_QUESTIONS} questions par quiz.`);
  E.questions.push(blank());
  renderEditor();
});

// ---------- Import PDF / texte collé ----------
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";

async function pdfToText(file) {
  if (!window.pdfjsLib) {
    await loadScript(PDFJS + "pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
  }
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    const lines = [];
    let cur = "", lastY = null;
    for (const it of content.items) {
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(cur); cur = ""; }
      cur += it.str;
      if (it.hasEOL) { lines.push(cur); cur = ""; }
      lastY = y;
    }
    lines.push(cur);
    pages.push(lines.join("\n"));
  }
  return pages.join("\n");
}

function applyParsed(p) {
  const warns = [...p.warnings];
  if (p.title) E.title = p.title;
  if (p.time) E.time = Math.min(120, Math.max(5, p.time));
  let qs = p.questions;
  if (qs.length > MAX_QUESTIONS) { warns.push(`Seules les ${MAX_QUESTIONS} premières questions sont gardées.`); qs = qs.slice(0, MAX_QUESTIONS); }
  E.questions = qs.map((q) => ({ text: q.text, choices: [...q.choices, "", "", "", ""].slice(0, 4), correct: q.correct }));
  renderEditor();
  $("#e-warn").innerHTML = warns.length ? `<div class="warn"><b>À vérifier :</b><ul>${warns.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : "";
  toast(`${qs.length} question${qs.length > 1 ? "s" : ""} détectée${qs.length > 1 ? "s" : ""}.`);
}

$("#e-pdf").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  $("#e-warn").innerHTML = `<div class="warn">Lecture du PDF…</div>`;
  try {
    const text = await pdfToText(f);
    const p = parseQuizText(text);
    if (!p.questions.length) {
      $("#e-warn").innerHTML = `<div class="warn">Aucune question détectée. Le PDF est peut-être scanné (photo) ou n'utilise pas le modèle. Utilise le modèle, ou colle ton texte ci-dessus.</div>`;
      return;
    }
    applyParsed(p);
  } catch (err) {
    console.error(err);
    $("#e-warn").innerHTML = `<div class="warn">Impossible de lire ce PDF. Colle ton texte à la place.</div>`;
  }
});

$("#e-parse").addEventListener("click", () => {
  const p = parseQuizText($("#e-paste").value);
  if (!p.questions.length) { $("#e-warn").innerHTML = `<div class="warn">Aucune question détectée. Vérifie le format (Q1:, A), B), REPONSE:).</div>`; return; }
  applyParsed(p);
});

// ---------- Enregistrement ----------
function validate() {
  const errs = [];
  if (!E.title.trim()) errs.push("Donne un titre à ton quiz.");
  if (!E.questions.length) errs.push("Ajoute au moins une question.");
  E.questions.forEach((q, i) => {
    const filled = q.choices.map((c, k) => ({ c: c.trim(), k })).filter((x) => x.c);
    if (!q.text.trim()) errs.push(`Question ${i + 1} : écris la question.`);
    if (filled.length < 2) errs.push(`Question ${i + 1} : au moins 2 choix.`);
    if (!filled.some((x) => x.k === q.correct)) errs.push(`Question ${i + 1} : coche la bonne réponse.`);
  });
  return errs;
}

$("#e-save").addEventListener("click", async () => {
  const errs = validate();
  if (errs.length) {
    $("#e-warn").innerHTML = `<div class="warn"><b>Corrige avant d'enregistrer :</b><ul>${errs.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const btn = $("#e-save");
  btn.disabled = true;
  try {
    const cleaned = E.questions.map((q) => {
      const choices = [];
      let correct = 0;
      q.choices.forEach((c, k) => { if (c.trim()) { if (k === q.correct) correct = choices.length; choices.push(c.trim()); } });
      return { text: q.text.trim(), choices, correct };
    });
    const ref = doc(collection(db, "quizzes"));
    await setDoc(ref, {
      ownerId: USER.uid, ownerEmail: USER.email || "", title: E.title.trim(),
      timePerQuestion: Math.min(120, Math.max(5, E.time || 20)), questionCount: cleaned.length,
      statut: "brouillon", createdAt: serverTimestamp()
    });
    const b = writeBatch(db);
    cleaned.forEach((q, i) => b.set(doc(db, "quizzes", ref.id, "questions", String(i).padStart(2, "0")), { order: i, text: q.text, choices: q.choices }));
    b.set(doc(db, "quizzes", ref.id, "private", "answers"), { answers: cleaned.map((q) => q.correct) });
    await b.commit();
    toast("Quiz enregistré ! Clique sur « Activer mon quiz » pour le payer.");
    show("list");
  } catch (err) {
    console.error(err);
    toast("Erreur à l'enregistrement. Réessaie.");
  } finally { btn.disabled = false; }
});
