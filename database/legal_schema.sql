-- =====================================================================
-- JIS – Legal Knowledge Repository Schema
-- Tables for Acts, Chapters, Sections, Classifications,
-- Old ↔ New Law Cross-Reference Matrix, and Legal Judgments (with Provenance).
-- =====================================================================

-- 1. Legal Acts / Statutory Codes
CREATE TABLE IF NOT EXISTS legal_acts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  act_code        VARCHAR(50) NOT NULL UNIQUE,
  title           VARCHAR(255) NOT NULL,
  short_title     VARCHAR(100) NOT NULL,
  act_number      VARCHAR(50),
  enactment_year  INT NOT NULL,
  enforcing_date  DATE NOT NULL,
  repeal_date     DATE DEFAULT NULL,
  jurisdiction    VARCHAR(50) DEFAULT 'All India',
  status          ENUM('Active', 'Repealed / Historical', 'Pending Enforcement') NOT NULL DEFAULT 'Active',
  description     TEXT,
  source_type     VARCHAR(100) DEFAULT 'India Code',
  source_name     VARCHAR(150) DEFAULT 'Legislative Department, Ministry of Law and Justice',
  source_url      VARCHAR(500) NOT NULL,
  retrieved_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_act_status (status),
  INDEX idx_act_year (enactment_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Legal Chapters / Parts
CREATE TABLE IF NOT EXISTS legal_chapters (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  act_id          INT NOT NULL,
  chapter_number  VARCHAR(30) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  chapter_order   INT NOT NULL,
  description     TEXT,
  FOREIGN KEY (act_id) REFERENCES legal_acts(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_act_chapter (act_id, chapter_number),
  INDEX idx_ch_act (act_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Legal Sections / Articles
CREATE TABLE IF NOT EXISTS legal_sections (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  act_id          INT NOT NULL,
  chapter_id      INT DEFAULT NULL,
  section_number  VARCHAR(30) NOT NULL,
  section_title   VARCHAR(255) NOT NULL,
  section_order   INT NOT NULL,
  section_text    MEDIUMTEXT,
  legal_nature    ENUM('Substantive Offence', 'Procedure', 'Evidence / Admissibility', 'Definition / General Explanation', 'General Exception', 'Jurisdiction / Power', 'Constitutional Right', 'Miscellaneous') NOT NULL DEFAULT 'Substantive Offence',
  valid_from      DATE NOT NULL,
  valid_until     DATE DEFAULT NULL,
  status          ENUM('Active', 'Repealed / Historical', 'Amended') NOT NULL DEFAULT 'Active',
  source_type     VARCHAR(100) DEFAULT 'India Code',
  source_name     VARCHAR(150) DEFAULT 'Legislative Department, Ministry of Law and Justice',
  source_url      VARCHAR(500) NOT NULL,
  retrieved_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (act_id) REFERENCES legal_acts(id) ON DELETE RESTRICT,
  FOREIGN KEY (chapter_id) REFERENCES legal_chapters(id) ON DELETE SET NULL,
  UNIQUE KEY uq_act_section (act_id, section_number),
  INDEX idx_sec_num (section_number),
  INDEX idx_sec_status (status),
  INDEX idx_sec_valid (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Legal Categories (Searchable Legal Taxonomy)
CREATE TABLE IF NOT EXISTS legal_categories (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(50) NOT NULL UNIQUE,
  name            VARCHAR(150) NOT NULL,
  domain          ENUM('Criminal Law', 'Constitutional Law', 'Civil Law', 'Family Law', 'Commercial Law', 'Evidence & Procedure', 'Administrative Law') NOT NULL,
  description     TEXT,
  INDEX idx_cat_domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Legal Section to Category Mapping
CREATE TABLE IF NOT EXISTS legal_section_categories (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  section_id      INT NOT NULL,
  category_id     INT NOT NULL,
  FOREIGN KEY (section_id) REFERENCES legal_sections(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES legal_categories(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sec_cat (section_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Old ↔ New Law Cross-Reference Matrix
CREATE TABLE IF NOT EXISTS legal_section_relations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  from_section_id INT NOT NULL,
  to_section_id   INT DEFAULT NULL,
  relation_type   ENUM('REPLACED_BY', 'CORRESPONDS_TO', 'MODIFIED_BY', 'REPEALED', 'RELATED_TO', 'NO_DIRECT_EQUIVALENT') NOT NULL,
  notes           TEXT,
  source_name     VARCHAR(150) DEFAULT 'Bureau of Police Research & Development (BPR&D) / MHA',
  source_url      VARCHAR(500) NOT NULL,
  retrieved_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_section_id) REFERENCES legal_sections(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_section_id)   REFERENCES legal_sections(id) ON DELETE RESTRICT,
  INDEX idx_rel_type (relation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Procedural Classifications from Statutory Schedules
CREATE TABLE IF NOT EXISTS legal_procedural_classifications (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  section_id          INT NOT NULL,
  cognizable          ENUM('Cognizable', 'Non-Cognizable', 'Varies by Sub-Clause', 'Not Applicable') DEFAULT 'Not Applicable',
  bailable            ENUM('Bailable', 'Non-Bailable', 'Varies by Sub-Clause', 'Not Applicable') DEFAULT 'Not Applicable',
  compoundable        ENUM('Compoundable', 'Compoundable with permission of Court', 'Non-Compoundable', 'Not Applicable') DEFAULT 'Not Applicable',
  court_competent     VARCHAR(150) DEFAULT 'Any Magistrate / Court of Session',
  punishment_summary  TEXT,
  schedule_reference  VARCHAR(150) DEFAULT 'First Schedule to CrPC / BNSS',
  source_url          VARCHAR(500) NOT NULL,
  FOREIGN KEY (section_id) REFERENCES legal_sections(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sec_proc (section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Legal Judgments (Supreme Court, High Courts, Subordinate Courts)
-- Distinguishes REAL_VERIFIED vs SYNTHETIC_REPRESENTATIVE provenance (C-4)
CREATE TABLE IF NOT EXISTS legal_judgments (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  court_tier          ENUM('Supreme Court of India', 'High Court', 'District & Subordinate Court') NOT NULL,
  court_name          VARCHAR(150) NOT NULL,
  high_court_id       INT DEFAULT NULL,
  bench_id            INT DEFAULT NULL,
  district_id         INT DEFAULT NULL,
  case_name           VARCHAR(255) NOT NULL,
  case_number         VARCHAR(100),
  citation            VARCHAR(150) NOT NULL,
  neutral_citation    VARCHAR(150),
  judgment_date       DATE NOT NULL,
  bench_judges        TEXT DEFAULT NULL,
  bench_strength      INT DEFAULT 2,
  domain              ENUM('Constitutional Law', 'Criminal Law', 'Civil & Commercial Law', 'Family & Matrimonial Law', 'Administrative & Service Law', 'Tax & Revenue Law', 'Environmental Law', 'Labour & Industrial Law', 'Human Rights & Civil Liberties', 'Evidence & Procedure') NOT NULL,
  legal_issue         TEXT NOT NULL,
  key_ratio           TEXT NOT NULL,
  key_holding         TEXT NOT NULL,
  factual_summary     TEXT,
  petitioner_arguments TEXT DEFAULT NULL,
  respondent_arguments TEXT DEFAULT NULL,
  court_reasoning     TEXT DEFAULT NULL,
  outcome             VARCHAR(150) NOT NULL,
  is_landmark         BOOLEAN DEFAULT 1,
  is_synthetic        TINYINT(1) NOT NULL DEFAULT 0,
  record_provenance   ENUM('REAL_VERIFIED', 'SYNTHETIC_REPRESENTATIVE') NOT NULL DEFAULT 'REAL_VERIFIED',
  keywords            VARCHAR(500),
  source_type         ENUM('Supreme Court Official / eSCR', 'High Court Official / eCourts', 'India Code / Gazette', 'Authoritative Law Repository') NOT NULL,
  source_name         VARCHAR(150) NOT NULL,
  source_url          VARCHAR(500) NOT NULL,
  full_judgment_url   VARCHAR(500),
  summary_url         VARCHAR(500),
  retrieved_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (high_court_id) REFERENCES high_courts(id) ON DELETE SET NULL,
  FOREIGN KEY (bench_id)      REFERENCES high_court_benches(id) ON DELETE SET NULL,
  FOREIGN KEY (district_id)   REFERENCES districts(id) ON DELETE SET NULL,
  INDEX idx_judg_court (court_tier),
  INDEX idx_judg_date (judgment_date),
  INDEX idx_judg_domain (domain),
  INDEX idx_judg_citation (citation),
  INDEX idx_judg_provenance (is_synthetic, record_provenance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Judgment to Legal Section Relationship
CREATE TABLE IF NOT EXISTS judgment_legal_sections (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  judgment_id         INT NOT NULL,
  section_id          INT NOT NULL,
  relevance_nature    ENUM('Interpreted & Applied', 'Substantial Question of Law', 'Overruled / Struck Down', 'Referred', 'Guilt / Conviction Provision') DEFAULT 'Interpreted & Applied',
  FOREIGN KEY (judgment_id) REFERENCES legal_judgments(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id)  REFERENCES legal_sections(id) ON DELETE CASCADE,
  UNIQUE KEY uq_judg_sec (judgment_id, section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Additional Reporter Citations
CREATE TABLE IF NOT EXISTS judgment_citations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  judgment_id         INT NOT NULL,
  reporter_name       VARCHAR(50) NOT NULL,
  citation_value      VARCHAR(100) NOT NULL,
  FOREIGN KEY (judgment_id) REFERENCES legal_judgments(id) ON DELETE CASCADE,
  INDEX idx_rep_cit (reporter_name, citation_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Verified Judgment PDF Documents
CREATE TABLE IF NOT EXISTS judgment_documents (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  judgment_id         INT NOT NULL,
  document_type       ENUM('FULL_JUDGMENT_PDF', 'OFFICIAL_ORDER_PDF', 'REPORTABLE_JUDGMENT_PDF') NOT NULL DEFAULT 'FULL_JUDGMENT_PDF',
  original_filename   VARCHAR(255) NOT NULL,
  storage_path        VARCHAR(500) NOT NULL,
  source_url          VARCHAR(500) NOT NULL,
  source_name         VARCHAR(150) NOT NULL,
  file_size_bytes     INT UNSIGNED DEFAULT NULL,
  uploaded_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum            VARCHAR(64) NOT NULL,
  is_verified         TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (judgment_id) REFERENCES legal_judgments(id) ON DELETE CASCADE,
  UNIQUE KEY uq_judg_doc_type (judgment_id, document_type),
  INDEX idx_jd_judgment (judgment_id),
  INDEX idx_jd_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

