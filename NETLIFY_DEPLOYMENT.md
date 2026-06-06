# Deploiement Netlify

Ce projet web se publie sur `Netlify`, tandis que les donnees restent dans `Supabase`.

## 1. Pre-requis

- Le depot GitHub est deja pousse.
- Les scripts SQL Supabase ont deja ete executes.
- Au moins un utilisateur web existe dans `Supabase Auth`.

## 2. Creer le site Netlify

1. Ouvrir `Netlify`
2. Choisir `Add new site`
3. Choisir `Import an existing project`
4. Connecter `GitHub`
5. Selectionner le depot `Gestion-papeterie`

## 3. Parametres de build

Netlify peut utiliser directement les valeurs deja prevues dans [netlify.toml](c:/Users/User/OneDrive/Projet%20Code/Walikale%20to%20world%20App/netlify.toml) :

- Build command : `npm run build:renderer`
- Publish directory : `dist`
- Node version : `20`

## 4. Variables d'environnement

Dans `Site configuration > Environment variables`, ajouter :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Utiliser les vraies valeurs de ton projet Supabase.

Le fichier [.env.example](c:/Users/User/OneDrive/Projet%20Code/Walikale%20to%20world%20App/.env.example) ne contient maintenant que des placeholders.

## 5. Redirection SPA

La redirection React/Vite est deja configuree :

- toutes les routes pointent vers `index.html`

Cela evite les erreurs `404` quand on recharge une page.

## 6. Ce qui fonctionnera en ligne

- Connexion web via `Supabase Auth`
- Consultation des produits
- Consultation des clients
- Consultation des ventes
- Consultation du stock
- Consultation de l'historique

## 7. Ce qui reste specifique au desktop

- Travail hors ligne avec SQLite
- Synchronisation manuelle locale vers Supabase
- Impression desktop Electron
- Export PDF desktop Electron

## 8. Verification apres deploiement

Apres le premier deploiement :

1. ouvrir l'URL Netlify
2. verifier la connexion
3. verifier que les produits s'affichent
4. verifier que les ventes remontees sur Supabase sont visibles
5. verifier que les roles et droits d'acces fonctionnent

## 9. Important pour la publication

Le code de l'application va sur `GitHub` puis `Netlify`.

Les donnees ne vont pas sur `Netlify` :

- elles restent dans `Supabase`
- ou en local sur SQLite avant synchronisation desktop
