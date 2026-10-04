# JIS – Database Backup & Restore Guide

This document provides complete instructions for creating, verifying, and restoring backups for the **Judiciary Info System (JIS)** database (`jis_db`), as well as provisioning the isolated test database (`jis_test_db`).

---

## 1. Overview & Architecture

The JIS database (`jis_db`) contains 26 normalized tables consisting of:
- **Judiciary Hierarchy**: 36 States/UTs, 25 High Courts, 36 High Court Jurisdictions, 41 Benches/Seats, 787 Judicial Districts, 6 Court Levels, 13 Appellate Pathways, and 3,152 Subordinate Courts (`ON DELETE RESTRICT`).
- **Legal Repository**:
  - 2,419 Statutory Sections across 10 Acts (IPC, CrPC, IEA, BNS, BNSS, BSA, Constitution, CPC, CCA, FCA) and 177 Chapters (`ON DELETE RESTRICT`).
  - 149 Old $\leftrightarrow$ New Criminal Law Mappings (`ON DELETE RESTRICT`).
  - 605 Legal Judgments with explicit provenance columns (`is_synthetic`, `record_provenance`): **105 `REAL_VERIFIED`** (84 Supreme Court + 21 High Court) and **500 `SYNTHETIC_REPRESENTATIVE`** (130 Supreme Court + 345 High Court + 25 District Court).
- **Case Dockets**: 100,000 Base Synthetic Cases + 14 Multi-Tier Synthetic Appellate Workflow Dockets (Total: 100,014 Cases).
- **Normalized Relationships**: 235,054 Case-to-Legal-Section links and 190,026 Case-to-Judgment links.
- **RBAC, Sessions & Workflows**: Users, persistent `sessions`, hearings, notices, trial notes, documents, pleadings, e-filings, vakalatnamas, judgements, and notifications.

### Design Principles
1. **Zero External Binary Dependency**: Utilizes pure Node.js + `mysql2/promise` batch streaming.
2. **Credential-Free SQL Dumps**: Does not embed database credentials or sensitive connection strings into the generated SQL files.
3. **Git-Ignored Backup Storage (`L-7`)**: The `backups/` directory is listed in `.gitignore` so large SQL dumps are never accidentally committed to version control.
4. **Foreign Key Integrity**: Generates dumps wrapped in `SET FOREIGN_KEY_CHECKS = 0;` and `SET FOREIGN_KEY_CHECKS = 1;` to ensure collision-free table restoration.

---

## 2. Generating a Database Backup

To create a timestamped backup file in the `backups/` directory:

```bash
# Using npm script
npm run db:backup

# Or executing directly with Node.js
node scripts/backup_database.js
```

---

## 3. Verifying the Backup

To verify that the generated backup is non-empty, structurally intact, and contains all required critical tables and valid DDL/DML:

```bash
# Verify the latest backup in backups/
npm run verify:backup
```

---

## 4. Restoring the Database

### Method A: Fresh Schema Initialization Only (`database/schema.sql`)

`database/schema.sql` is the complete, self-contained source of truth for all 26 tables (`H-1`):

```bash
mysql -h localhost -P 3307 -u root < database/schema.sql
```

### Method B: Full Data Restore Using MySQL CLI

```bash
# 1. Ensure the target database exists
mysql -h localhost -P 3307 -u root -e "CREATE DATABASE IF NOT EXISTS jis_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Import the backup file
mysql -h localhost -P 3307 -u root jis_db < backups/<latest_backup>.sql
```

---

## 5. Provisioning the Isolated Test Database (`jis_test_db`)

All automated tests run strictly against `jis_test_db` (configured in `.env.test`) so that `jis_db` (with 100,014 cases) is never mutated by test runs (`C-5`):

```bash
# Recreate jis_test_db from database/schema.sql and seed deterministic 514-case fixture
npm run test:setup

# Run all 6 test suites (260 deterministic assertions) against jis_test_db
npm test
```

### Expected Baseline Counts (`jis_db`):
| Entity | Required Count | Description |
| :--- | :--- | :--- |
| **Cases (`jis_db`)** | `100,014` | 100,000 synthetic base cases + 14 synthetic appellate dockets |
| **Cases (`jis_test_db`)** | `514` | 500 base fixture cases + 14 appellate dockets |
| **Appeals** | `14` | Multi-tier trial $\rightarrow$ HC $\rightarrow$ SC appeal records (`provenance = 'SYNTHETIC_WORKFLOW'`) |
| **States / UTs** | `36` | Full Indian States & Union Territories |
| **High Courts** | `25` | Constitutional High Courts of India |
| **High Court Benches** | `41` | Principal Seats & Permanent Benches |
| **Judicial Districts** | `787` | Real verified judicial districts |
| **Subordinate Courts** | `3,152` | Subordinate judicial complexes |
| **Legal Judgments** | `605` | **105 `REAL_VERIFIED`** (84 SC + 21 HC) + **500 `SYNTHETIC_REPRESENTATIVE`** (130 SC + 345 HC + 25 District) |
| **Statutory Sections** | `2,419` | IPC, CrPC, IEA, BNS, BNSS, BSA, Constitution, CPC, CCA, FCA |
| **Old $\leftrightarrow$ New Mappings** | `149` | IPC $\leftrightarrow$ BNS, CrPC $\leftrightarrow$ BNSS, IEA $\leftrightarrow$ BSA |
| **Orphan Records** | `0` | 100% referential integrity maintained |
