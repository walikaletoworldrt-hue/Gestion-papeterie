# Cahier Des Charges

## Application
Walikale Papeterie

## Objet du document
Ce document recense les fonctionnalites deja presentes dans l'application afin d'identifier clairement :
- ce qui est deja disponible
- ce qui est partiellement disponible
- ce qui reste a ajouter ou a corriger

Le contenu ci-dessous est base sur les fonctionnalites actuellement implementees dans l'interface React, le backend Electron et la base SQLite locale.

## 1. Perimetre actuel de l'application

L'application est une solution desktop de gestion commerciale orientee papeterie. Elle couvre actuellement :
- la gestion des produits
- la gestion des clients
- la gestion du stock initial
- la gestion des reapprovisionnements
- la gestion des ventes
- le suivi du stock actuel
- la gestion des utilisateurs
- l'historique d'activite
- l'impression et l'export de facture

## 2. Utilisateurs cibles

Les profils actuellement prevus dans l'application sont :
- Super admin
- Administrateur
- Employe

## 3. Modules fonctionnels existants

### 3.1 Connexion

Fonctionnalites deja disponibles :
- page de connexion dediee
- affichage du logo de l'entreprise
- saisie d'un identifiant ou d'une adresse e-mail
- ouverture d'une session a partir d'un utilisateur existant
- memorisation de session locale
- deconnexion depuis l'interface

Limites actuelles :
- pas de mot de passe reel
- pas de gestion avancee des droits par ecran
- pas de blocage d'acces selon role

### 3.2 Tableau de bord

Fonctionnalites deja disponibles :
- affichage d'indicateurs de stock
- affichage du nombre de produits
- affichage du nombre de ventes du jour
- affichage du nombre de fournisseurs
- affichage des alertes de stock
- affichage du nombre de clients comptoir
- resume d'activite
- points d'attention
- acces rapides vers certains onglets

Limites actuelles :
- pas de graphiques
- pas de comparaison par periode
- pas de rapports analytiques avances

### 3.3 Gestion des produits

Fonctionnalites deja disponibles :
- ajout de produit via fenetre modale
- modification de produit
- suppression de produit avec confirmation
- recherche de produit
- tri par colonnes
- affichage des categories
- affichage des prix d'achat et prix de vente
- affichage du seuil d'alerte
- affichage du fournisseur
- mise a jour du stock via les mouvements

Informations gerees :
- code produit
- nom
- categorie
- prix d'achat
- prix de vente
- quantite
- unite
- seuil d'alerte
- fournisseur

Limites actuelles :
- pas de fiche produit detaillee
- pas de gestion d'image produit
- pas de code-barres

### 3.4 Gestion des clients

Fonctionnalites deja disponibles :
- ajout de client
- recherche client
- affichage des clients
- affichage des coordonnees

Informations gerees :
- nom
- telephone
- adresse
- e-mail
- date de creation

Limites actuelles :
- pas de modification client
- pas de suppression client
- pas d'historique detaille par client
- pas de compte client / creance client

### 3.5 Stock initial

Fonctionnalites deja disponibles :
- alimentation du stock initial via l'ajout de produit avec quantite
- suivi des entrees initiales dans les mouvements de stock
- restitution dans les indicateurs de stock

Limites actuelles :
- pas de formulaire dedie complet de saisie stock initial independant
- pas de justificatif ou reference documentaire

### 3.6 Reapprovisionnement

Fonctionnalites deja disponibles :
- enregistrement de reapprovisionnement via les mouvements de produit
- suivi dans l'historique de stock
- impact sur le stock actuel
- affichage dans les tableaux de suivi

Limites actuelles :
- pas de workflow d'achat complet
- pas de bon de commande fournisseur
- pas de reception multi-lignes dediee

### 3.7 Ventes

Fonctionnalites deja disponibles :
- creation de vente via fenetre modale
- selection du client ou vente comptoir
- ajout de plusieurs lignes de vente
- calcul automatique du total
- verification du stock avant validation
- enregistrement de la vente
- consultation du detail d'une facture
- impression de facture
- export PDF de facture
- recherche dans les ventes
- indicateurs de ventes

Informations gerees :
- reference de facture
- client
- date
- mode de paiement
- statut
- lignes produit
- quantites
- montant total

Limites actuelles :
- pas d'annulation / avoir
- pas de remise
- pas de taxe / TVA
- pas de paiement partiel
- pas de statut de reglement avance

### 3.8 Stock actuel

Fonctionnalites deja disponibles :
- affichage du stock actuel par produit
- calcul des entrees
- calcul des sorties
- calcul du stock restant
- calcul de la valeur du stock
- calcul du prix d'achat moyen
- filtres par categorie
- filtres par statut
- recherche produit
- export CSV
- affichage des alertes
- ligne de total

Statuts affiches :
- stock correct
- stock faible
- rupture

Limites actuelles :
- pas de valorisation historique
- pas de mouvements de correction manuelle
- pas de gestion de plusieurs depots

### 3.9 Utilisateurs

Fonctionnalites deja disponibles :
- ajout d'utilisateur
- affichage de la liste des utilisateurs
- changement de role
- reinitialisation d'acces
- suppression d'utilisateur
- recherche utilisateur
- affichage des comptes actifs

Informations gerees :
- nom complet
- nom d'utilisateur
- e-mail
- role
- actif / non actif
- date de creation
- derniere activite

Limites actuelles :
- pas de mot de passe
- pas de permissions fines par fonctionnalite
- pas de journal de connexion detaille

### 3.10 Historique

Fonctionnalites deja disponibles :
- affichage d'un historique d'activite general
- recherche dans l'historique
- suivi des creations
- suivi des mises a jour
- suivi des suppressions
- suivi des actions sur ventes, produits, clients et utilisateurs

Exemples d'actions historisees :
- creation produit
- mise a jour produit
- suppression produit
- creation client
- creation utilisateur
- changement de role utilisateur
- reinitialisation d'acces
- suppression utilisateur
- creation vente

Limites actuelles :
- pas de filtres avances par module
- pas d'export de l'historique
- pas de visualisation detaillee par utilisateur

## 4. Documents et impression

Fonctionnalites deja disponibles :
- fenetre de detail de facture
- impression
- export PDF
- logo entreprise sur la facture
- informations legales et de contact sur la facture

Contenu de facture actuel :
- logo
- nom entreprise
- RCCM
- Id.NAT
- N° Impot
- contact
- reference facture
- date
- client
- mode de paiement
- lignes facture
- total

Limites actuelles :
- l'impression a encore fait l'objet de plusieurs corrections et doit etre consideree comme sensible
- pas de modele de facture multiple
- pas d'en-tete / pied de page parametrable

## 5. Recherche et ergonomie

Fonctionnalites deja disponibles :
- recherche globale dans le bandeau
- recherche locale dans plusieurs onglets
- tri sur certains tableaux
- confirmations de suppression
- notifications toast
- etats vides
- formulaires en fenetres pop-up

Limites actuelles :
- pas de pagination
- pas de tri avance sur tous les tableaux
- pas de filtres multicriteres generaux

## 6. Base de donnees actuelle

Tables presentes :
- users
- clients
- products
- initial_stocks
- replenishments
- sales
- sale_items
- stock_movements
- audit_logs

Vue presente :
- current_stock_view

Remarque :
La logique actuelle repose sur SQLite en local via Electron.

## 7. Fonctions techniques deja presentes

Fonctionnalites techniques constatees :
- backend Electron
- base SQLite locale
- interface React
- packaging Windows en .exe
- logo personnalise
- impression de facture
- export PDF
- export CSV pour le stock

## 8. Manques fonctionnels identifies

Voici les principaux points qui ne sont pas encore couverts ou qui restent incomplets :

- authentification avec mot de passe
- gestion fine des droits par role
- edition et suppression des clients
- workflow d'achat complet
- gestion des fournisseurs comme entite propre
- bon de commande
- retour / annulation de vente
- remise et taxes
- multi-depots ou multi-magasins
- rapports statistiques avances
- export Excel/PDF de plusieurs modules
- parametres entreprise modifiables depuis l'interface
- numerotation avancee des factures
- sauvegarde / restauration de base
- parametrage de l'impression

## 9. Priorites recommandees pour la suite

### Priorite 1
- stabiliser totalement impression et export PDF
- ajouter une vraie authentification
- ajouter edition / suppression client
- ajouter parametrage entreprise

### Priorite 2
- transformer fournisseurs en vrai module
- creer un module achats / approvisionnements complet
- ajouter rapports et exports supplementaires

### Priorite 3
- permissions fines par role
- sauvegarde et restauration
- tableaux de bord avances
- parametrage metier complet

## 10. Conclusion

L'application couvre deja un noyau de gestion commerciale utile :
- produits
- clients
- stock
- ventes
- utilisateurs
- historique
- facture

Elle n'est cependant pas encore une solution de gestion totalement aboutie sur le plan metier, documentaire et securitaire.

Ce document peut servir de base pour :
- valider l'existant
- lister les ecarts
- preparer un cahier des charges version 2 avec les ajouts souhaites
