# Quizci

Site de quiz en direct façon Kahoot, pensé pour le public africain. Stack 100 % gratuite : Firebase Hosting + Firestore (plan Spark) + Auth (Google et Anonymous).

## Avant le premier déploiement

1. Ouvre `public/js/config.js` et remplace `ADMIN_WHATSAPP` par ton numéro WhatsApp (indicatif + numéro, sans `+` ni espaces).
2. Dans Firebase Console, Authentication → Settings → Authorized domains : vérifie que `quizci.web.app` est présent (il l'est par défaut).

## Déployer (une seule fois, puis à chaque modification)

```
npm install -g firebase-tools
firebase login
firebase deploy
```

Cette commande publie le site (`public/`) et les règles de sécurité (`firestore.rules`). Reste sur le plan Spark : aucune carte bancaire n'est nécessaire.

Sans la ligne de commande : colle le contenu de `firestore.rules` dans Firebase Console → Firestore → Règles → Publier, et déploie le dossier `public/` sur n'importe quel hébergeur statique.

## Pages

- `/` : les joueurs (PIN + pseudo, ou `/?pin=123456` via QR code / lien WhatsApp)
- `/teacher` : connexion Google, création de quiz (import PDF, texte collé ou saisie manuelle)
- `/host?q=ID` : écran de projection (PIN, QR, questions, classement, podium)
- `/admin` : tableau de bord, réservé à `brouchristedem@gmail.com`, bouton « Rendre actif »

## Parcours d'un quiz

1. Le teacher crée son quiz (statut `brouillon`) et clique sur « Activer mon quiz » : WhatsApp s'ouvre avec le message prérempli (titre + ID).
2. Tu lui envoies ton lien de paiement Wave.
(Admin : sur un quiz terminé, « Réactiver » le remet en salle d'attente (joueurs et classement effacés), « Classement » affiche les points de la partie.)
3. Paiement reçu : dans `/admin`, tu cliques sur « Rendre actif ». Un PIN est généré.
4. Le teacher clique sur « Lancer la partie », projette l'écran, les joueurs rejoignent.

## Quotas gratuits à surveiller

Le plan Spark limite Firestore à environ 50 000 lectures et 20 000 écritures par jour. Ce qui coûte, pour une partie de 200 joueurs et 30 questions :

- Écritures : 1 par joueur et par question (la réponse) + 1 à l'arrivée, soit environ 6 300. Le classement et les points sont écrits une seule fois par question, dans la fiche du quiz.
- Lectures : chaque changement de phase (début et fin de question) est lu par chaque joueur, soit environ 12 000, plus environ 6 000 pour l'écran projeté (une lecture par réponse). Les questions sont lues en un seul document (`public/questions`) : 2 lectures par joueur au lieu de 31.
- Total : environ 19 000 lectures et 6 300 écritures. Deux très grosses parties par jour passent, trois non. Une classe de 40 joueurs et 15 questions en coûte environ 1 400 lectures.

## Règles Firestore

Après chaque modification de `firestore.rules`, il faut les republier (Firebase Console → Firestore → Règles → Publier, ou `firebase deploy --only firestore:rules`). Le déploiement du site sur Vercel ne les met pas à jour. Si les règles ne sont pas à jour, le site continue de fonctionner (les pseudos en double sont alors renommés par l'écran projeté, et les questions sont lues une par une), mais sans les économies de lectures.

## Pseudos et reconnexion

- Un pseudo est réservé à l'arrivée (document `pseudos/{clé}`) : « Léa », « lea » et « LÉA » sont le même pseudo. L'exclusion d'un joueur libère son pseudo.
- Si un joueur actualise la page ou perd sa connexion, il retrouve sa place, son score et le chrono de la question en cours (même téléphone, même navigateur).

## Mode test (créateur)

Bouton « Tester » dans l'éditeur et « Tester gratuitement » sur chaque quiz : le créateur joue son quiz sur l'écran téléphone, avec le chrono et les points, et voit la bonne réponse après chaque question. Rien n'est écrit dans Firestore.

## Tests

```
node test/parser.test.mjs
node test/util.test.mjs
```

## À ajouter plus tard

Images dans les questions (Cloudinary), paiement automatique, modification d'un quiz après enregistrement.
