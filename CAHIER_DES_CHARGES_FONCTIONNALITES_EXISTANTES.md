# Cahier Des Charges

## Application
Walikale Papeterie

## Objet du document
Ce document decrit l'etat fonctionnel reel de l'application au 30 octobre 2026 (version 1.2.0).

Il sert a :
- valider les fonctionnalites effectivement disponibles
- distinguer ce qui fonctionne en mode desktop et en mode web
- cadrer les droits par profil utilisateur
- fournir une base fiable avant mise en production

## 0. Nouveautes de la version 1.2.0 (30 octobre 2026)

- Correction du stock initial par le Super admin, avec motif obligatoire et trace dans l'historique (section 10.1).
- Le bouton `Modifier` d'un produit ne change plus la quantite (section 6).
- Nom du client saisi librement a la vente ; onglet `Clients` retire (sections 8 et 12).
- Date de vente enregistree : une vente oubliee peut etre saisie a sa vraie date (section 12.1).
- Suppression du `Transport global du lot` : le transport se saisit dans `Depenses` (sections 11.1 et 14.1).
- Nouveaux RCCM et Id. Nat sur toutes les factures, les tickets, le rapport et l'en-tete de l'application (section 13.1).
- Logo agrandi dans l'application et icone de l'application faite a partir du logo (section 22).
- Bouton `Sauvegarder` accessible aux Administrateurs ; restauration reservee au Super admin (section 18).
- Nettoyage des boutons inutiles ou en double, et masquage sur le web des boutons reserves au PC (section 22.1).
- Correction d'un rechargement continu des donnees apres la connexion, qui consommait inutilement le PC et Supabase.

## 1. Presentation generale

Walikale Papeterie est une application de gestion commerciale, de stock et de suivi d'activites pour la structure Walikale to World.

L'application permet de gerer dans un seul espace :
- les produits
- les services
- les clients (nom saisi a la vente)
- les depenses
- le stock initial
- les reapprovisionnements
- les ventes
- le stock actuel
- les utilisateurs
- l'historique d'activite
- les rapports et impressions
- la synchronisation entre un poste desktop et Supabase

L'entreprise est presentee dans le tableau de bord comme un etablissement actif dans la technologie, l'acces internet, la formation informatique, le secretariat, la papeterie et d'autres services de proximite.

## 2. Plateformes prises en charge

### 2.1 Mode desktop Windows

Le mode desktop repose sur :
- Electron
- une base SQLite locale
- le travail hors ligne
- la synchronisation vers Supabase
- l'impression et l'export natifs
- les sauvegardes et restaurations locales

Le desktop est le mode principal pour :
- travailler sans internet
- synchroniser les donnees locales vers le cloud
- importer et exporter certains fichiers
- restaurer une sauvegarde complete

### 2.2 Mode web

Le mode web repose sur :
- React + Vite
- Supabase pour l'authentification
- Supabase pour la base de donnees centralisee
- un acces depuis navigateur

Le mode web permet principalement :
- la consultation et la saisie en ligne
- la connexion utilisateur cloud
- l'utilisation distante via le lien publie

Limites du mode web :
- pas de base SQLite locale
- pas de synchronisation locale vers cloud
- pas de sauvegarde/restauration desktop
- certaines operations techniques restent reservees a l'application desktop

## 3. Profils utilisateurs et droits

Les profils pris en charge sont :
- Super admin
- Administrateur
- Employe

### 3.1 Super admin

Le Super admin dispose des droits complets sur l'application, notamment :
- gerer tous les modules
- creer, modifier, activer, desactiver et supprimer des utilisateurs
- gerer la synchronisation desktop/cloud
- visualiser les montants sensibles
- reinitialiser l'inventaire et la numerotation
- corriger le stock initial d'un produit
- restaurer une sauvegarde complete
- modifier les produits
- supprimer les produits
- modifier les ventes si le flux le permet
- acceder a l'historique complet

### 3.2 Administrateur

L'Administrateur peut exploiter l'application au quotidien avec des restrictions de securite.

Il peut notamment :
- ajouter des produits
- enregistrer des approvisionnements via le bouton principal
- creer des ventes
- utiliser les services
- consulter le stock
- ajouter des depenses
- modifier les services, y compris la description et le prix
- choisir ou saisir le numero de lot d'un approvisionnement
- sauvegarder les donnees du PC dans un fichier

Il ne peut pas :
- gerer les utilisateurs comme un Super admin
- reinitialiser l'inventaire
- corriger le stock initial
- restaurer une sauvegarde
- supprimer librement les donnees sensibles
- voir certains montants globaux sensibles dans l'approvisionnement et le stock

### 3.3 Employe

L'Employe dispose d'un acces plus restreint, centre sur l'exploitation courante.

Les limitations dependent des autorisations metier deja appliquees dans l'application et dans la logique locale/cloud.

## 4. Authentification et acces

Fonctionnalites disponibles :
- ecran de connexion dedie
- connexion par nom d'utilisateur ou adresse e-mail
- connexion par mot de passe
- restauration automatique de session
- deconnexion
- changement de mot de passe
- mise a jour de la derniere connexion
- gestion locale desktop et gestion cloud web

Fonctionnalites ergonomiques disponibles :
- bouton oeil compact pour afficher ou masquer le mot de passe saisi
- reprise de session locale apres redemarrage

Specificites :
- en desktop, la connexion peut fonctionner hors ligne sur la base locale
- en web, la connexion passe par Supabase Auth
- les comptes relies au cloud doivent etre correctement associes a `auth_user_id`

Recuperation de mot de passe :
- lien `Mot de passe oublie ?` sur l'ecran de connexion
- envoi d'un lien de reinitialisation par Supabase pour les adresses e-mail reelles
- choix et confirmation d'un nouveau mot de passe depuis le lien recu
- reinitialisation locale par le Super admin pour les comptes internes ou adresses inexistantes

Limites actuelles :
- pas de double authentification

## 5. Tableau de bord

Le tableau de bord comporte :
- une presentation de l'entreprise
- une vue globale des activites de la papeterie
- des indicateurs de stock
- des indicateurs de ventes
- des indicateurs de depenses
- des indicateurs de solde
- des indicateurs fournisseurs et clients comptoir
- des alertes stock

Fonctionnalites analytiques presentes :
- carte `Montant vendu` filtrable par periode
- periodes predefinies : aujourd'hui, 7 jours, 30 jours, 90 jours, mois, annee, toutes periodes
- plage personnalisee
- graphique de tendance des ventes
- graphique ventes vs depenses
- graphique top clients

Objectif du tableau de bord :
- fournir une lecture rapide des activites
- permettre une interpretation immediate des ventes, charges et stock

## 6. Gestion des produits

Fonctionnalites disponibles :
- ajout de produit, avec sa quantite initiale
- modification des informations du produit (code, nom, categorie, prix, unite, seuil, fournisseur)
- suppression de produit selon le role
- recherche
- tri
- gestion du seuil d'alerte
- gestion du fournisseur
- gestion des prix
- recalcul du stock selon les mouvements

Regle sur les quantites :
- `Modifier` ne change jamais la quantite d'un produit
- la quantite change uniquement par le stock initial (a la creation ou par correction), les approvisionnements et les ventes
- un nom ou un code deja utilise par un autre produit est refuse

Informations gerees :
- code produit
- nom
- categorie
- prix d'achat
- prix de vente
- unite
- seuil d'alerte
- fournisseur

### 6.1 Categories produit

La categorie est selectionnee via une liste deroulante.

Categories actuellement prevues :
- Papeterie
- Cahiers et registres
- Stylos et ecriture
- Papier et impressions
- Classement et archivage
- Fournitures scolaires
- Informatique et accessoires
- Impression et photocopie
- Boissons fraiches
- Biscuits et snacks
- Confiserie
- Hygiene et entretien
- Divers boutique

### 6.2 Code produit

Le code produit est reorganise et gere automatiquement.

Caracteristiques :
- generation automatique
- code en lecture seule a la creation
- prefixe par categorie
- numerotation propre et progressive

Exemple de logique :
- `PAP-PAP-001`
- `PAP-SNK-001`
- `PAP-BOI-001`

## 7. Gestion des services

Fonctionnalites disponibles :
- ajout de service
- modification de service
- activation ou desactivation
- recherche
- utilisation dans une vente

Informations gerees :
- nom
- categorie
- prix unitaire
- description
- statut actif ou inactif

Particularite importante :
- l'Administrateur peut modifier un service
- il peut notamment modifier la description et le prix

## 8. Clients

Depuis la version 1.2.0, il n'y a plus d'onglet `Clients` : le nom du client est saisi directement dans la vente.

Fonctionnement :
- le champ `Nom du client` de la vente est un texte libre
- les noms deja connus sont proposes pendant la saisie
- le nom est rattache au client existant de meme nom (sans tenir compte des majuscules ni des espaces en trop), sinon un nouveau client est cree automatiquement
- un champ vide correspond a `Client comptoir`
- le nom est limite a 120 caracteres

Les clients deja enregistres (telephone, adresse, e-mail) restent conserves dans la base et synchronises.

## 9. Gestion des depenses

Fonctionnalites disponibles :
- ajout de depense
- affichage de la liste
- recherche
- calcul des totaux
- integration dans les indicateurs financiers
- integration dans le rapport financier

Informations gerees :
- nature
- detail
- montant
- date
- approuve par
- motif

### 9.1 Rapport des depenses et synthese financiere

Le rapport financier inclut desormais :
- l'entete de la boutique
- le logo
- les informations de l'entreprise
- les totaux de ventes et depenses
- le solde apres depenses
- une zone `Lecture rapide`
- une zone `Resume et interpretation`
- une conclusion comparative automatique

La conclusion permet d'indiquer par exemple :
- si les ventes couvrent les depenses
- si les depenses depassent les ventes
- si l'activite de la periode est en perte
- si les depenses sont bien calibrees par rapport au chiffre d'affaires

Le rapport de depenses peut etre filtre par periode afin d'eviter de melanger les anciennes charges avec celles du mois ou de la periode courante.

## 10. Stock initial et cycle d'inventaire

Fonctionnalites disponibles :
- enregistrement du stock initial a la creation du produit
- prise en compte dans le calcul du stock actuel
- integration dans le cycle d'inventaire
- tableau affichant, par produit, la quantite initiale et le stock actuel

Fonctionnalite de reinitialisation :
- la reinitialisation d'inventaire vide les quantites et repart sur une nouvelle serie
- les operations associees peuvent remettre a zero le stock initial, les ventes et les approvisionnements selon le flux prevu

Restriction importante :
- les Administrateurs et Employes ne doivent pas avoir acces a cette reinitialisation
- cette action est reservee au Super admin

### 10.1 Correction du stock initial

Le Super admin peut corriger le stock initial d'un produit (bouton `Corriger`).

Regles :
- nouvelle quantite (positive ou zero) et motif obligatoires
- le stock actuel est recalcule automatiquement, et un apercu l'affiche avant validation
- une correction identique a la valeur actuelle est refusee
- une correction qui rendrait le stock actuel negatif est refusee (ventes deja enregistrees)
- l'ancienne valeur, la nouvelle valeur et le motif sont conserves dans l'historique d'activite
- la correction est synchronisee vers les autres postes et le web

## 11. Reapprovisionnement

Fonctionnalites disponibles :
- creation d'un nouvel approvisionnement
- selection du produit
- saisie de la quantite
- saisie du fournisseur
- enregistrement de l'historique
- mise a jour immediate du stock

Droits sensibles :
- le prix d'achat est visible et modifiable uniquement par le Super admin
- le prix de vente reste utilise pour le suivi commercial
- les Administrateurs ajoutent les quantites sans visualiser ni modifier le prix d'achat

Regle ergonomique actuelle :
- l'approvisionnement doit passer par le bouton principal `Nouvel approvisionnement`
- le tableau de l'onglet `Reapprovisionnement` est en lecture seule ; la modification et la suppression d'un produit se font dans l'onglet `Produits`

### 11.1 Numero de lot

Chaque approvisionnement porte un numero `LOT commande` obligatoire :
- genere automatiquement au format `LOT-AAAAMMJJ-001`
- modifiable si necessaire, par le Super admin comme par l'Administrateur
- un meme numero peut etre reutilise pour plusieurs produits d'une meme commande

Les informations de lot sont stockees dans SQLite, dans Supabase, dans l'historique d'approvisionnement et dans les imports/exports CSV.

Depuis la version 1.2.0, il n'y a plus de `Transport global du lot` :
- le transport d'une commande se saisit comme une depense dans l'onglet `Depenses`
- il est ainsi deduit une seule fois du resultat net du tableau de bord
- les montants de transport saisis avant la version 1.2.0 restent en base mais ne sont plus utilises

### 11.2 Import et export

Les boutons d'approvisionnement sont fonctionnels :
- `Importer Excel`
- `Exporter Excel`
- `Modele Excel`

Implementation actuelle :
- fichiers CSV compatibles Excel
- modele d'import
- export de l'historique
- import desktop des approvisionnements
- le modele n'a plus de colonne transport ; un ancien fichier qui en contient une reste accepte et cette colonne est ignoree

## 12. Ventes et facturation

Fonctionnalites disponibles :
- creation de vente
- nom du client saisi librement, ou vente comptoir (voir section 8)
- choix de la date de vente
- ajout de lignes produit
- ajout de lignes service
- saisie des quantites
- calcul automatique du total
- verification du stock avant validation
- gestion du mode de paiement
- consultation des ventes
- consultation du detail d'une facture

Informations gerees :
- reference
- client
- date
- mode de paiement
- lignes
- quantites
- prix unitaires
- montant total

### 12.1 Date de vente

- la date du jour est proposee par defaut, selon l'heure locale du poste
- une date passee peut etre choisie (vente oubliee) : la vente et ses mouvements de stock sont enregistres a cette date
- une date future est refusee
- la date choisie n'a pas d'effet sur la numerotation des factures
- point d'attention : tout profil autorise a vendre peut dater une vente dans le passe ; la creation reste tracee dans l'historique

La vente n'a pas de champ de note.

### 12.2 Serie de facture

Le systeme gere :
- la serie de facturation
- la prochaine reference
- le passage a une nouvelle serie
- un code poste par PC (P1, P2... defini par le Super admin dans Stock initial) et la serie W pour le web

Format des references : `Fact-SA26-P1-0001` (PC 1), `Fact-SA26-P2-0001` (PC 2), `Fact-SA26-W-0001` (web).
Deux postes ne peuvent jamais produire le meme numero, meme hors ligne. Un PC sans code poste ne peut pas vendre.
Le numero web est attribue par le serveur en une seule operation.

La reinitialisation de la numerotation doit rester reservee au Super admin.

## 13. Factures, tickets et PDF

Fonctionnalites disponibles :
- impression facture A4
- export PDF facture (PC)
- impression ticket 80 mm
- export PDF ticket (PC)
- impression navigateur en mode web (sur le web, les boutons d'export PDF sont masques : l'impression permet d'enregistrer en PDF)

Ameliorations recentes :
- la facture a ete retravaillee pour etre plus propre et moins encombrante
- les entetes de l'entreprise ont ete harmonises
- les exports evitent l'affichage parasite du nom Netlify dans le contenu imprime
- les rapports financiers sont mis en page avec identite de la boutique

Contenu documente :
- logo
- nom de l'entreprise
- RCCM et Id. Nat
- reference
- date
- client
- mode de paiement
- lignes de vente
- total

### 13.1 Informations legales

Numeros officiels de l'entreprise :
- RCCM : `CD/NKG/RCCM/26-A-04372`
- Id. Nat : `01-G4701-N00001E`

Ils figurent en en-tete de la facture A4, du ticket 80 mm (PC et web), de la facture web, du rapport des ventes et depenses, et dans l'en-tete de l'application.
Ils sont definis a un seul endroit du code (`src/lib/company.ts`).

A confirmer : la facture A4 affiche aussi `N° Impot : 01-G4701-N66`, qui semble etre un reste de l'ancien Id. Nat.

## 14. Stock actuel

Fonctionnalites disponibles :
- affichage du stock courant par produit
- calcul des entrees et sorties
- alertes visuelles de stock
- recherche
- filtrage
- export CSV

Etats visibles :
- stock correct
- stock faible
- rupture

### 14.1 Apercu de benefice sur stock

Le module `Stock actuel` affiche un apercu financier du stock restant.

Les calculs prennent en compte :
- prix de vente
- prix d'achat
- cout hebdomadaire du personnel

Calcul : benefice net estime = prix de vente - prix d'achat - part hebdomadaire du personnel.
Le transport n'entre plus dans ce calcul : il est saisi dans `Depenses` et deduit du resultat net du tableau de bord.

Fonctionnalites disponibles :
- cout hebdomadaire du personnel personnalisable
- valeur par defaut de 50000 FC
- benefice net potentiel

Certaines valeurs sensibles restent masquees pour les profils non autorises.

## 15. Utilisateurs

Fonctionnalites disponibles :
- ajout d'utilisateur depuis l'application
- gestion du role
- activation ou desactivation (bouton `Acces` pour reactiver un compte desactive)
- suppression selon le role autorise
- changement ou reinitialisation de mot de passe (bouton `Cle`)
- synchronisation locale/cloud du compte
- restauration de session

Informations gerees :
- nom complet
- nom d'utilisateur
- e-mail
- role
- actif
- date de creation
- derniere connexion

Objectif fonctionnel atteint :
- creation plus simple des utilisateurs
- possibilite de les synchroniser ensuite partout

## 16. Historique, audit et tracabilite

Fonctionnalites disponibles :
- historique general d'activite
- journaux d'audit
- recherche dans l'historique
- suivi des creations, modifications et suppressions

Entites tracees :
- produits
- clients
- utilisateurs
- ventes
- reapprovisionnements
- actions systeme

### 16.1 Entretien de l'historique

Des options d'entretien ont ete ajoutees :
- affichage par periode
- filtres 3 mois, 6 mois, 12 mois ou toutes periodes
- sauvegarde avant nettoyage
- purge des anciens journaux d'activite sur desktop

Objectif :
- eviter une croissance inutile des donnees de trace
- conserver les donnees metier essentielles

## 17. Synchronisation desktop et cloud

La synchronisation concerne :
- utilisateurs
- produits
- services
- clients
- depenses
- stock initial
- reapprovisionnements
- ventes
- lignes de vente
- services vendus
- mouvements de stock
- journaux d'audit
- sequences de facture
- cycles d'inventaire
- ventes Cybercafe et imports Mikhmon

Fonctionnement (depuis la version 1.1.0, synchronisation ligne par ligne) :
- chaque ligne a un identifiant unique partage par tous les postes et le web
- `Synchroniser` recupere d'abord les changements du cloud depuis le dernier passage, puis envoie seulement les changements du poste
- rien n'est jamais remplace en bloc : plusieurs PC et le web peuvent travailler en meme temps, meme hors ligne
- les suppressions sont transmises a tous les postes
- un code poste ne peut servir qu'a un seul PC (registre des postes dans Supabase)

Guide de mise en service : `MISE_EN_SERVICE_SYNCHRONISATION.md`.

### 17.1 Sens des boutons de synchronisation

- `En ligne` indique la disponibilite cloud
- `En attente` affiche le nombre de changements du poste pas encore envoyes ; un clic en montre le detail
- `Synchroniser` lance la synchronisation
- ces boutons n'existent que sur PC : sur le web, les donnees sont enregistrees directement dans Supabase

### 17.2 Modifications simultanees

Il n'y a plus de message de conflit. Regles appliquees automatiquement :
- si un meme element est modifie sur deux postes, la modification la plus recente est gardee (horloge des PC corrigee avec l'heure du serveur)
- un meme produit, service, tarif cybercafe ou cycle d'inventaire cree separement sur deux postes (meme nom) devient un seul enregistrement
- deux produits differents avec le meme code : celui du second poste est renomme (exemple `PAP-STY-001-P2`)

## 18. Sauvegarde et restauration

Ces fonctions n'existent que sur PC.

### 18.1 Contenu d'une sauvegarde

Une sauvegarde est un fichier `.json` contenant toutes les donnees du PC : produits, services, tarifs cybercafe, stocks initiaux, approvisionnements, mouvements de stock, ventes et leurs lignes, recettes cybercafe et imports Mikhmon, depenses, clients, cycles d'inventaire, numerotation des factures, comptes utilisateurs (mots de passe codes, jamais en clair) et historique d'activite.

### 18.2 Sauvegarde automatique

- une sauvegarde est faite a chaque ouverture de l'application
- dossier : `Documents\Walikale Papeterie\Backups\Auto`
- les 15 dernieres sont conservees

### 18.3 Sauvegarde manuelle

- bouton `Sauvegarder` dans la barre du haut, a cote de `Synchroniser`
- accessible au Super admin et aux Administrateurs
- l'utilisateur choisit l'emplacement du fichier (par defaut `Documents\Walikale Papeterie\Backups\Manual`) ; une cle USB est recommandee

### 18.4 Restauration

- bouton `Restaurer` dans l'onglet `Utilisateurs`, reserve au Super admin
- remplace toutes les donnees du PC par celles du fichier choisi : ce qui a ete saisi depuis la sauvegarde est perdu sur ce poste
- a reserver aux cas de panne ou de changement d'ordinateur

### 18.5 Controle des droits

Le PC verifie lui-meme le role avant d'agir, independamment de l'emplacement des boutons :
- sauvegarde manuelle : Super admin ou Administrateur
- restauration : Super admin uniquement

## 19. Rapports et interpretation

L'application prend en charge :
- rapport financier imprime
- export PDF
- interpretation automatique des depenses et ventes
- synthese des produits les plus vendeurs
- synthese des services dominants
- conclusion comparative des activites

Le rapport est concu pour :
- aider a comprendre rapidement si l'activite est rentable
- orienter la prise de decision du responsable

## 20. Module Cybercafe

Le module Cybercafe est separe des ventes de papeterie afin de ne pas melanger les recettes de connexion internet avec les ventes de produits et services.

Fonctionnalites disponibles :
- enregistrement du total journalier de caisse
- import d'un fichier CSV de rapport Mikhmon
- rapprochement entre le total de caisse saisi et l'analyse du fichier importe
- conservation de l'historique des imports par date
- filtres par periode
- graphiques de ventes journalieres, distribution par forfait et ventes par heure
- statistiques globales sur les tickets et les montants
- rapport de synthese pre-rempli pour envoi par e-mail

Regles d'e-mail :
- le nom de l'utilisateur expediteur est inclus dans le rapport
- l'adresse du responsable est configuree par le Super admin uniquement
- l'Administrateur peut declencher l'envoi sans modifier le destinataire
- l'envoi ouvre le logiciel de messagerie configure sur le poste ; il ne s'agit pas encore d'un envoi automatise par serveur

## 21. Sauvegarde, deploiement et exploitation

Avant toute mise a jour de l'application desktop, une sauvegarde doit etre realisee puis verifiee. La restauration permet de recuperer les produits, clients, ventes, services, depenses, utilisateurs et autres donnees locales apres une reinstallation.

Recommandations d'exploitation :
- conserver une copie des sauvegardes en dehors du poste de travail
- synchroniser regulierement chaque poste lorsqu'Internet est disponible
- installer la meme version de l'application sur tous les postes et publier la version web en meme temps (par exemple, un Administrateur sur un PC reste en 1.1.0 ne peut pas approvisionner dans un lot cree sans transport en 1.2.0)
- executer les migrations SQL Supabase fournies avant une premiere mise en production

## 22. Ergonomie et experience utilisateur

Fonctionnalites visibles :
- interface a onglets
- recherche globale
- messages toast
- fenetres modales
- filtres par module
- adaptation selon le role
- version web responsive amelioree
- ajustements sur la version portable pour limiter les zones encombrantes
- logo agrandi dans l'en-tete et sur l'ecran de connexion (version recadree sans marges blanches)
- RCCM et Id. Nat affiches sous le nom de l'application
- icone de l'application (.exe) faite a partir de l'embleme du logo

### 22.1 Boutons retires ou masques en version 1.2.0

Retires car en double ou sans effet :
- le bouton cle en double dans `Utilisateurs` (le bouton `Acces` reste)
- `Modifier` et `Supprimer` dans le tableau `Reapprovisionnement` (ils restent dans `Produits`)
- le champ `Code client` et le champ `Notes` de la vente (les notes n'etaient jamais enregistrees)
- la fenetre de conflit de synchronisation, devenue inatteignable depuis la version 1.1.0
- l'onglet `Clients`

Masques sur le web car reserves au PC :
- `Synchroniser` et `En attente`
- `Sauvegarder`, `Restaurer`, `Sauvegarder avant nettoyage`
- les boutons `Exporter PDF` (facture, ticket, rapport des depenses)

## 23. Structures de donnees principales

Les structures actuellement couvertes comprennent notamment :
- `users`
- `products`
- `services`
- `clients`
- `expenses`
- `initial_stocks`
- `replenishments`
- `sales`
- `sale_items`
- `sale_service_items`
- `stock_movements`
- `audit_logs`
- `invoice_sequences`
- `inventory_cycles`
- `cybercafe_tariffs`
- `cybercafe_sales`
- `mikhmon_sales`

Vue utilisee :
- `current_stock_view`

Colonnes metier importantes ajoutees ou confirmees :
- `replenishments.lot_number`
- `replenishments.transport_total` (conservee, plus utilisee depuis la version 1.2.0)
- `users.auth_user_id`

## 24. Limites et points encore a venir

Les points suivants restent hors perimetre ou a renforcer :
- envoi direct de rapport par e-mail depuis l'application
- mecanisme PWA installable depuis le navigateur pour usage hors ligne complet
- prise en charge des comptes internes qui n'utilisent pas une adresse e-mail reelle pour la recuperation autonome du mot de passe
- suppression d'un utilisateur faite sur le web non repercutee sur les PC
- deux clients crees avec le meme nom sur deux postes ne sont pas fusionnes (avec la saisie libre du nom, cela peut arriver plus souvent ; sans effet sur les factures)
- pas de champ de note sur une vente (a ajouter si le besoin apparait, par exemple pour les numeros de transaction Mobile Money)
- permissions encore plus fines par action metier
- module fournisseur autonome
- gestion avancee des avoirs, remises et fiscalite

## 25. Conclusion

L'application a atteint un niveau fonctionnel avance pour une mise en exploitation dans la papeterie.

Elle couvre deja de maniere coherente :
- la vente
- la facturation
- les services
- les depenses
- le stock
- les utilisateurs
- le travail hors ligne
- la synchronisation avec Supabase
- les sauvegardes
- les rapports de gestion

Ce document peut maintenant servir comme cahier de charge actualise de l'existant pour :
- la validation finale
- le deploiement
- la formation des utilisateurs
- la preparation des prochaines evolutions
