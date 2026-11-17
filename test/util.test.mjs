import { pseudoKey, points, fit, ord } from "../public/js/util.js";
import assert from "node:assert/strict";

// Pseudos : même clé pour les variantes d'un même nom (c'est ce qui bloque les doublons)
assert.equal(pseudoKey("Léa"), pseudoKey(" lea "));
assert.equal(pseudoKey("LÉA"), pseudoKey("lea"));
assert.equal(pseudoKey("Jean  Marc"), "jean_marc");
assert.notEqual(pseudoKey("Moussa"), pseudoKey("Moussa2"));
// Caractères interdits dans un identifiant Firestore
assert.ok(!/[\/.#$\[\]]/.test(pseudoKey("a/b.c#d$e[f]g")));
// Pseudo sans lettre ni chiffre : refusé
assert.equal(pseudoKey("..."), "");
assert.equal(pseudoKey("  "), "");
assert.equal(pseudoKey("--"), "");
assert.ok(pseudoKey("😀😀").length > 0);

// Points : 1000 si instantané, 500 à la dernière seconde, jamais en dehors de [500, 1000]
assert.equal(points(0, 20000), 1000);
assert.equal(points(20000, 20000), 500);
assert.equal(points(10000, 20000), 750);
assert.equal(points(-5, 20000), 1000);
assert.equal(points(99999, 20000), 500);

assert.equal(fit("court"), "");
assert.equal(fit("x".repeat(100)), "t2");
assert.equal(fit("x".repeat(200)), "t3");
assert.equal(ord(1), "1er");
assert.equal(ord(3), "3ème");
console.log("util OK");

// Mode « couleurs seulement » : une forme et un nom de couleur par bouton, et rien d'autre à l'écran du téléphone
import { FORMES, NOMS_COULEURS, COULEURS } from "../public/js/util.js";
import { questionHTML, sentHTML } from "../public/js/ui.js";
assert.equal(FORMES.length, COULEURS.length);
assert.equal(NOMS_COULEURS.length, COULEURS.length);
{
  const q = { texte: "Capitale de la Côte d'Ivoire ?", choix: ["Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro"] };
  const html = questionHTML({ i: 0, total: 5, temps: 20, q, foot: "", couleurs: true });
  assert.ok(!html.includes("Capitale") && !/Abidjan|Yamoussoukro|Bouaké|San-Pédro/.test(html), "aucun texte de question ou de réponse");
  assert.equal((html.match(/class="choice /g) || []).length, 4);
  FORMES.forEach((f) => assert.ok(html.includes(f)));
  assert.ok(questionHTML({ i: 0, total: 5, temps: 20, q, foot: "" }).includes("Abidjan"), "mode normal inchangé");
  assert.ok(sentHTML(2, "", true).includes(FORMES[2]) && sentHTML(2, "").includes("C"));
}
