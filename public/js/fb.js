// Config Firebase (publique) + exports partagés
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export * from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
export * from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const ADMIN_EMAIL = "brouchristedem@gmail.com";
// Numéro WhatsApp admin, format international sans "+" (ex: 2250700000000). Vide = le teacher choisit le contact.
export const ADMIN_WHATSAPP = "2250545177571";
export const PRIX = 500;
export const MAX_QUESTIONS = 30;
export const MAX_PLAYERS = 200;

const app = initializeApp({
  apiKey: "AIzaSyDgMHEvSdkgw4YoE42exO_S8Uxaiqbntt8",
  authDomain: "quizci.firebaseapp.com",
  projectId: "quizci",
  storageBucket: "quizci.firebasestorage.app",
  messagingSenderId: "604552376710",
  appId: "1:604552376710:web:09805c8548e3372f99fc07",
});

export const auth = getAuth(app);
export const db = getFirestore(app);
// Utilitaires partagés (définis dans util.js, ré-exportés ici pour les imports existants)
export { $, esc, COULEURS, LETTRES, fit, ord, fmt, points, pseudoKey } from "./util.js";

// Les questions (sans les bonnes réponses) sont lues en UN seul document : 2 lectures par joueur au lieu de 31.
// Anciens quiz : repli sur la sous-collection « questions ».
export async function loadQuestions(quizId) {
  try {
    const s = await getDoc(doc(db, "quizzes", quizId, "public", "questions"));
    if (s.exists() && Array.isArray(s.data().list)) return { list: s.data().list, fromDoc: true };
  } catch (e) { /* règles pas encore à jour : on lit l'ancienne collection */ }
  const snap = await getDocs(query(collection(db, "quizzes", quizId, "questions"), orderBy("ordre")));
  return { list: snap.docs.map((d) => d.data()), fromDoc: false };
}
export const publicQuestions = (list) => ({ list: list.map((q) => ({ texte: q.texte, choix: q.choix })) });
// Écriture « au mieux » : ne bloque jamais l'enregistrement ni le lancement d'un quiz
export async function savePublicQuestions(quizId, list) {
  try { await setDoc(doc(db, "quizzes", quizId, "public", "questions"), publicQuestions(list)); return true; }
  catch (e) { console.warn("public/questions non écrit", e.code || e); return false; }
}
