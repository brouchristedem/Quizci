// Parse le texte d'un quiz au format Quizci (voir modèle) -> { titre, temps, questions, erreurs }
export const MODELE = `TITRE: Quiz de géographie
TEMPS: 20

Q1: Quelle est la capitale économique de la Côte d'Ivoire ?
A) Abidjan
B) Yamoussoukro
C) Bouaké
D) San-Pédro
REPONSE: A

Q2: Le fleuve Bandama se trouve en Côte d'Ivoire.
A) Vrai
B) Faux
REPONSE: A
`;

export function parseQuiz(text, max = 30) {
  const erreurs = [];
  const out = { titre: "", temps: 20, questions: [], erreurs };
  let cur = null;
  const lignes = String(text || "").replace(/ /g, " ").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const fermer = () => {
    if (!cur) return;
    const n = out.questions.length + 1;
    if (!cur.texte) erreurs.push(`Q${n} : question vide`);
    else if (cur.choix.length < 2) erreurs.push(`Q${n} : il faut au moins 2 choix (A, B...)`);
    else if (cur.choix.length > 4) erreurs.push(`Q${n} : maximum 4 choix`);
    else if (cur.bonne == null || cur.bonne >= cur.choix.length) erreurs.push(`Q${n} : ligne REPONSE manquante ou invalide`);
    out.questions.push(cur);
    cur = null;
  };

  for (const l of lignes) {
    let m;
    if ((m = l.match(/^TITRE\s*[:：]\s*(.+)$/i))) { out.titre = m[1].trim(); continue; }
    if ((m = l.match(/^TEMPS\s*[:：]\s*(\d+)/i))) { out.temps = Math.min(60, Math.max(5, +m[1])); continue; }
    if ((m = l.match(/^Q\s*\d+\s*[:.)\-–]\s*(.*)$/i))) { fermer(); cur = { texte: m[1].trim(), choix: [], bonne: null }; continue; }
    if (!cur) continue;
    if ((m = l.match(/^R[ÉE]PONSE\s*[:：]\s*([A-D])/i))) { cur.bonne = "ABCD".indexOf(m[1].toUpperCase()); continue; }
    if ((m = l.match(/^([A-D])\s*[).:\-–]\s*(.+)$/i)) && "ABCD".indexOf(m[1].toUpperCase()) === cur.choix.length) {
      cur.choix.push(m[2].trim());
      continue;
    }
    // ligne de continuation
    if (cur.choix.length === 0) cur.texte += " " + l;
    else cur.choix[cur.choix.length - 1] += " " + l;
  }
  fermer();

  if (out.questions.length === 0) erreurs.push("Aucune question détectée (vérifie le format : Q1: ... A) ... REPONSE: B)");
  if (out.questions.length > max) erreurs.push(`Maximum ${max} questions par quiz (tu en as ${out.questions.length})`);
  return out;
}
