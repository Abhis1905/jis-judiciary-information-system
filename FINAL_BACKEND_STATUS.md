# JIS – Final Backend Status & Architecture Report

**Judiciary Information System (JIS)**  
*Web Technology Academic Implementation — Post-Independent Audit Hardening & Final Backend Verification*

---

## Executive Summary

The backend implementation, data integration, legal intelligence repository, appellate workflow engine, performance tuning, and post-audit security hardening for the **Judiciary Info System (JIS)** are **100% COMPLETE, VERIFIED, AND HARDENED**.

The application runs on **Node.js + Express + MySQL 8.0 + EJS**, backed by:
- **100,014 Total Case Dockets in `jis_db`** (100,000 synthetic base cases + 14 multi-tier synthetic appellate workflow dockets).
- **Isolated Test Database (`jis_test_db`)** provisioned from `database/schema.sql` with a deterministic 514-case fixture (500 base + 14 appellate) so automated test runs never mutate `jis_db` (`C-5`).
- **Verified Real Indian Judiciary Hierarchy** covering all 36 States/UTs, 25 High Courts, 41 High Court Benches, 787 Judicial Districts, and 3,152 Subordinate Court complexes, protected by `ON DELETE RESTRICT` foreign keys (`H-5`).
- **Legal Knowledge Repository** containing:
  - **2,419 Verified Statutory Sections** across 10 major Indian Acts (IPC, CrPC, IEA, BNS, BNSS, BSA, Constitution, CPC, CCA, FCA).
  - **149 Verified Old $\leftrightarrow$ New Criminal Law Mappings** (IPC $\leftrightarrow$ BNS, CrPC $\leftrightarrow$ BNSS, IEA $\leftrightarrow$ BSA).
  - **605 Legal Judgments** with explicit database and UI provenance classification (`C-4`, `L-5`):
    - **105 `REAL_VERIFIED` (`is_synthetic = 0`)**: 84 Supreme Court landmark judgments + 21 High Court landmark judgments with genuine party names, citations, and holdings.
    - **500 `SYNTHETIC_REPRESENTATIVE` (`is_synthetic = 1`)**: 130 Supreme Court `(No. 2/3/4/5)` template expansions + 345 High Court `Matter of ...` template records + 25 District/Subordinate Court template records used for jurisdiction-wide academic demonstration.
- **260 Automated Test Assertions Passing (0 Failures)** deterministically across all 6 test suites (`L-6`).

---

## 1. System Architecture & Tech Stack

```mermaid
flowchart TD
    subgraph Client Tier
        C[Citizen - Anonymous Public]
        A[Advocate - RBAC Authenticated]
        P[Prosecutor - RBAC Authenticated]
        J[Judge - RBAC Authenticated]
        R[Registrar - RBAC Authenticated]
    end

    subgraph Application Tier [Node.js + Express.js]
        Sec[Helmet-Grade Security Headers + Rate Limiting + CSRF]
        Auth[MySQL-Backed Session Store + Session Regeneration + RBAC]
        Route[Role-Scoped & Public Routers]
        Ctrl[Controllers & State-Machine / Input Validation]
        Model[Data Models, Transactions & Parameterized MySQL2 Queries]
    end

    subgraph Database Tier [MySQL 8.0]
        JH[Real Judiciary Hierarchy<br/>36 States | 25 HCs | 41 Benches | 787 Districts]
        LR[Legal Repository<br/>105 Real + 500 Synthetic Judgments | 2,419 Sections | 149 Mappings]
        CD[Case Dockets<br/>100,000 Base Cases + 14 Multi-Tier Appeals]
        REL[Normalized Relational Junctions<br/>235k Case-Sections | 111k Case-Judgments]
    end

    C --> Sec --> Route
    A & P & J & R --> Sec --> Auth --> Route
    Route --> Ctrl --> Model
    Model --> JH & LR & CD & REL
```

### Technology Matrix
- **Runtime**: Node.js v18+ / v22+
- **Framework**: Express.js 4.19+
- **View Engine**: EJS 3.1+ with Bootstrap 5
- **Database**: MySQL 8.0+ (Port `3307` in `.env`, documented in `.env.example` and `.env.test`)
- **Driver**: `mysql2/promise` (connection pooling, `BEGIN / COMMIT / ROLLBACK` transactions, and parameterized prepared queries)
- **Security & Cryptography**:
  - `bcrypt` password hashing + constant-time dummy hash verification
  - `req.session.regenerate()` on login to prevent session fixation (`C-3`)
  - Persistent `MySQLSessionStore` backed by the `sessions` table (`H-4`)
  - Synchronizer Token Pattern CSRF protection across all POST routes and multipart uploads (`C-2`)
  - Sliding-window rate limiting on login and API endpoints (`H-2`)
  - Helmet-grade HTTP security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`) (`H-3`)

---

## 2. Core Data Models & Database Schemas

All 26 tables are defined in a single authoritative source of truth: [`database/schema.sql`](file:///Users/abhishekjha/Downloads/JIS%20-%20Imple/database/schema.sql) (`H-1`).

### Table & Record Breakdown (`jis_db`)
| Category | Table Name | Verified Record Count | Description / Scope |
| :--- | :--- | :--- | :--- |
| **Hierarchy** | `states_uts` | `36` | All 28 States & 8 Union Territories of India (`ON DELETE RESTRICT`) |
| **Hierarchy** | `high_courts` | `25` | Constitutional High Courts of India (`ON DELETE RESTRICT`) |
| **Hierarchy** | `high_court_jurisdictions` | `36` | State/UT to High Court territorial mapping (`ON DELETE RESTRICT`) |
| **Hierarchy** | `high_court_benches` | `41` | Principal Seats & Permanent Benches (`ON DELETE RESTRICT`) |
| **Hierarchy** | `districts` | `787` | All verified Judicial Districts in India (`ON DELETE RESTRICT`) |
| **Hierarchy** | `subordinate_courts` | `3,152` | Subordinate Judicial Complexes & Taluka Courts (`ON DELETE RESTRICT`) |
| **Hierarchy** | `court_levels` | `6` | 6-tier Indian Court Levels (`ON DELETE RESTRICT`) |
| **Hierarchy** | `appellate_paths` | `13` | Statutory appellate pathways (`ON DELETE RESTRICT`) |
| **Legal Intel** | `legal_acts` | `10` | IPC, CrPC, IEA, BNS, BNSS, BSA, Constitution, CPC, CCA, FCA (`ON DELETE RESTRICT`) |
| **Legal Intel** | `legal_chapters` | `177` | Structural chapters and parts (`ON DELETE RESTRICT`) |
| **Legal Intel** | `legal_sections` | `2,419` | Statutory provisions and legal text (`ON DELETE RESTRICT`) |
| **Legal Intel** | `legal_judgments` | `605` | **105 `REAL_VERIFIED`** (84 SC + 21 HC) + **500 `SYNTHETIC_REPRESENTATIVE`** (130 SC + 345 HC + 25 District) |
| **Legal Intel** | `legal_section_relations` | `149` | Normalized Old $\leftrightarrow$ New Criminal Law mappings (`ON DELETE RESTRICT`) |
| **Cases & Dockets** | `cases` | `100,014` | 100,000 Synthetic Base Cases + 14 Synthetic Multi-Tier Appeals |
| **Appeals** | `case_appeals` | `14` | Multi-tier appellate records with `is_synthetic = 1` and `provenance = 'SYNTHETIC_WORKFLOW'` (`M-10`) |
| **Junctions** | `case_legal_sections` | `235,054` | Normalized Case-to-Statute associations |
| **Junctions** | `case_legal_judgments` | `111,763` | Normalized Case-to-Precedent citations |
| **Sessions** | `sessions` | Dynamic | Persistent MySQL session storage (`H-4`) |
| **RBAC** | `users` | `5` | Seed users across Registrar, Judge, Prosecutor, Advocate roles |

### Architectural Note on Prosecutor Assignment (`H-6`)
Per [`JIS_Page_Specification.md`](file:///Users/abhishekjha/.gemini/antigravity/brain/b28512d1-c50e-4605-9489-4137f1862e63/JIS_Page_Specification.md#L54) (*"Notice there is NO UI to assign a Prosecutor — that is done via DB seed"*) and [`database/schema.sql`](file:///Users/abhishekjha/Downloads/JIS%20-%20Imple/database/schema.sql#L138), Prosecutor assignment is intentionally excluded from the Registrar UI to strictly respect the project's DFD specification.

---

## 3. Real vs. Synthetic Data Provenance (`C-4`, `L-5`, `M-10`)

JIS enforces explicit database and UI provenance separation between verified real legal data and synthetic/representative records:

| Dataset | Total Records | `REAL_VERIFIED` (`is_synthetic = 0`) | `SYNTHETIC_REPRESENTATIVE` (`is_synthetic = 1`) | Provenance Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Judiciary Hierarchy** | 36 States, 25 HCs, 41 Benches, 787 Districts | 100% Real | 0 | Verified Indian judiciary structure |
| **Statutory Sections** | 2,419 Sections (10 Acts) | 100% Real | 0 | Verified statutory structure & temporal validity |
| **Old $\leftrightarrow$ New Mappings** | 149 Mappings | 100% Real | 0 | Verified BPR&D / MHA transition matrix |
| **Supreme Court Judgments** | 214 | **84** | **130** | 84 curated landmark decisions + 130 `(No. 2/3/4/5)` template expansions |
| **High Court Judgments** | 366 | **21** | **345** | 21 curated High Court decisions + 345 `Matter of ...` jurisdiction template records |
| **District Court Judgments** | 25 | **0** | **25** | 25 template-generated subordinate court records |
| **Total Legal Judgments** | **605** | **105** | **500** | Displayed with `REAL / VERIFIED` vs `SYNTHETIC / REPRESENTATIVE` badges |
| **JIS Case Dockets** | 100,014 | 0 | 100,014 | 100,000 synthetic base cases + 14 synthetic appellate workflow dockets |

---

## 4. Performance Optimizations

1. **Composite & B-Tree Indexes**: `idx_created_at`, `idx_public_created`, `idx_case_state`, `idx_case_hc`, `idx_case_district`, `idx_case_level` on `cases`.
2. **FULLTEXT Search Index (`M-4`)**: `FULLTEXT INDEX idx_cases_fulltext (title, petitioner_name, respondent_name)` on `cases`, utilized via `MATCH(...) AGAINST(... IN BOOLEAN MODE)` for multi-character search queries alongside exact prefix matching on `case_number`.
3. **Server-Side Pagination Everywhere (`M-2`, `M-3`)**: Enforced on Registrar (`/registrar/cases`), Judge (`/judge/cases`), Prosecutor (`/prosecutor/cases`), Advocate (`/advocate/cases` and `/advocate/unlinked`), and Citizen (`/search`) views.
4. **Batch Inserts in Appeal Creation (`H-7`)**: Multi-row batch `INSERT IGNORE INTO case_legal_sections` and `case_legal_judgments` inside a single database transaction (`C-1`).

---

## 5. Automated Test Suite Results (`jis_test_db`)

All 6 test suites execute deterministically against `jis_test_db` (`npm test`):

```text
======================================================
 Full JIS Test Suite (test_full_suite.js):              25 PASSED, 0 FAILED
 Hierarchy Integration (test_hierarchy_integration.js): 29 PASSED, 0 FAILED
 Legal Repository HTTP (test_legal_repository.js):      13 PASSED, 0 FAILED
 Case ↔ Legal Intel (test_legal_case_integration.js):   52 PASSED, 0 FAILED
 Appellate Workflow (test_appellate_workflow.js):       73 PASSED, 0 FAILED
 Security & Integrity Audit (test_security_audit.js):   68 PASSED, 0 FAILED
======================================================
 TOTAL DETERMINISTIC ASSERTIONS:                       260 PASSED, 0 FAILED
======================================================
```
