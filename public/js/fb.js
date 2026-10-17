// Config Firebase (publique) + exports partagés
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export * from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
export * from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const ADMIN_EMAIL = "brouchristedem@gmail.com";
// Numéro WhatsApp admin, format international sans "+" (ex: 2250700000000). Vide = le teacher choisit le contact.
export const ADMIN_WHATSAPP = "";
export const PRIX = 500;
export const MAX_QUESTIONS = 20;

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
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const COULEURS = ["c0", "c1", "c2", "c3"];
export const LETTRES = ["A", "B", "C", "D"];
