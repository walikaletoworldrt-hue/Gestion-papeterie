# Mise en service de la synchronisation ligne par ligne

Version concernée : **Walikale Papeterie 1.1.0**

À partir de cette version, plusieurs PC et la version web peuvent travailler **en même temps**, même hors ligne, sans message de conflit. Chaque synchronisation récupère les changements des autres postes, puis envoie ceux du poste.

> **Important** : tous les PC doivent passer à la version 1.1.0 **le même jour**. Un PC resté sur une version plus ancienne utiliserait l'ancienne méthode « tout remplacer » et effacerait le travail des autres postes.

---

## Ce qui change pour les utilisateurs

| Avant | Maintenant |
|---|---|
| Message « Conflit détecté » quand deux postes avaient travaillé | Plus de conflit : les changements des postes s'additionnent |
| Factures `Fact-SA26-0001` sur tous les postes | Une série par poste : `Fact-SA26-P1-0001`, `Fact-SA26-P2-0001`, web `Fact-SA26-W-0001` |
| Données de démonstration et mot de passe `Walikale123` à l'installation | Installation vide ; première connexion avec le compte Supabase |

**Règles de synchronisation**
- Si le même produit, client, service… est modifié sur deux postes, **la modification la plus récente est gardée**.
- Une suppression faite sur un poste ou sur le web est appliquée partout.
- Un même produit, service, tarif cybercafé ou cycle d'inventaire créé séparément sur deux postes (même nom) devient **un seul** enregistrement.
- Si deux produits **différents** reçoivent le même code sur deux PC, celui du second PC est renommé automatiquement (exemple : `PAP-STY-001-P2`).
- Chaque PC a un **code poste** (P1, P2… jusqu'à P99). Un code ne peut servir qu'à un seul PC.

---

## Étape 1 — Sauvegarder

1. Sur chaque PC qui contient des données : ouvrir l'application, faire une **sauvegarde manuelle**. Les fichiers sont dans `Documents\Walikale Papeterie\Backups`.
2. Dans Supabase : **Database > Backups**, vérifier qu'une sauvegarde récente existe.

## Étape 2 — Préparer Supabase

Dans **Supabase > SQL Editor**, exécuter :

1. `database/supabase-row-sync-migration.sql` (le script peut être relancé sans risque).
2. Pour repartir de données propres : `database/supabase-remise-a-zero-donnees.sql`.
   Ce script efface produits, services, clients, ventes, dépenses, stock, cybercafé, historique et numérotation web. Les comptes utilisateurs sont conservés. Il ne fait rien tant que `NON` n'a pas été remplacé par `OUI` dans le fichier.
3. Dans **Authentication > Users** et la table **users**, supprimer les comptes de démonstration (`mjr`, `jr`, `test`, `admin`, adresses `@lacouronne`…) et garder les vrais comptes.

> **Ordre à respecter** : le script de l'étape 2 doit être exécuté **avant** de publier la nouvelle version web (fusion de la branche dans `main`). Sinon, les ventes faites sur le web échoueront, faute de numérotation `W`.

## Étape 3 — Publier la version web

Fusionner la branche `feature/sync-ligne-par-ligne` dans `main` et l'envoyer sur GitHub. Netlify déploie automatiquement en moins d'une minute.

## Étape 4 — Installer la version 1.1.0 sur chaque PC

Sur **chaque** PC :

1. Fermer l'application.
2. Pour repartir d'une base vide : renommer (ne pas supprimer) le fichier
   `%APPDATA%\Walikale Papeterie\storage\walikale-papeterie.db`
   en `walikale-papeterie-ancien.db`.
   *(Taper `%APPDATA%\Walikale Papeterie\storage` dans la barre d'adresse de l'Explorateur Windows.)*
3. Installer `Walikale Papeterie Setup 1.1.0.exe` (dossier `release`).

## Étape 5 — Premier PC (le poste principal)

1. Ouvrir l'application, **avec Internet**.
2. Se connecter avec le compte **Super admin** Supabase (adresse e-mail ou nom d'utilisateur + mot de passe).
3. Onglet **Stock initial** : saisir le code poste **P1**, puis cliquer sur **Définir le code poste**.
4. Saisir les vraies données : services, tarifs cybercafé, produits avec leur stock initial, clients.
5. Cliquer sur **Synchroniser**.

## Étape 6 — Autres PC

Pour chaque autre PC :

1. Ouvrir l'application, **avec Internet**, et se connecter avec un compte Supabase.
2. Cliquer sur **Synchroniser** : le PC récupère toutes les données. Un message indique que le code poste manque encore pour pouvoir envoyer ; c'est normal.
3. Un **Super admin** se connecte sur ce PC, saisit son code (**P2**, puis **P3**…) dans **Stock initial**, puis clique sur **Synchroniser**.

Ensuite, chaque PC peut travailler hors ligne. Les utilisateurs déjà connectés une fois sur un PC peuvent s'y reconnecter sans Internet.

## Étape 7 — Vérifier

- Faire une vente sur P1 et une sur P2, synchroniser les deux postes : chaque poste doit voir les deux ventes, et le stock doit être identique.
- Faire une vente sur le web, synchroniser un PC : la vente `…-W-…` doit apparaître.

---

## Utilisation au quotidien

- **Synchroniser régulièrement** quand Internet est disponible, au minimum en début et en fin de journée. Plus on synchronise souvent, plus les postes sont à jour.
- Le compteur **En attente** indique le nombre de changements du poste pas encore envoyés.
- **Réinitialisation d'inventaire** (Super admin) : elle vide les ventes et le stock de **tous** les postes à la synchronisation suivante. Synchroniser tous les postes avant de la lancer.

## Messages possibles

| Message | Que faire |
|---|---|
| « Ce poste n'a pas encore de code… » | Un Super admin définit le code poste dans **Stock initial**. |
| « Le code poste P1 est déjà utilisé par le PC … » | Choisir un autre code pour ce PC (P2, P3…). |
| « La synchronisation ligne par ligne n'est pas installée sur Supabase » | Exécuter `database/supabase-row-sync-migration.sql` (étape 2). |
| « Synchronisation partielle : … » | Une partie n'a pas pu être envoyée (droits insuffisants, élément lié manquant…). Ces changements restent en attente : relancer **Synchroniser**, ou se connecter avec un compte qui a les droits nécessaires. |
| « Impossible d'obtenir un numéro de facture web » | Le script de l'étape 2 n'a pas été exécuté. |

## Limites connues

- La **suppression d'un utilisateur** faite sur le web n'est pas répercutée sur les PC. Les comptes restent gérés par le Super admin.
- Deux **clients** créés avec le même nom sur deux postes ne sont pas fusionnés, car deux clients différents peuvent porter le même nom.
- Seul un **Super admin** envoie les changements d'utilisateurs. Les autres profils envoient les ventes, clients, dépenses, etc., selon leurs droits Supabase.
