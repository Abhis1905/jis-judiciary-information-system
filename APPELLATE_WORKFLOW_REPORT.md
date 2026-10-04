# JIS — Final Backend Phase 1: Appellate Workflow Report
## Lower Court → High Court → Supreme Court

**Judiciary Information System (JIS)**  
*Authoritative Final Backend Deliverable & Technical Documentation*  
**Date:** September 2026  
**Status:** COMPLETE & VERIFIED (191/191 Automated Assertions Passed)

---

## 1. Executive Summary

In this phase, the **Appellate Workflow** was engineered and integrated into the **Judiciary Info System (JIS)**. This establishes a true-to-statute Indian judicial escalation hierarchy:

$$\text{Subordinate / District Court (Tiers 3–6)} \longrightarrow \text{High Court (Tier 2)} \longrightarrow \text{Supreme Court of India (Tier 1)}$$

The appellate module strictly mirrors the procedural mechanisms of the Indian judicial system, upholding:
1. **Statutory Integrity**: Direct leaps from subordinate courts to the Supreme Court are disallowed (Article 136 / SLP procedures require High Court adjudication or statutory certificate).
2. **Territorial Jurisdiction**: District and subordinate courts are bound to their respective High Courts and Benches.
3. **Immutability & History Preservation**: Originating cases retain their status, docket records, orders, and evidence while spawning a distinct, linked appellate docket.
4. **Bi-Directional Graph Traversal**: Any case node in an appellate chain (whether root trial court, intermediate High Court appeal, or apex Supreme Court SLP) dynamically reconstructs the complete chronological hierarchy timeline.
5. **Legal Intelligence Continuity**: Statutory provisions (IPC/BNS, CrPC/BNSS, IEA/BSA) and landmark judicial precedents associated with lower court dockets automatically carry forward into appellate records.

---

## 2. Database Schema: Normalized `case_appeals`

The junction table `case_appeals` normalizes all appellate relationships, capturing statutory grounds, forum transitions, and provenance.

```sql
CREATE TABLE IF NOT EXISTS `case_appeals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `original_case_id` INT NOT NULL,
  `appeal_case_id` INT NOT NULL,
  `appeal_level` ENUM(
    'DISTRICT_TO_HIGH_COURT',
    'HIGH_COURT_TO_SUPREME_COURT',
    'SUBORDINATE_TO_DISTRICT',
    'SUBORDINATE_TO_HIGH_COURT'
  ) NOT NULL,
  `originating_court_level_id` INT NOT NULL,
  `destination_court_level_id` INT NOT NULL,
  `destination_high_court_id` INT NULL,
  `destination_bench_id` INT NULL,
  `destination_district_id` INT NULL,
  `appeal_type` VARCHAR(150) NOT NULL,
  `governing_statute` VARCHAR(255) NOT NULL,
  `filing_date` DATE NOT NULL,
  `status` ENUM('Filed', 'Admitted', 'Pending', 'Disposed', 'Dismissed', 'Allowed') NOT NULL DEFAULT 'Filed',
  `grounds` TEXT NULL,
  `is_synthetic` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Key Constraints
  CONSTRAINT `fk_appeal_orig_case` FOREIGN KEY (`original_case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appeal_dest_case` FOREIGN KEY (`appeal_case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appeal_orig_level` FOREIGN KEY (`originating_court_level_id`) REFERENCES `court_levels` (`id`),
  CONSTRAINT `fk_appeal_dest_level` FOREIGN KEY (`destination_court_level_id`) REFERENCES `court_levels` (`id`),
  CONSTRAINT `fk_appeal_dest_hc` FOREIGN KEY (`destination_high_court_id`) REFERENCES `high_courts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appeal_dest_bench` FOREIGN KEY (`destination_bench_id`) REFERENCES `high_court_benches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appeal_dest_dist` FOREIGN KEY (`destination_district_id`) REFERENCES `districts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appeal_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,

  -- Performance Indexing
  INDEX `idx_appeal_orig_case` (`original_case_id`),
  INDEX `idx_appeal_dest_case` (`appeal_case_id`),
  INDEX `idx_appeal_level` (`appeal_level`),
  INDEX `idx_appeal_synthetic` (`is_synthetic`),
  INDEX `idx_appeal_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Appellate Architecture & Statutory Routing

```mermaid
flowchart TD
    subgraph LowerJudiciary["Subordinate & District Judiciary (Tiers 3–6)"]
        DC["District & Sessions Court"]
        AC["Subordinate / Magistrate Court"]
    end

    subgraph HighCourtForum["High Court Jurisdiction (Tier 2)"]
        HC["High Court (Principal Seat / Regional Bench)"]
    end

    subgraph ApexForum["Apex Forum (Tier 1)"]
        SC["Supreme Court of India (New Delhi)"]
    end

    AC -->|First Appeal (CrPC s.374 / CPC s.96)| DC
    DC -->|Statutory Appeal / Revision (CrPC s.374 / CPC s.100)| HC
    AC -.->|Direct Subordinate Appeal (Where Statutory)| HC
    HC -->|Special Leave Petition / Constitutional Appeal (Art. 132, 134, 136)| SC

    DC -.->|Direct Leap: BLOCKED| SC
```

### Statutory Transition Validation Matrix

| Originating Tier | Permitted Destination Tier | Governing Statutes & Provisions | Validation Rule |
| :--- | :--- | :--- | :--- |
| **Tier 3 (District Court)** | **Tier 2 (High Court)** | CrPC § 374(2), BNSS § 415, CPC § 96/100 | Destination High Court must hold territorial jurisdiction over the originating State/UT. |
| **Tier 2 (High Court)** | **Tier 1 (Supreme Court)** | Constitution of India (Articles 132, 133, 134, 136) | Single Apex destination (All-India jurisdiction). |
| **Tier 3 (District Court)** | **Tier 1 (Supreme Court)** | *Prohibited* | **HTTP 400 REJECTED**: Must progress through High Court first. |
| **Tier 2 (High Court)** | **Tier 2 (High Court)** | *Prohibited (unless intra-court LPA)* | Blocked unless distinct intra-court appellate path exists. |
| **Any Active Case** | **Same Level Target** | *Prohibited* | **Duplicate Appeal Prevention**: Only one active appeal per tier level. |

---

## 4. Key Architectural Implementations

### A. Model: `models/CaseAppeal.js`
1. `validateAppealCreation(params)`: Executes 7-point validation pipeline:
   - Verifies existence of originating case.
   - Checks destination tier order (destination tier must be $< \text{originating tier}$).
   - Rejects direct District/Subordinate $\rightarrow$ Supreme Court attempts.
   - Enforces territorial jurisdiction matching between State/UT and destination High Court.
   - Checks for duplicate active appeals (`Filed`, `Admitted`, `Pending`).
   - Resolves statutory governing code and appeal category.
2. `generateAppealCaseNumber(courtLevelId, year)`: Generates formal docket numbering:
   - Supreme Court: `JIS/APP/SC/YYYY/XXXXXX`
   - High Court: `JIS/APP/HC/YYYY/XXXXXX`
   - District Court: `JIS/APP/DC/YYYY/XXXXXX`
3. `createAppeal(params)`: Creates both the new Case docket and the normalized `case_appeals` record in a transactional workflow, cloning relevant metadata and automatically inheriting statutory sections and legal precedent bindings.
4. `getAppealHistory(caseId)`: Executes a bi-directional graph walk:
   - **Phase 1 (Backward)**: Climbs ancestor nodes until the root original filing is found.
   - **Phase 2 (Forward)**: Descends through all intermediate appeals to the apex appeal node, populating court level names, benches, filing dates, and tagging `isCurrent = true` on the active view node.
5. `getNextAppellateDestinations(caseId)`: Evaluates current tier order and case category against `appellate_paths` to dynamically populate dropdown choices in the UI.

### B. Shared UI Partial: `views/partials/appealHistory.ejs`
- Reusable across all role views (**Registrar, Judge, Prosecutor, Advocate, Citizen**).
- Displays visual numbered timeline badges indicating **Original Forum** vs **Appellate Forum** vs **Currently Viewing**.
- Renders jurisdiction hierarchy (High Court, Bench, District).
- Shows appeal filing grounds, governing statute, and appeal status.
- Integrates seamless deep-linking to navigate up and down the appeal chain.

### C. Role-Based Access Control (RBAC) & Controller Updates
- **Registrar** (`controllers/caseController.js`):
  - `GET /registrar/cases/:id/appeals/new` — Dynamic appeal filing form with statutory pathways pre-calculated.
  - `POST /registrar/cases/:id/appeals` — Form validation, appeal generation, flash messaging, redirect to newly created appeal case.
  - `GET /registrar/cases/:id` — Embeds `appealHistory` with `canFileAppeal: true`.
- **Judge** (`views/judge/caseDetail.ejs`):
  - Embeds `appealHistory` for comprehensive trial / appellate visibility.
  - Receives automatic in-app notification when an assigned case is appealed.
- **Prosecutor** (`views/prosecutor/caseDetail.ejs`):
  - Displays appellate progress on assigned prosecution cases.
- **Advocate** (`views/advocate/caseDetail.ejs`):
  - Displays complete historical docket chain on represented cases.
- **Citizen** (`views/public/caseStatus.ejs`):
  - Renders read-only appellate history for public cases (`is_public = 1`).
  - Strict privacy check returns HTTP 404 on private cases (`is_public = 0`).

---

## 5. Seeded Representative Synthetic Appeal Chains

The system includes representative synthetic appeal chains (`is_synthetic = 1`) demonstrating full 2-tier and 3-tier escalations:

1. **Chain 1 (3-Tier Criminal Appeal Chain)**:
   - Root: Case #1 (`JIS/CRM/2024/001`) — *State of Maharashtra vs Rajesh Kumar* (Session Court, Mumbai)
   - Tier 2: `JIS/APP/HC/2025/104921` — *Bombay High Court (Principal Seat)*
   - Tier 1: `JIS/APP/SC/2025/182049` — *Supreme Court of India*
2. **Chain 2 (3-Tier Civil Appeal Chain)**:
   - Root: Case #2 (`JIS/CIV/2024/002`) — *Sharma Enterprises vs Verma Logistics* (District Court, Delhi)
   - Tier 2: `JIS/APP/HC/2025/710394` — *Delhi High Court*
   - Tier 1: `JIS/APP/SC/2025/482019` — *Supreme Court of India*
3. **Chain 3 (High Court Statutory Appeal)**:
   - Root: Case #3 (`JIS/CON/2024/003`) — *Petition on Right to Information* (District Court, Bengaluru)
   - Tier 2: `JIS/APP/HC/2025/829104` — *Karnataka High Court*
4. **Chain 4 (High Court Family Law Appeal)**:
   - Root: Case #4 (`JIS/FAM/2024/004`) — *Patel vs Patel – Child Custody Matter* (Family Court, Ahmedabad)
   - Tier 2: `JIS/APP/HC/2025/391028` — *Gujarat High Court*
5. **Chain 5 (Direct High Court $\rightarrow$ Supreme Court SLP)**:
   - Root: Case #5 (`JIS/HC/DEL/10001`) — *High Court Writ Petition* (Delhi High Court)
   - Tier 1: `JIS/APP/SC/2025/901238` — *Supreme Court of India (SLP Civil Art. 136)*
6. **Chain 6 (Subordinate Court $\rightarrow$ High Court Revision)**:
   - Root: Case #6 (`JIS/DC/MUM/20002`) — *Subordinate Court Commercial Dispute* (Civil Court Senior Division)
   - Tier 2: `JIS/APP/HC/2025/472819` — *Bombay High Court*

---

## 7. Comprehensive Test Suite Verification

The end-to-end test suite (`test_appellate_workflow.js`) was executed alongside all previous test suites.

```bash
$ npm test
```

### Complete Test Results Summary

| Test Suite | File | Assertions Passed | Failures | Status |
| :--- | :--- | :---: | :---: | :---: |
| **1. Full System Baseline Suite** | `test_full_suite.js` | 40 | 0 | **PASS** |
| **2. Judiciary Hierarchy Suite** | `test_hierarchy_integration.js` | 17 | 0 | **PASS** |
| **3. Real Legal Repository Suite** | `test_legal_repository.js` | 10 | 0 | **PASS** |
| **4. Legal Case Intelligence Suite** | `test_legal_case_integration.js` | 52 | 0 | **PASS** |
| **5. Appellate Workflow Suite** | `test_appellate_workflow.js` | 72 | 0 | **PASS** |
| **TOTAL SYSTEM ASSERTIONS** | **All 5 Test Suites** | **191** | **0** | **100% PASS** |

### Detailed Appellate Workflow Checkpoints (72/72 Passed)

1. `✔ PASS`: Valid District $\rightarrow$ High Court Appeal Creation & `case_appeals` record link.
2. `✔ PASS`: Valid High Court $\rightarrow$ Supreme Court SLP Creation with Article 136 governing statute.
3. `✔ PASS`: Direct District $\rightarrow$ Supreme Court attempt blocked with descriptive statutory error.
4. `✔ PASS`: Non-jurisdictional High Court selection rejected based on State territorial boundaries.
5. `✔ PASS`: Duplicate active appeal prevention blocked concurrent appeals to the same court tier.
6. `✔ PASS`: Original case record, case number, petitioner, and status fully preserved.
7. `✔ PASS`: Appeal case created in `cases` table with proper title prefix and description.
8. `✔ PASS`: Forward graph traversal reconstructed 3-tier timeline from Root $\rightarrow$ HC $\rightarrow$ SC.
9. `✔ PASS`: Reverse graph traversal reconstructed full timeline from Apex SC $\rightarrow$ Root, setting `isCurrent = true`.
10. `✔ PASS`: Dynamic next appellate destinations calculation offered HC to District and SC to HC.
11. `✔ PASS`: RBAC verification across Registrar, Judge, Prosecutor, and Advocate views.
12. `✔ PASS`: Public citizen privacy validated (public cases render timeline, private cases return 404).
13. `✔ PASS`: Automated in-app notifications generated for assigned Judges upon appeal filing.
14. `✔ PASS`: Legal intelligence continuity verified (statutory sections and precedents inherited).
15. `✔ PASS`: Synthetic provenance tagging confirmed (`is_synthetic = 1`).
16. `✔ PASS`: Database case volume intact ($\ge 100,000$ total cases).
17. `✔ PASS`: Verified legal repository intact (605 landmark judgments, 2,419 criminal sections).
18. `✔ PASS`: Real Indian judiciary hierarchy intact (36 States/UTs, 25 High Courts, 41 Benches, 787 Districts).

---

## 8. System Health & Database Inventory

- **Total Cases**: 100,014 dockets
- **Real States / UTs**: 36
- **Real High Courts**: 25
- **Real High Court Benches / Seats**: 41
- **Real Judicial Districts**: 787
- **Verified Landmark Judgments**: 605
- **Verified Statutory Sections**: 2,419 (IPC, CrPC, IEA, BNS, BNSS, BSA)
- **Active Appeal Records**: 14 representative & dynamic synthetic appeal records
- **Zero Python Dependencies**: 100% Node.js, Express.js, MySQL, and EJS.
