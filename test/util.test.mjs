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
