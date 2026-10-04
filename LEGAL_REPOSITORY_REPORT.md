# JIS — Legal Knowledge Repository Report

## Landmark Judgments + Statutory Criminal-Law Section Library & Cross-Reference Matrix

**Date:** September 29, 2026  
**System:** JIS (Judiciary Info System) — Legal Knowledge Repository (Post-Audit Verified)  
**Platform:** Node.js v22 + Express.js + MySQL2 (InnoDB) + EJS + Bootstrap 5  

---

## 1. Executive Summary

The **Legal Knowledge Repository** integrated into the Judiciary Info System (JIS) provides a searchable repository of Indian statutory legislation, criminal law transition mappings, and judicial decisions with explicit provenance tracking (`REAL_VERIFIED` vs `SYNTHETIC_REPRESENTATIVE`).

### Key Verified Metrics:
- **Statutory Codes / Acts:** `10` major Indian Acts (`ON DELETE RESTRICT`)
- **Statutory Chapters / Parts:** `177` Chapters (`ON DELETE RESTRICT`)
- **Complete Section Library:** `2,419` Statutory Sections (`ON DELETE RESTRICT`)
- **Old ↔ New Law Cross-Reference Matrix:** `149` Verified Mappings (`ON DELETE RESTRICT`)
- **First Schedule Procedural Classifications:** `29` Offence Classifications
- **Total Legal Judgment Records:** `605` Total Records with explicit `is_synthetic` and `record_provenance` columns:
  - **`REAL_VERIFIED` (`is_synthetic = 0`):** **`105` Genuine Landmark Judgments**
    - **Supreme Court of India (`REAL_VERIFIED`):** `84` genuine landmark rulings (e.g., *Kesavananda Bharati*, *Maneka Gandhi*, *K.S. Puttaswamy*, *Lalita Kumari*, *Arnesh Kumar*, *Bachan Singh*, *Navtej Singh Johar*, *Shayara Bano*, *D.K. Basu*, *Vishaka*).
    - **High Courts (`REAL_VERIFIED`):** `21` genuine High Court decisions across major High Courts (e.g., *Naz Foundation v. Govt. of NCT of Delhi*, *Faheema Shirin v. State of Kerala*, *Subhas Datta v. State of West Bengal*).
  - **`SYNTHETIC_REPRESENTATIVE` (`is_synthetic = 1`):** **`500` Template-Generated Representative Records**
    - **Supreme Court (`SYNTHETIC_REPRESENTATIVE`):** `130` derived `(No. 2/3/4/5)` Companion / Review / Curative template records.
    - **High Courts (`SYNTHETIC_REPRESENTATIVE`):** `345` template-generated `Matter of [High Court] State Litigant ...` records providing multi-state filter coverage across all 25 High Courts.
    - **District & Subordinate Courts (`SYNTHETIC_REPRESENTATIVE`):** `25` template-generated subordinate court records.
- **Additional Reporter Citations:** `824` Citations
- **Section-to-Judgment Links:** `626` Annotations
- **Live JIS Case Records Preserved (`jis_db`):** Exactly `100,014` Cases (`100,000` synthetic base + `14` synthetic appellate dockets).

---

## 2. Normalized Database Architecture

Ten normalized tables are defined in [`database/schema.sql`](file:///Users/abhishekjha/Downloads/JIS%20-%20Imple/database/schema.sql) and [`database/legal_schema.sql`](file:///Users/abhishekjha/Downloads/JIS%20-%20Imple/database/legal_schema.sql):

| Table Name | Description | Rows Seeded |
| :--- | :--- | :--- |
| `legal_acts` | Master catalog of statutory enactments, codes, and enforcement dates | **10** |
| `legal_chapters` | Structural chapters, parts, and headings within acts | **177** |
| `legal_sections` | Complete section library with statutory text, legal nature, and temporal validity | **2,419** |
| `legal_categories` | Searchable legal taxonomy categorized by legal domain | **20** |
| `legal_section_categories` | Many-to-many relationship linking sections to subject taxonomy | **256** |
| `legal_section_relations` | Old ↔ New criminal law transition cross-reference matrix | **149** |
| `legal_procedural_classifications` | First Schedule classifications (Cognizable, Bailable, Compoundable, Court, Punishment) | **29** |
| `legal_judgments` | Judicial records with `is_synthetic` (`0`/`1`) and `record_provenance` (`REAL_VERIFIED` / `SYNTHETIC_REPRESENTATIVE`) | **605** (105 Real + 500 Synthetic) |
| `judgment_legal_sections` | Cross-link between court judgments and statutory sections interpreted | **626** |
| `judgment_citations` | Reporter citations (AIR, SCC, SCR, Neutral Citations) | **824** |

---

## 3. Statutory Section Libraries & Temporal Validity

```text
Historical Laws (Repealed / Historical, valid_until = 2024-06-30):
• Indian Penal Code, 1860 (IPC)                     : 567 Sections (Sec 1 to 511 + amendments)
• Code of Criminal Procedure, 1973 (CrPC)           : 524 Sections (Sec 1 to 484 + amendments)
• Indian Evidence Act, 1872 (IEA)                   : 184 Sections (Sec 1 to 167 + amendments)

Reformed Criminal Sanhitas (Active, valid_from = 2024-07-01):
• Bharatiya Nyaya Sanhita, 2023 (BNS)               : 358 Sections (Sec 1 to 358)
• Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)   : 531 Sections (Sec 1 to 531)
• Bharatiya Sakshya Adhiniyam, 2023 (BSA)           : 170 Sections (Sec 1 to 170)

Constitutional & Foundational Civil Statutes:
• Constitution of India, 1950 (CONST)               : 24 Core Articles
• Code of Civil Procedure, 1908 (CPC)               : 14 Core Procedural Sections
• Commercial Courts Act, 2015 (CCA)                 : 24 Sections
• Family Courts Act, 1984 (FCA)                     : 23 Sections
```

---

## 4. Provenance Classification & UI Transparency (`C-4`, `L-5`)

To prevent any conflation between genuine Indian case law and template-generated academic demonstration data:
1. **Database Schema**: `legal_judgments` includes `is_synthetic TINYINT(1) NOT NULL DEFAULT 0` and `record_provenance ENUM('REAL_VERIFIED', 'SYNTHETIC_REPRESENTATIVE') NOT NULL DEFAULT 'REAL_VERIFIED'`.
2. **UI Badges**: Every judgment card and detail view across `/legal`, `/legal/judgments/supreme-court`, `/legal/judgments/high-courts`, `/legal/judgments/:id`, `/legal/sections/:id`, `/legal/search`, and the case detail legal panel displays either:
   - `REAL / VERIFIED` (`is_synthetic = 0`)
   - `SYNTHETIC / REPRESENTATIVE` (`is_synthetic = 1`)
3. **Provenance Filtering**: Both `/legal/judgments/supreme-court` and `/legal/judgments/high-courts` support filtering by `provenance=REAL_VERIFIED` or `provenance=SYNTHETIC_REPRESENTATIVE`.

---

## 5. Verification Output (`npm run verify:legal`)

```text
--- 2. Supreme Court Judgments & Provenance Breakdown ---
  Supreme Court Judgments Total : 214 (84 REAL_VERIFIED + 130 SYNTHETIC_REPRESENTATIVE)
  ✓ [PASS] Supreme Court provenance verified (84 REAL_VERIFIED + 130 SYNTHETIC_REPRESENTATIVE = 214).

--- 3. High Court & District Judgments Provenance Breakdown ---
  High Court Judgments Total    : 366 (21 REAL_VERIFIED + 345 SYNTHETIC_REPRESENTATIVE)
  District Court Judgments Total: 25 (all SYNTHETIC_REPRESENTATIVE)
  ✓ [PASS] High Court (21 REAL_VERIFIED + 345 SYNTHETIC_REPRESENTATIVE) and District (25 SYNTHETIC_REPRESENTATIVE) provenance verified.
```
