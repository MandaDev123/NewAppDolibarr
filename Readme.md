# 📋 Vue d'ensemble du Projet — Dolibarr ERP + NewApp

> **Statut global :** 🟡 En cours  
> **Dernière mise à jour :** Juin 2026

---

## 1. Mise en place de Dolibarr v23 en local

### 1.1 Téléchargement

- **Source officielle :** [https://www.dolibarr.org/](https://www.dolibarr.org/)
- **Version cible :** Dolibarr 23.x (dernière stable)
- **Package recommandé :** DoliWamp (Windows) ou archive `.zip`/`.tar.gz` (Linux/Mac)

### 1.2 Prérequis techniques

| Composant | Version minimale |
|-----------|-----------------|
| PHP | 7.4+ (8.x recommandé) |
| MySQL / MariaDB | 5.5+ |
| Apache / Nginx | 2.4+ |
| Navigateur moderne | Chrome, Firefox, Edge |

### 1.3 Installation locale (stack LAMP/WAMP/MAMP)

```bash
# 1. Télécharger l'archive depuis dolibarr.org
# 2. Décompresser dans le répertoire web (ex: /var/www/html/dolibarr)
# 3. Créer une base de données MySQL
mysql -u root -p -e "CREATE DATABASE dolibarr CHARACTER SET utf8mb4;"

# 4. Accéder à l'installeur via navigateur
http://localhost/dolibarr/install/
```

- Suivre l'assistant d'installation web (configuration BDD, compte admin)
- Supprimer ou renommer le dossier `install/` après la première installation

### 1.4 Vérification

- Connexion à `http://localhost/dolibarr`
- Accès au tableau de bord administrateur
- Activation des modules souhaités via **Configuration → Modules/Applications**

---

## 2. Compréhension du module GRH (Gestion des Ressources Humaines)

### 2.1 Produit

Le module **Produit** dans Dolibarr permet de gérer le catalogue de biens et services de l'entreprise.

**Fonctionnalités clés :**
- Création de fiches produit (référence, libellé, description, prix)
- Gestion des catégories produits
- Paramétrage TVA et unités de mesure
- Association aux fournisseurs et clients
- Suivi des prix d'achat / vente

**Chemin d'accès :** `Produits/Services → Produits → Nouveau produit`

---

### 2.2 Entrepôt (Gestion des Stocks)

Le module **Entrepôt** gère les mouvements de stock et les inventaires physiques.

**Fonctionnalités clés :**
- Création et gestion de plusieurs entrepôts
- Mouvements de stock : entrées, sorties, transferts inter-entrepôts
- Gestion des lots et numéros de série
- Inventaire et régularisation des stocks
- Alertes sur seuils de stock minimum

**Chemin d'accès :** `Produits/Services → Stocks → Entrepôts`

---

### 2.3 Congés (Gestion des absences)

Le module **Congés** permet le suivi des demandes et soldes de congés des collaborateurs.

**Fonctionnalités clés :**
- Soumission de demandes de congés par les employés
- Workflow de validation (employé → manager → RH)
- Paramétrage des types d'absence (congés payés, RTT, maladie…)
- Calcul automatique des soldes et droits
- Calendrier des absences par équipe/service
- Export des données RH

**Chemin d'accès :** `RH → Congés → Nouvelle demande`

---

### 2.4 Note de frais

Le module **Note de frais** gère le remboursement des dépenses professionnelles.

**Fonctionnalités clés :**
- Saisie des dépenses avec pièces justificatives (PDF, image)
- Catégorisation des frais (transport, hébergement, repas…)
- Workflow de validation et approbation
- Génération du bon de remboursement
- Export comptable vers les modules Finance/Comptabilité
- Suivi du statut (brouillon → soumis → validé → remboursé)

**Chemin d'accès :** `RH → Notes de frais → Nouvelle note`

---

## 3. TODO — NewApp : Application complémentaire

> **Technologie choisie :** React (+ Vite) — moderne, écosystème riche, compatible API REST Dolibarr  
> **Objectif :** Pages additionnelles liées à l'ERP existant (ExistingApp / Dolibarr)

### 3.1 Architecture cible

```
ExistingApp (Dolibarr)          NewApp (React + Vite)
        |                               |
        |<--- API REST Dolibarr ------->|
        |                        SQLite (local)
```

---

### 3.2 Fonctionnalité 1 — Réinitialisation de données

**Description :** Interface permettant de remettre à zéro certains jeux de données (utile pour les environnements de démo ou de test).

**Périmètre :**
- Sélection du périmètre à réinitialiser (produits, stocks, congés, notes de frais)
- Confirmation obligatoire (modale de sécurité)
- Log des opérations de reset
- Possibilité de sauvegarde avant reset (export JSON/CSV)

**Stack technique :**
- Frontend : React + Tailwind CSS
- Appel API : `DELETE /api/index.php/...` (API REST Dolibarr)
- Stockage local : SQLite (journalisation des resets)

---

### 3.3 Fonctionnalité 2 — Import de fichier

**Description :** Module d'import de données depuis des fichiers externes vers Dolibarr.

**Formats supportés (cible) :**
- CSV (produits, contacts, stocks)
- Excel `.xlsx`
- JSON

**Périmètre :**
- Glisser-déposer ou sélection de fichier
- Prévisualisation des données avant import
- Mapping des colonnes vers les champs Dolibarr
- Rapport d'import (succès / erreurs ligne par ligne)
- Historique des imports stocké en SQLite

**Stack technique :**
- Frontend : React + `react-dropzone` + `papaparse` (CSV) / `xlsx` (Excel)
- Backend : API REST Dolibarr (`POST /api/index.php/...`)
- Stockage : SQLite (historique et mapping sauvegardés)

---

### 3.4 Fonctionnalité 3 — Utilisation de SQLite

**Description :** Base de données locale légère pour la persistance des données NewApp, sans dépendance au serveur Dolibarr.

**Cas d'usage :**
- Stockage de l'historique des imports
- Journalisation des resets
- Cache de données offline
- Préférences utilisateur et mappings personnalisés

**Implémentation :**
- Librairie : `better-sqlite3` (Node.js) ou `sql.js` (browser/WASM)
- Schéma : fichier `schema.sql` versionné avec migrations simples
- Localisation du fichier DB : `./data/newapp.db`

```sql
-- Exemple de schéma
CREATE TABLE import_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  import_type TEXT NOT NULL,  -- 'products', 'stocks', 'contacts'
  rows_success INTEGER DEFAULT 0,
  rows_error INTEGER DEFAULT 0,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reset_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  performed_by TEXT,
  performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  backup_path TEXT
);
```

---

## 4. Récapitulatif & Roadmap

| # | Tâche | Priorité | Statut |
|---|-------|----------|--------|
| 1 | Installation Dolibarr v23 en local | 🔴 Haute | ⬜ À faire |
| 2 | Activation modules GRH (Produit, Entrepôt, Congés, NDF) | 🔴 Haute | ⬜ À faire |
| 3 | Exploration & tests du module Produit | 🟡 Moyenne | ⬜ À faire |
| 4 | Exploration & tests du module Entrepôt | 🟡 Moyenne | ⬜ À faire |
| 5 | Exploration & tests du module Congés | 🟡 Moyenne | ⬜ À faire |
| 6 | Exploration & tests du module Note de frais | 🟡 Moyenne | ⬜ À faire |
| 7 | Init projet NewApp (React + Vite) | 🟡 Moyenne | ⬜ À faire |
| 8 | Connexion NewApp ↔ API REST Dolibarr | 🔴 Haute | ⬜ À faire |
| 9 | Feature : Réinitialisation de données | 🟢 Basse | ⬜ À faire |
| 10 | Feature : Import de fichier | 🟢 Basse | ⬜ À faire |
| 11 | Feature : Intégration SQLite | 🟢 Basse | ⬜ À faire |

---

## 5. Ressources utiles

- 📖 Documentation Dolibarr : [https://wiki.dolibarr.org/](https://wiki.dolibarr.org/)
- 🔌 API REST Dolibarr : `http://localhost/dolibarr/api/index.php/explorer/`
- ⚛️ React + Vite : [https://vitejs.dev/guide/](https://vitejs.dev/guide/)
- 🗄️ better-sqlite3 : [https://github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- 📦 DoliWamp (install Windows) : [https://sourceforge.net/projects/doliwamp/](https://sourceforge.net/projects/doliwamp/)