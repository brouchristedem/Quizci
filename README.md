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
3. Paiement reçu : dans `/admin`, tu cliques sur « Rendre actif ». Un PIN est généré.
4. Le teacher clique sur « Lancer la partie », projette l'écran, les joueurs rejoignent.

## Quotas gratuits à surveiller

Le plan Spark limite les lectures et écritures Firestore par jour (voir la page de tarification Firebase). Les téléphones des joueurs n'écoutent que l'état du jeu et leur propre fiche, pour limiter les lectures.

## À ajouter plus tard

Images dans les questions (Cloudinary), paiement automatique, modification d'un quiz après enregistrement.
