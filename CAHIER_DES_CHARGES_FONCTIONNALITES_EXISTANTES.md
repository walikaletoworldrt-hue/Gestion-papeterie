# Cahier Des Charges

## Application
Walikale Papeterie

## Objet du document
Ce document recense les fonctionnalites actuellement presentes dans l'application a partir de l'etat reel du code.

Il sert a :
- decrire les modules deja operationnels
- distinguer ce qui fonctionne en desktop, en web, ou dans les deux modes
- relever les limites fonctionnelles encore visibles
- fournir une base de travail fiable pour les evolutions suivantes

## 1. Perimetre actuel de l'application

L'application couvre aujourd'hui un noyau complet de gestion commerciale pour une papeterie avec :
- tableau de bord
- gestion des produits
- gestion des services
- gestion des clients
- gestion des depenses
- gestion du stock initial
- gestion du reapprovisionnement
- gestion des ventes
- suivi du stock actuel
- gestion des utilisateurs
- historique d'activite
- impression et export de documents de vente
- synchronisation desktop vers Supabase

## 2. Plateformes prises en charge

### 2.1 Mode desktop

Le mode desktop repose sur :
- Electron
- une base SQLite locale
- des impressions et exports PDF natifs
- le travail hors ligne
- un mecanisme de synchronisation avec Supabase

### 2.2 Mode web

Le mode web repose sur :
- React + Vite
- Supabase pour la base et l'authentification
- un fonctionnement navigateur sans Electron

En mode web, certaines fonctions desktop ne sont pas disponibles, notamment :
- stockage SQLite local
- impression native Electron
- export PDF natif Electron
- synchronisation locale/cloud depuis un poste desktop

## 3. Profils utilisateurs

Les profils actuellement definis sont :
- Super admin
- Administrateur
- Employe

Les droits visibles dans l'interface sont deja differencies :
- le Super admin accede a tous les onglets
- l'Administrateur n'accede pas a la gestion des utilisateurs ni a l'historique complet
- l'Employe a un acces plus limite, notamment sans administration du stock initial, du reapprovisionnement, des utilisateurs et de l'historique

## 4. Modules fonctionnels existants

### 4.1 Connexion et session

Fonctionnalites disponibles :
- ecran de connexion dedie
- affichage du logo de l'entreprise
- connexion par nom d'utilisateur ou adresse e-mail
- connexion avec mot de passe
- restauration automatique de session
- deconnexion
- mise a jour de la derniere connexion
- changement de mot de passe

Specificites techniques :
- en desktop, l'authentification passe par la base locale
- en web, l'authentification passe par Supabase Auth
- en l'absence de configuration Supabase, un mode web local de secours existe avec stockage navigateur

Limites actuelles :
- pas de recuperation de mot de passe par e-mail
- pas de double authentification
- pas de gestion de verrouillage apres plusieurs echecs

### 4.2 Tableau de bord

Fonctionnalites disponibles :
- affichage du stock total
- affichage du nombre de produits
- affichage du nombre de ventes
- affichage du nombre de fournisseurs
- affichage du chiffre d'affaires total
- affichage du total des depenses
- affichage du solde net ventes moins depenses
- affichage de resumes et indicateurs de suivi
- acces rapide vers les modules principaux

Fonctionnalites analytiques presentes :
- filtrage temporel des ventes
- periodes predefinies
- plages personnalisees
- regroupement par jour, semaine, mois ou annee pour les tendances

Limites actuelles :
- pas d'export dedie du tableau de bord
- pas de comparaison avancee entre periodes
- pas de prevision ou analyse statistique avancee

### 4.3 Gestion des produits

Fonctionnalites disponibles :
- ajout de produit
- modification de produit
- suppression de produit avec confirmation
- recherche de produit
- tri par code, nom, categorie, prix ou seuil d'alerte
- affichage des categories
- affichage du fournisseur
- gestion du prix d'achat et du prix de vente
- gestion de l'unite
- gestion du seuil d'alerte
- recalcul du stock a partir des mouvements

Informations gerees :
- code produit
- nom
- categorie
- prix d'achat
- prix de vente
- quantite initiale
- unite
- seuil d'alerte
- fournisseur
- date de mise a jour

Limites actuelles :
- pas d'image produit
- pas de code-barres
- pas de module fournisseur separe

### 4.4 Gestion des services

Fonctionnalites disponibles :
- ajout de service
- mise a jour de service
- activation ou desactivation d'un service
- recherche de service
- utilisation des services dans une vente

Informations gerees :
- nom
- categorie
- prix unitaire
- description
- statut actif ou inactif
- dates de creation et mise a jour

Limites actuelles :
- pas de suppression dediee de service dans l'interface constatee
- pas de tarification complexe ou multi-prix

### 4.5 Gestion des clients

Fonctionnalites disponibles :
- ajout de client
- affichage de la liste des clients
- recherche de client
- utilisation du client dans la creation d'une vente
- support de la vente comptoir sans client selectionne

Informations gerees :
- nom
- telephone
- adresse
- e-mail
- date de creation

Limites actuelles :
- pas de modification client constatee dans l'interface
- pas de suppression client constatee dans l'interface
- pas de compte client, dette ou echeancier
- pas d'historique detaille par client

### 4.6 Gestion des depenses

Fonctionnalites disponibles :
- ajout de depense
- affichage de la liste des depenses
- recherche dans les depenses
- calcul du total des depenses
- prise en compte des depenses dans les indicateurs globaux
- generation d'un rapport financier imprimable

Informations gerees :
- nature
- detail
- montant
- date
- approuve par
- motif

Limites actuelles :
- pas de modification ou suppression de depense constatee dans l'interface
- pas de workflow de validation multi-etapes
- pas de piece justificative jointe

### 4.7 Stock initial

Fonctionnalites disponibles :
- alimentation du stock initial
- prise en compte du stock initial dans les mouvements de stock
- integration dans le calcul du stock courant
- prise en charge par cycle d'inventaire

Limites actuelles :
- pas de gestion documentaire associee
- pas d'import de stock initial depuis fichier

### 4.8 Reapprovisionnement

Fonctionnalites disponibles :
- enregistrement de reapprovisionnement
- choix du produit concerne
- saisie de la quantite
- mise a jour du prix d'achat et du prix de vente lors du mouvement
- saisie du fournisseur
- impact immediat sur le stock
- consultation de l'historique d'approvisionnement
- affichage des quantites et montants cumules

Limites actuelles :
- pas de bon de commande fournisseur
- pas de workflow d'achat complet
- pas de reception multi-documents

### 4.9 Ventes et facturation

Fonctionnalites disponibles :
- creation de vente
- selection d'un client ou vente comptoir
- ajout de lignes produits
- ajout de lignes services
- quantites par ligne
- calcul automatique du total
- verification de stock avant validation
- prise en charge de plusieurs modes de paiement
- ajout de notes sur la vente
- consultation de la liste des ventes
- recherche dans les ventes
- consultation du detail d'une facture

Informations gerees :
- reference de facture
- client
- date
- mode de paiement
- lignes produits
- lignes services
- quantites
- montants unitaires
- montant total
- statut d'affichage

Fonctionnalites de facturation :
- serie de facturation
- numero suivant
- reference suivante
- derniere reference emise
- passage a une nouvelle serie de facturation

Limites actuelles :
- pas d'avoir
- pas d'annulation de vente constatee
- pas de remise
- pas de TVA ou fiscalite avancee
- pas de paiement partiel
- pas de suivi d'impayes

### 4.10 Documents de vente

Fonctionnalites disponibles :
- impression de facture format A4 en desktop
- export PDF de facture format A4 en desktop
- impression de ticket 80 mm en desktop
- export PDF de ticket 80 mm en desktop
- impression navigateur en mode web
- affichage du logo et de l'identite visuelle sur les documents

Contenu des documents :
- logo
- nom de l'entreprise
- reference
- date
- client
- mode de paiement
- lignes de vente
- total

Limites actuelles :
- les exports PDF natifs sont reserves au desktop
- pas de modele multi-entreprise
- pas de parametrage complet du document depuis l'interface

### 4.11 Stock actuel

Fonctionnalites disponibles :
- affichage du stock courant par produit
- calcul des entrees
- calcul des sorties
- affichage du stock restant
- filtrage par categorie
- filtrage par etat de stock
- recherche sur le stock
- export CSV
- affichage des alertes visuelles

Etats visibles :
- stock correct
- stock faible
- rupture

Limites actuelles :
- pas de multi-depots
- pas de correction manuelle isolee de stock constatee
- pas de valorisation historique avancee

### 4.12 Utilisateurs et administration

Fonctionnalites disponibles :
- ajout d'utilisateur
- affichage de la liste des utilisateurs
- recherche utilisateur
- changement de role
- activation ou desactivation d'un compte
- reinitialisation d'acces
- suppression d'utilisateur
- changement de mot de passe
- restauration de session utilisateur

Informations gerees :
- nom complet
- nom d'utilisateur
- e-mail
- role
- actif ou inactif
- date de creation
- derniere connexion

Limites actuelles :
- pas de permissions fines par action metier
- pas de journal detaille des tentatives de connexion
- pas de workflow d'invitation utilisateur

### 4.13 Historique et tracabilite

Fonctionnalites disponibles :
- historique general d'activite
- historique d'approvisionnement
- recherche dans l'historique
- traces sur les creations, mises a jour et suppressions
- traces sur les utilisateurs, ventes, produits, clients et stock

Exemples d'evenements suivis :
- creation produit
- mise a jour produit
- suppression produit
- creation client
- creation utilisateur
- changement de role
- reinitialisation d'acces
- suppression utilisateur
- vente enregistree
- reapprovisionnement

Limites actuelles :
- pas d'export dedie de l'historique
- pas de filtres avances multi-criteres par module
- acces volontairement limite selon le role

### 4.14 Rapport financier

Fonctionnalites disponibles :
- generation d'un rapport financier imprime
- synthese des ventes
- synthese des depenses
- calcul du solde net
- ventilation des ventes par produit
- ventilation des ventes par categorie de services
- mise en avant des produits et services les plus marquants

Limites actuelles :
- pas d'archivage automatique des rapports
- pas d'export natif Excel
- pas de programmation periodique

## 5. Synchronisation et donnees

### 5.1 Base locale desktop

Le mode desktop utilise SQLite pour :
- stocker les donnees localement
- permettre le travail hors ligne
- conserver l'etat de synchronisation

### 5.2 Supabase

Supabase est integre pour :
- l'authentification web
- le stockage centralise des donnees
- la consultation et l'ecriture depuis le mode web
- la synchronisation des donnees desktop vers le cloud

### 5.3 Synchronisation desktop/cloud

Fonctionnalites disponibles :
- lecture du statut de synchronisation
- detection de disponibilite du cloud
- detection de changements locaux en attente
- export d'un snapshot local
- import d'un snapshot cloud
- envoi des donnees desktop vers Supabase
- detection de conflit de synchronisation
- apercu des conflits par blocs de donnees
- choix entre conserver le local ou prendre le cloud
- marquage de fin de synchronisation

Entites synchronisees :
- utilisateurs
- produits
- services
- clients
- depenses
- stock initial
- reapprovisionnements
- ventes
- lignes de vente
- lignes de services vendus
- mouvements de stock
- journaux d'audit
- sequences de facture
- cycles d'inventaire

Limites actuelles :
- la synchronisation locale/cloud est reservee au desktop
- pas de synchronisation automatique en tache de fond constatee
- pas de resolution intelligente fusionnee des conflits

## 6. Ergonomie et experience utilisateur

Fonctionnalites disponibles :
- interface a onglets
- fenetres modales de saisie
- confirmations avant actions sensibles
- messages toast de succes, erreur et information
- etats vides
- filtres et recherches par module
- recherche globale dans l'interface
- adaptation des onglets selon le role

Limites actuelles :
- pas de pagination constatee
- pas de personnalisation utilisateur de l'interface
- pas de tableau de bord configurable

## 7. Structure de donnees actuellement couverte

Les structures de donnees visibles dans le projet couvrent notamment :
- users
- products
- services
- clients
- expenses
- initial_stocks
- replenishments
- sales
- sale_items
- sale_service_items
- stock_movements
- audit_logs
- invoice_sequences
- inventory_cycles

Vue presente :
- current_stock_view

## 8. Fonctions techniques deja presentes

Fonctionnalites techniques constatees :
- application React en TypeScript
- application desktop Electron
- base SQLite locale
- integration Supabase
- build web Vite
- packaging Windows
- impression A4
- impression ticket 80 mm
- export PDF
- export CSV
- gestion de sessions
- gestion de conflits de synchronisation

## 9. Limites fonctionnelles encore visibles

Les principaux manques ou points incomplets constates a ce stade sont :
- absence de modification et suppression client dans l'interface constatee
- absence de workflow d'achat complet
- absence de module fournisseur autonome
- absence d'avoirs et d'annulation de vente
- absence de remises et taxes
- absence de paiements partiels
- absence de multi-depots
- absence d'exports metier multiplateformes sur tous les modules
- absence de parametrage complet de l'entreprise depuis l'interface
- absence de recuperation de mot de passe automatisee
- absence de permissions fines par action

## 10. Conclusion

L'application couvre deja un perimetre fonctionnel important et coherent :
- ventes
- facturation
- produits
- services
- clients
- depenses
- stock
- utilisateurs
- historique
- synchronisation avec Supabase

Par rapport a la version precedente du cahier des charges, l'existant est plus avance que prevu, notamment sur :
- l'authentification avec mot de passe
- le module services
- le module depenses
- la gestion des roles
- la numerotation des factures
- l'impression ticket et PDF
- la synchronisation desktop vers Supabase

Ce document peut maintenant servir de reference fiable pour :
- valider l'existant
- cadrer les prochains correctifs
- preparer une version 2 centree sur les manques restants
