# Configuration Supabase

L'application est maintenant branchee sur Supabase pour les donnees metier, et la connexion web peut etre migree vers `Supabase Auth`.

## 1. Creer les tables dans Supabase

Dans ton projet Supabase :

1. Ouvre `SQL Editor`
2. Cree une nouvelle requete
3. Copie le contenu de [database/supabase-schema.sql](database/supabase-schema.sql)
4. Execute la requete
5. Cree ensuite une deuxieme requete
6. Copie le contenu de [database/supabase-auth-migration.sql](database/supabase-auth-migration.sql)
7. Execute la requete

Cela va creer :

- `users`
- `clients`
- `products`
- `initial_stocks`
- `replenishments`
- `sales`
- `sale_items`
- `stock_movements`
- `audit_logs`
- la vue `current_stock_view`

Puis la migration `supabase-auth-migration.sql` va :

- ajouter la colonne `auth_user_id` dans `users`
- lier les sessions `Supabase Auth` aux profils metier
- ajouter les fonctions SQL de connexion et de synchronisation
- remplacer les anciennes policies tres ouvertes par des policies `authenticated`

## 2. Configurer les cles dans le projet

Cree un fichier `.env.local` a la racine du projet avec :

```env
VITE_SUPABASE_URL=https://TON-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=TON_ANON_KEY
```

Les valeurs se trouvent dans :

- `Project Settings`
- `API`

## 3. Etat actuel de la migration

Ce qui fonctionne deja en mode web :

- connexion avec `Supabase Auth`
- restauration de session Supabase
- lecture des profils utilisateurs depuis `public.users`
- produits, clients, ventes, stock et historiques branches sur Supabase
- droits de base portes par les roles metier `Super admin`, `Administrateur`, `Employe`

## 4. Important pour les comptes utilisateurs

La table `public.users` reste la source des profils metier :

- `full_name`
- `username`
- `email`
- `role`
- `active`

`Supabase Auth` gere :

- le mot de passe
- la session
- l'identite technique du compte

Le lien entre les deux passe par :

- `users.auth_user_id`

## 5. Premiere connexion du super administrateur

Pour le tout premier compte web :

1. cree d'abord un utilisateur dans `Authentication > Users` sur Supabase
2. utilise la meme adresse e-mail que dans `public.users`
3. assure-toi que le profil correspondant dans `public.users` a le role `Super admin`
4. connecte-toi dans l'application

Lors de la premiere connexion, l'application liera automatiquement ce compte Auth au profil metier grace a l'adresse e-mail.

## 6. Ce qui est deja pret

- variables Supabase cote front : [src/lib/supabase.ts](src/lib/supabase.ts)
- dependance Supabase installee dans [package.json](package.json)
- architecture separee desktop/web dans [src/lib/repository.ts](src/lib/repository.ts)
- migration auth : [database/supabase-auth-migration.sql](database/supabase-auth-migration.sql)

## 7. Ce qu'il reste a faire

Pour finaliser la version en ligne, il faut maintenant :

1. tester en vrai la connexion web avec un compte Supabase existant
2. verifier les roles et les policies RLS sur tes donnees reelles
3. ajouter si besoin une fonction admin securisee pour reinitialiser le mot de passe d'un autre utilisateur sans passer par e-mail
4. deployer la version web
