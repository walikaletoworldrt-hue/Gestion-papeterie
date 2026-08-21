# Cahier Des Charges

## Application
Walikale Papeterie

## Objet du document
Ce document decrit l'etat fonctionnel reel de l'application au 21 aout 2026.

Il sert a :
- valider les fonctionnalites effectivement disponibles
- distinguer ce qui fonctionne en mode desktop et en mode web
- cadrer les droits par profil utilisateur
- fournir une base fiable avant mise en production

## 1. Presentation generale

Walikale Papeterie est une application de gestion commerciale, de stock et de suivi d'activites pour la structure Walikale to World.

L'application permet de gerer dans un seul espace :
- les produits
- les services
- les clients
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
- modifier les clients
- supprimer les clients
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

Il ne peut pas :
- gerer les utilisateurs comme un Super admin
- reinitialiser l'inventaire
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

Limites actuelles :
- pas de recuperation automatique du mot de passe par e-mail dans l'application
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
- ajout de produit
- modification de produit
- suppression de produit selon le role
- recherche
- tri
- gestion du seuil d'alerte
- gestion du fournisseur
- gestion des prix
- recalcul du stock selon les mouvements

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

## 8. Gestion des clients

Fonctionnalites disponibles :
- ajout de client
- consultation de la liste
- recherche
- utilisation dans les ventes
- prise en charge du client comptoir

Fonctionnalites d'administration :
- modification client reservee au Super admin
- suppression client reservee au Super admin

Informations gerees :
- nom
- telephone
- adresse
- e-mail
- date de creation

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
- enregistrement du stock initial
- prise en compte dans le calcul du stock actuel
- integration dans le cycle d'inventaire

Fonctionnalite de reinitialisation :
- la reinitialisation d'inventaire vide les quantites et repart sur une nouvelle serie
- les operations associees peuvent remettre a zero le stock initial, les ventes et les approvisionnements selon le flux prevu

Restriction importante :
- les Administrateurs et Employes ne doivent pas avoir acces a cette reinitialisation
- cette action est reservee au Super admin

## 11. Reapprovisionnement

Fonctionnalites disponibles :
- creation d'un nouvel approvisionnement
- selection du produit
- saisie de la quantite
- saisie du prix d'achat
- saisie du prix de vente
- saisie du fournisseur
- enregistrement de l'historique
- mise a jour immediate du stock

Regle ergonomique actuelle :
- l'approvisionnement doit passer par le bouton principal `Nouvel approvisionnement`
- le bouton inline `Approvisionner` dans la table produit a ete retire pour eviter les doublons de flux

### 11.1 Approvisionnement par lot

Le flux d'approvisionnement prend maintenant en charge :
- un numero `LOT commande`
- un `Transport global du lot`

Objectif :
- rattacher plusieurs produits a une meme commande
- repartir les frais de transport au niveau du lot plutot que du produit unitaire

Les informations de lot sont stockees dans :
- SQLite local
- Supabase
- l'historique d'approvisionnement
- les imports/exports CSV

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

## 12. Ventes et facturation

Fonctionnalites disponibles :
- creation de vente
- selection d'un client ou vente comptoir
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

### 12.1 Serie de facture

Le systeme gere :
- la serie de facturation
- la prochaine reference
- le passage a une nouvelle serie

La reinitialisation de la numerotation doit rester reservee au Super admin.

## 13. Factures, tickets et PDF

Fonctionnalites disponibles :
- impression facture A4
- export PDF facture
- impression ticket 80 mm
- export PDF ticket
- impression navigateur en mode web

Ameliorations recentes :
- la facture a ete retravaillee pour etre plus propre et moins encombrante
- les entetes de l'entreprise ont ete harmonises
- les exports evitent l'affichage parasite du nom Netlify dans le contenu imprime
- les rapports financiers sont mis en page avec identite de la boutique

Contenu documente :
- logo
- nom de l'entreprise
- reference
- date
- client
- mode de paiement
- lignes de vente
- total

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
- transport du lot d'approvisionnement
- cout hebdomadaire du personnel

Fonctionnalites disponibles :
- cout hebdomadaire du personnel personnalisable
- valeur par defaut de 50000 FC
- estimation du transport sur stock
- benefice net potentiel

Certaines valeurs sensibles restent masquees pour les profils non autorises.

## 15. Utilisateurs

Fonctionnalites disponibles :
- ajout d'utilisateur depuis l'application
- gestion du role
- activation ou desactivation
- suppression selon le role autorise
- changement de mot de passe
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

Fonctionnalites disponibles :
- detection du statut en ligne
- affichage du nombre d'elements en attente
- bouton `En attente` cliquable
- choix des rubriques a synchroniser
- synchronisation rubrique par rubrique
- detection des conflits
- import/export de snapshots

### 17.1 Sens des boutons de synchronisation

Les indicateurs ont une vraie fonction :
- `En ligne` indique la disponibilite cloud
- `En attente` affiche le volume de donnees locales non poussees
- `Synchroniser` lance la synchronisation

Le bouton `En attente` permet maintenant d'ouvrir une selection des blocs a synchroniser, afin d'eviter de tout pousser d'un coup.

### 17.2 Gestion des conflits

Le message :
`Conflit detecte : le cloud et ce poste ont tous les deux des changements non synchronises`
signifie que :
- le poste local a des donnees modifiees non envoyees
- le cloud contient aussi des modifications plus recentes ou differentes
- l'application demande une resolution prudente pour eviter l'ecrasement

L'approche actuellement disponible consiste a :
- identifier la rubrique en attente
- synchroniser bloc par bloc
- choisir la bonne source si une resolution est proposee

Limite actuelle :
- pas encore de fusion intelligente automatique sur tous les cas

## 18. Sauvegarde et restauration

Fonctionnalites desktop disponibles :
- creation manuelle de sauvegarde
- sauvegardes automatiques
- restauration depuis fichier
- conservation d'un nombre limite de sauvegardes automatiques

Objectif :
- proteger les donnees avant mise a jour
- permettre de desinstaller puis reinstaller sans perdre ventes, produits, clients et autres en cas de restauration correcte

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

## 20. Ergonomie et experience utilisateur

Fonctionnalites visibles :
- interface a onglets
- recherche globale
- messages toast
- fenetres modales
- filtres par module
- adaptation selon le role
- version web responsive amelioree
- ajustements sur la version portable pour limiter les zones encombrantes

## 21. Structures de donnees principales

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

Vue utilisee :
- `current_stock_view`

Colonnes metier importantes ajoutees ou confirmees :
- `replenishments.lot_number`
- `replenishments.transport_total`
- `users.auth_user_id`

## 22. Limites et points encore a venir

Les points suivants restent hors perimetre ou a renforcer :
- envoi direct de rapport par e-mail depuis l'application
- mecanisme PWA installable depuis le navigateur pour usage hors ligne complet
- recuperation de mot de passe automatisee
- fusion avancee des conflits de synchronisation
- permissions encore plus fines par action metier
- module fournisseur autonome
- gestion avancee des avoirs, remises et fiscalite

## 23. Conclusion

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
