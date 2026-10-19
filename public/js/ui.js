// Écrans du téléphone (joueur). Utilisés par la vraie partie (index.html) ET par le mode test du créateur (host.html),
// pour que le test montre exactement ce que verront les joueurs.
import { esc, COULEURS, LETTRES, fit, ord, fmt } from "./util.js";

export const footHTML = (pseudo, r = {}) =>
  `<div class="sfoot"><span>${esc(pseudo)}</span><span>${r.rank ? ord(r.rank) + " · " : ""}${fmt(r.score)} pts</span></div>`;

// Question : minuscule rappel de la question + 4 gros boutons colorés. Un seul appui = réponse envoyée.
export function questionHTML({ i, total, temps, q, foot }) {
  const longest = Math.max(...q.choix.map((c) => c.length));
  const word = Math.max(...q.choix.flatMap((c) => c.split(/\s+/).map((w) => w.length)));
  const w = word > 14 ? " w2" : word > 10 ? " w1" : longest <= 14 ? " s" : "";
  return `<div class="shead"><span class="pill">Question ${i + 1}/${total}</span><div class="timer" id="t">${temps}</div></div>
    <div class="tbar"><i id="tb"></i></div>
    <div class="qbox ${fit(q.texte, 80, 140)}">${esc(q.texte)}</div>
    <div class="choices fit ${fit(longest, 40, 80)}${w}" data-n="${q.choix.length}">${q.choix.map((c, k) =>
      `<button class="choice ${COULEURS[k]}" data-k="${k}" type="button"><small>${LETTRES[k]}</small><span class="ct">${esc(c)}</span></button>`).join("")}</div>${foot}`;
}

export const sentHTML = (c, foot) =>
  `<div class="sent ${COULEURS[c] || ""}"><div class="bl">${LETTRES[c] || "✓"}</div><h2>Réponse envoyée</h2><p>Regarde l'écran…</p></div>${foot}`;

export const lateHTML = (foot) =>
  `<div class="sent"><div class="bl">⏱</div><h2>Temps écoulé</h2><p>Regarde l'écran…</p></div>${foot}`;

export const waitResultHTML = (foot) =>
  `<div class="sent"><div class="bl">…</div><h2>Résultat en cours</h2></div>${foot}`;

// r = { ok, last, score, rank } ; rank absent (mode test) => pas de bloc classement
export function resultHTML({ answered, r, foot, test }) {
  const cls = r.ok ? "ok" : answered ? "ko" : "none";
  return `<div class="res ${cls}">
    <div class="rt">${r.ok ? "Bonne réponse !" : answered ? "Raté…" : "Pas de réponse"}</div>
    <div class="rp">${r.ok ? "+" + fmt(r.last) + " pts" : "0 pt"}</div>
    ${r.rank ? `<div class="rk"><small>Ton classement</small><b>${ord(r.rank)}</b></div>` : ""}
    <div class="rs">${fmt(r.score)} pts au total</div>${test ? `<div id="test-next"></div>` : ""}</div>${foot}`;
}

export const endHTML = ({ r, foot, button }) =>
  `<div class="res fin"><div class="rt">Partie terminée</div>
    ${r.rank ? `<div class="rk"><small>Ton classement final</small><b>${ord(r.rank)}</b></div>` : ""}
    <div class="rs">${fmt(r.score)} pts</div>${button || ""}</div>${foot}`;

export const waitHTML = (foot) =>
  `<div class="sent"><div class="bl">🎮</div><h2>Tu es dans la partie !</h2><p>Regarde l'écran, ça va bientôt commencer.</p></div>${foot}`;

export const kickedHTML = () =>
  `<div class="sent"><div class="bl">🚪</div><h2>Tu as été retiré de la partie</h2><p>L'animateur t'a exclu.</p><button class="cta" onclick="location.reload()">Retour</button></div>`;
