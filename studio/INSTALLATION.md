# Mise en route du back-end XADIKOA (à faire une seule fois)

Ce guide est pour la personne qui administre le site. Comptez 30 à 45 minutes.
Vous n'avez rien à programmer : il s'agit de créer un compte, de copier deux « clés » et de les enregistrer dans GitHub.

> **Règle d'or : ne collez jamais une clé (« token ») dans une conversation, un e-mail ou un fichier du dépôt.**
> Elle se colle uniquement dans GitHub (étape 5). Après usage, on la supprime (étape 9).

## Étape 1 — Créer le compte Sanity
1. Allez sur https://www.sanity.io et cliquez sur « Get started ».
2. Connectez-vous avec votre compte Google, GitHub ou une adresse e-mail.

## Étape 2 — Créer le projet
1. Allez sur https://www.sanity.io/manage et cliquez sur « Create new project ».
2. Nom du projet : `XADIKOA`. Jeu de données (« dataset ») : `production`. Choisissez l'offre **Free**.
3. Visibilité : **Public** (c'est la seule possible en gratuit, et c'est normal : un site de presse est public).
4. Une fois créé, notez l'**identifiant du projet** (« Project ID », environ 8 caractères comme `ab12cd34`).
   C'est une information publique : vous pouvez la communiquer sans risque.

## Étape 3 — Autoriser le site à lire les contenus
1. Dans votre projet : **API → CORS origins → Add CORS origin**.
2. Saisissez `https://xadikoa.com`. **Ne cochez pas** « Allow credentials ». Enregistrez.

## Étape 4 — Créer deux clés
Dans votre projet : **API → Tokens → Add API token**.
1. Première clé : nom `Import contenu`, permission **Editor**. Copiez la clé (elle ne s'affiche qu'une fois).
2. Deuxième clé : nom `Mise en ligne editeur`, permission **Deploy Studio** (si cette permission n'existe pas, choisissez **Editor**). Copiez-la aussi.

## Étape 5 — Enregistrer les clés dans GitHub
1. Allez sur https://github.com/seedscaleup/xadikoa/settings/secrets/actions
2. Cliquez sur « New repository secret ».
3. Nom : `SANITY_WRITE_TOKEN` — valeur : la clé « Import contenu ». Enregistrez.
4. Recommencez : nom `SANITY_AUTH_TOKEN` — valeur : la clé « Mise en ligne editeur ».

## Étape 6 — Donner l'identifiant du projet
Communiquez l'identifiant du projet (étape 2). Il sera inscrit dans `studio/config.json` puis dans `index.html`.
**Ne publiez pas le site connecté avant l'étape 8** : sinon il afficherait une base vide.

## Étape 7 — Mettre en ligne l'éditeur
1. Sur GitHub : onglet **Actions → « Mettre en ligne l'éditeur (Sanity Studio) » → Run workflow**.
2. Au bout de 2 à 3 minutes, l'éditeur est accessible sur **https://xadikoa.sanity.studio**.
3. Si l'automatisation échoue (croix rouge), ouvrez-la, copiez les dernières lignes du journal et transmettez-les.

## Étape 8 — Installer le contenu d'exemple, puis brancher le site
1. Sur GitHub : **Actions → « Installer le contenu d'exemple dans Sanity » → Run workflow**.
   Il crée 5 rubriques, 4 auteurs, 20 articles, 11 vidéos, la page d'accueil et les réglages. Sans danger si on le relance : il n'écrase jamais rien.
2. Ouvrez https://xadikoa.sanity.studio, connectez-vous : vous devez voir les articles marqués « 🧪 ».
3. Seulement ensuite, l'identifiant du projet est inscrit dans `index.html` et le site est publié : `xadikoa.com` lit alors ses articles dans Sanity.

## Étape 9 — Nettoyer
- Sur https://www.sanity.io/manage → API → Tokens : **supprimez la clé « Import contenu »** (elle ne sert plus).
- Dans GitHub, supprimez le secret `SANITY_WRITE_TOKEN`.
- Gardez la clé « Mise en ligne editeur » tant que vous modifiez le dossier `studio/`.

## Étape 10 — Inviter l'équipe
Dans https://www.sanity.io/manage → votre projet → **Members → Invite members**.
Avec l'offre gratuite : 20 personnes au maximum, et deux rôles seulement — **Administrator** (peut tout faire) ou **Viewer** (lecture seule).
Toute personne qui doit écrire est donc Administrator : voir les précautions dans `MODE_EMPLOI.md`.

## Ce que cela coûte
- Offre gratuite : 20 personnes, 10 000 documents, 100 Go de photos et de trafic par mois.
- Pour séparer les rôles (rédacteur / chef de rubrique), il faut l'offre « Growth » (environ 15 $ par personne et par mois).
  Les droits strictement limités à une rubrique ne sont possibles qu'en offre « Enterprise ». Voir https://www.sanity.io/pricing

## En cas de panne
- **Le site affiche « Le site n'arrive pas à charger ses articles »** : Sanity est injoignable ou l'identifiant de projet est faux. Le bouton « Réessayer » relance le chargement.
- **Un article publié n'apparaît pas** : vérifiez que la case « Relu » est cochée, que la date n'est pas dans le futur et qu'il a une rubrique et un auteur.
- **Retour en arrière d'urgence** : remettre `projectId: ''` dans `index.html` (en-tête) ; le site réaffiche son contenu intégré d'origine.
