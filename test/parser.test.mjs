import { parseQuiz, MODELE } from "../public/js/parser.js";
import assert from "node:assert/strict";

// 1. Le modèle fourni doit être parsé sans erreur
let r = parseQuiz(MODELE);
assert.equal(r.erreurs.length, 0, r.erreurs.join("|"));
assert.equal(r.titre, "Quiz de géographie");
assert.equal(r.temps, 20);
assert.equal(r.questions.length, 2);
assert.equal(r.questions[0].bonne, 0);
assert.deepEqual(r.questions[1].choix, ["Vrai", "Faux"]);

// 2. Texte type "PDF" : lignes multiples, accents, casse, espaces
r = parseQuiz(`titre : Test\nTemps: 5\nQ1) Une question\nsur deux lignes ?\nA. Un\nB. Deux\ntrès long\nC. Trois\nRéponse : c\n\nQ2: Autre\nA) x\nB) y\nREPONSE: B`);
assert.equal(r.erreurs.length, 0, r.erreurs.join("|"));
assert.equal(r.temps, 5);
assert.equal(r.questions[0].texte, "Une question sur deux lignes ?");
assert.equal(r.questions[0].choix[1], "Deux très long");
assert.equal(r.questions[0].bonne, 2);

// 3. Erreurs détectées
r = parseQuiz("Q1: Sans choix\nREPONSE: A");
assert.ok(r.erreurs.length > 0);
r = parseQuiz("Q1: Ok\nA) a\nB) b\n");
assert.ok(r.erreurs.some((e) => e.includes("REPONSE")));
r = parseQuiz("n'importe quoi");
assert.ok(r.erreurs.length > 0);

// 4. Limite du nombre de questions
const many = Array.from({ length: 31 }, (_, i) => `Q${i + 1}: q\nA) a\nB) b\nREPONSE: A`).join("\n");
assert.ok(parseQuiz(many).erreurs.some((e) => e.includes("Maximum")));
const ok30 = Array.from({ length: 30 }, (_, i) => `Q${i + 1}: q\nA) a\nB) b\nREPONSE: A`).join("\n");
assert.ok(!parseQuiz(ok30).erreurs.some((e) => e.includes("Maximum")));

console.log("parser OK");
