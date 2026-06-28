Phase 0 : La préparation de la base (Sécurité)
Avant de lancer les suppressions, on désactive temporairement la vérification des clés étrangères. C'est indispensable pour que MySQL vous laisse vider les tables interconnectées.

SQL
SET FOREIGN_KEY_CHECKS = 0;
Phase 1 : L'entourage Salaires, RH et Social
On commence par la périphérie de l'entreprise (les modules internes).

llx_expense_report_det (Détails des notes de frais)

llx_expense_report (Entêtes des notes de frais)

llx_payment_salary (Règlements des salaires)

llx_salary (Fiches de salaires)

llx_social_contribution (Charges sociales et cotisations)

llx_holiday (Demandes de congés)

Phase 2 : La chaîne Commerciale (Achats, Ventes, Stocks)
On vide ensuite tout l'historique des flux d'argent et de marchandises avec l'extérieur.

llx_facturedet (Détails des factures clients)

llx_facture (Entêtes des factures clients)

llx_facture_fourn_det (Détails des factures fournisseurs)

llx_facture_fourn (Entêtes des factures fournisseurs)

llx_commandedet (Détails des commandes clients)

llx_commande (Entêtes des commandes clients)

llx_commande_fournisseurdet (Détails des commandes fournisseurs)

llx_commande_fournisseur (Entêtes des commandes fournisseurs)

llx_propaldet (Détails des propositions commerciales)

llx_propal (Entêtes des propositions commerciales)

llx_expeditiondet (Détails des expéditions)

llx_expedition (Entêtes des expéditions)

llx_product_stock (Mouvements et états des stocks)

Phase 3 : La Trésorerie
Une fois les factures et salaires supprimés, on nettoie le compte bancaire.

llx_bank (Écritures et relevés bancaires)

Phase 4 : Les Données de Base (Le Catalogue et les Tiers)
Maintenant que plus aucune facture ni aucun salaire ne fait référence aux clients ou aux produits, on peut vider les fiches de base.

llx_product_price (Historiques des prix)

llx_product (Fiches produits et services)

llx_commercial_action (Événements de l'agenda / CRM)

llx_socpeople (Contacts et adresses des tiers)

llx_societe (Fiches Tiers : clients, prospects, fournisseurs)

Phase 5 : La réactivation des sécurités
Une fois que tout est vidé (TRUNCATE), on réactive immédiatement les vérifications pour que Dolibarr fonctionne à nouveau normalement avec une base saine.

SQL
SET FOREIGN_KEY_CHECKS = 1;
📂 Rappel pour les fichiers (Dossier documents)
Pour les fichiers sur le disque, l'ordre n'a pas d'importance, mais n'oubliez pas de purger ces dossiers dans votre script PHP ou votre commande système :

documents/salary/*

documents/expensereport/*

documents/facture/*

documents/propale/*

documents/produit/*

Modification api_salaries.class.php (C:\xampp\htdocs\dolibarr-23.\htdocs\salaries\class\api_salaries.class.php)
pour permettre la suppression des salaires