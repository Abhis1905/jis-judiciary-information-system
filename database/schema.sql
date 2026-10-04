-- ═══════════════════════════════════════════════════════════════════
-- JIS – Judiciary Info System
-- Complete Unified Database Schema (Single Source of Truth)
-- Includes: Core JIS Tables, Real Indian Judiciary Hierarchy,
-- Legal Knowledge Repository, Case-Legal Intelligence, Appellate Workflow,
-- and Persistent Session Store.
-- ═══════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS jis_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jis_db;

-- ───────────────────────────────────────────────────────────────────
-- Table: sessions
-- Persistent session storage for express-session (H-4).
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL PRIMARY KEY,
  expires    BIGINT UNSIGNED NOT NULL,
  data       MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: users
-- Authenticated roles: registrar, judge, prosecutor, advocate.
-- Citizen is anonymous — no user record required.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL            COMMENT 'bcrypt hash',
  role        ENUM('registrar','judge','prosecutor','advocate') NOT NULL,
  is_active   TINYINT(1)  DEFAULT 1,
  created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════
-- INDIAN JUDICIARY HIERARCHY TABLES (ON DELETE RESTRICT FOR TAXONOMY)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS states_uts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(10)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL UNIQUE,
  type        ENUM('State', 'Union Territory') NOT NULL DEFAULT 'State',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS high_courts (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  code                VARCHAR(30)  NOT NULL UNIQUE,
  name                VARCHAR(150) NOT NULL UNIQUE,
  established_year    INT,
  principal_seat_city VARCHAR(100) NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS high_court_jurisdictions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  high_court_id INT NOT NULL,
  state_ut_id   INT NOT NULL,
  is_primary    BOOLEAN DEFAULT 1,
  FOREIGN KEY (high_court_id) REFERENCES high_courts(id) ON DELETE RESTRICT,
  FOREIGN KEY (state_ut_id)   REFERENCES states_uts(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_hc_state (high_court_id, state_ut_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS high_court_benches (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  high_court_id INT NOT NULL,
  bench_name    VARCHAR(120) NOT NULL,
  bench_type    ENUM('Principal Seat', 'Permanent Bench', 'Circuit Bench') NOT NULL DEFAULT 'Principal Seat',
  city          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (high_court_id) REFERENCES high_courts(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_hc_bench (high_court_id, bench_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS districts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  state_ut_id   INT NOT NULL,
  high_court_id INT NOT NULL,
  bench_id      INT NOT NULL,
  district_code VARCHAR(20)  NOT NULL,
  district_name VARCHAR(100) NOT NULL,
  headquarters  VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (state_ut_id)   REFERENCES states_uts(id) ON DELETE RESTRICT,
  FOREIGN KEY (high_court_id) REFERENCES high_courts(id) ON DELETE RESTRICT,
  FOREIGN KEY (bench_id)      REFERENCES high_court_benches(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_state_district (state_ut_id, district_name),
  INDEX idx_bench (bench_id),
  INDEX idx_hc (high_court_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS court_levels (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  level_code  VARCHAR(30)  NOT NULL UNIQUE,
  level_name  VARCHAR(120) NOT NULL UNIQUE,
  tier_order  INT NOT NULL,
  category    ENUM('Apex', 'High Court', 'District Level', 'Subordinate Senior', 'Subordinate Junior') NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subordinate_courts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  district_id     INT NOT NULL,
  court_level_id  INT NOT NULL,
  court_name      VARCHAR(180) NOT NULL,
  court_type      ENUM('Civil', 'Criminal', 'Combined / Dual', 'Special') NOT NULL DEFAULT 'Combined / Dual',
  location        VARCHAR(120),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (district_id)    REFERENCES districts(id) ON DELETE RESTRICT,
  FOREIGN KEY (court_level_id) REFERENCES court_levels(id) ON DELETE RESTRICT,
  INDEX idx_dist (district_id),
  INDEX idx_level (court_level_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appellate_paths (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  case_category      ENUM('Civil', 'Criminal', 'Constitutional', 'Family', 'Commercial') NOT NULL,
  from_level_id      INT NOT NULL,
  to_level_id        INT NOT NULL,
  appeal_type        VARCHAR(120) NOT NULL,
  governing_statute  VARCHAR(150) NOT NULL,
  description        TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_level_id) REFERENCES court_levels(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_level_id)   REFERENCES court_levels(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: cases
-- Central case record including all judiciary hierarchy foreign keys (H-1).
--   judge_id      → set by Registrar on R3 (manual allocation).
--   prosecutor_id → populated via seed data only; no UI flow (by DFD design).
--   advocate_id   → set ONLY when Advocate uploads Vakalatnama (A2).
--   is_public     → TRUE exposes the case to anonymous Citizen portal.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cases (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  case_number          VARCHAR(50)  NOT NULL UNIQUE,
  title                VARCHAR(255) NOT NULL,
  case_type            ENUM('Civil','Criminal','Constitutional','Family') NOT NULL,
  petitioner_name      VARCHAR(150) NOT NULL,
  respondent_name      VARCHAR(150) NOT NULL,
  description          TEXT,
  status               ENUM('Filed','Allocated','In Trial','Judgement Pending','Closed')
                       DEFAULT 'Filed',
  is_public            TINYINT(1)  DEFAULT 0
                       COMMENT 'Only is_public=1 cases are visible to Citizens',
  filed_by             INT         NOT NULL     COMMENT 'Registrar who filed the case',
  judge_id             INT         DEFAULT NULL COMMENT 'Manually assigned by Registrar',
  prosecutor_id        INT         DEFAULT NULL COMMENT 'Seeded; no UI assignment flow per DFD',
  advocate_id          INT         DEFAULT NULL COMMENT 'Set on Vakalatnama upload only',
  filing_date          DATE        NOT NULL,
  created_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  state_ut_id          INT         DEFAULT NULL,
  high_court_id        INT         DEFAULT NULL,
  bench_id             INT         DEFAULT NULL,
  district_id          INT         DEFAULT NULL,
  subordinate_court_id INT         DEFAULT NULL,
  court_level_id       INT         DEFAULT NULL,
  FOREIGN KEY (filed_by)             REFERENCES users(id),
  FOREIGN KEY (judge_id)             REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (prosecutor_id)        REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (advocate_id)          REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (state_ut_id)          REFERENCES states_uts(id) ON DELETE SET NULL,
  FOREIGN KEY (high_court_id)        REFERENCES high_courts(id) ON DELETE SET NULL,
  FOREIGN KEY (bench_id)             REFERENCES high_court_benches(id) ON DELETE SET NULL,
  FOREIGN KEY (district_id)          REFERENCES districts(id) ON DELETE SET NULL,
  FOREIGN KEY (subordinate_court_id) REFERENCES subordinate_courts(id) ON DELETE SET NULL,
  FOREIGN KEY (court_level_id)       REFERENCES court_levels(id) ON DELETE SET NULL,
  INDEX idx_status           (status),
  INDEX idx_is_public        (is_public),
  INDEX idx_judge            (judge_id),
  INDEX idx_prosecutor       (prosecutor_id),
  INDEX idx_advocate         (advocate_id),
  INDEX idx_filed_by         (filed_by),
  INDEX idx_created_at       (created_at),
  INDEX idx_public_created   (is_public, created_at),
  INDEX idx_case_state       (state_ut_id),
  INDEX idx_case_hc          (high_court_id),
  INDEX idx_case_district    (district_id),
  INDEX idx_case_level       (court_level_id),
  FULLTEXT INDEX idx_cases_fulltext (title, petitioner_name, respondent_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: hearings
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hearings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  case_id       INT  NOT NULL,
  hearing_date  DATE NOT NULL,
  hearing_time  TIME NOT NULL,
  court_room    VARCHAR(50),
  hearing_type  ENUM('First Hearing','Interim','Final') NOT NULL,
  status        ENUM('Scheduled','Postponed','Completed') DEFAULT 'Scheduled',
  created_by    INT  NOT NULL COMMENT 'Registrar',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)    REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_case (case_id),
  INDEX idx_date (hearing_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: documents
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  case_id        INT          NOT NULL,
  uploaded_by    INT          NOT NULL COMMENT 'Registrar',
  document_type  ENUM('FIR','Charge Sheet','Affidavit','Other') NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  file_name      VARCHAR(255) NOT NULL COMMENT 'Stored filename on disk',
  file_path      VARCHAR(500) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  description    VARCHAR(255),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)     REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: trial_notes
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trial_notes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  case_id       INT  NOT NULL,
  judge_id      INT  NOT NULL,
  note_content  TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)  REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id),
  INDEX idx_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: judgements
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS judgements (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  case_id         INT  NOT NULL UNIQUE,
  judge_id        INT  NOT NULL,
  verdict         ENUM('Guilty','Not Guilty','Dismissed','Settled','Other') NOT NULL,
  summary         TEXT NOT NULL,
  pdf_name        VARCHAR(255),
  pdf_path        VARCHAR(500),
  judgement_date  DATE NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)  REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id),
  INDEX idx_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: case_status_updates
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_status_updates (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  case_id             INT  NOT NULL,
  prosecutor_id       INT  NOT NULL,
  update_description  TEXT NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)       REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (prosecutor_id) REFERENCES users(id),
  INDEX idx_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: case_laws
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_laws (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  citation_number  VARCHAR(100) NOT NULL UNIQUE,
  case_name        VARCHAR(255) NOT NULL,
  year             YEAR         NOT NULL,
  court_name       VARCHAR(150) NOT NULL DEFAULT 'Supreme Court of India',
  summary          TEXT         NOT NULL,
  pdf_name         VARCHAR(255),
  pdf_path         VARCHAR(500),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_citation (citation_number),
  INDEX idx_year     (year),
  FULLTEXT idx_fulltext_search (case_name, summary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: notifications
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT  NOT NULL     COMMENT 'Recipient',
  case_id     INT  DEFAULT NULL COMMENT 'Related case (nullable)',
  message     TEXT NOT NULL,
  is_read     TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
  INDEX idx_user    (user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: court_orders
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS court_orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  case_id        INT  NOT NULL,
  order_date     DATE NOT NULL,
  order_summary  TEXT NOT NULL,
  pdf_name       VARCHAR(255),
  pdf_path       VARCHAR(500),
  created_by     INT  NOT NULL COMMENT 'Judge',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)    REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: scheduling_requests
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduling_requests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  case_id         INT  NOT NULL,
  advocate_id     INT  NOT NULL,
  requested_date  DATE NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)     REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (advocate_id) REFERENCES users(id),
  INDEX idx_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: efilings
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS efilings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  case_id        INT          NOT NULL,
  advocate_id    INT          NOT NULL,
  filing_type    ENUM('Application','Petition','Reply','Other') NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  description    VARCHAR(255),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)     REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (advocate_id) REFERENCES users(id),
  INDEX idx_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: pleadings
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pleadings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  case_id        INT          NOT NULL,
  advocate_id    INT          NOT NULL,
  pleading_type  ENUM('Written Statement','Counter-Claim','Rejoinder','Other') NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  description    VARCHAR(255),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)     REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (advocate_id) REFERENCES users(id),
  INDEX idx_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: vakalatnamas
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vakalatnamas (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  case_id        INT          NOT NULL,
  advocate_id    INT          NOT NULL,
  client_name    VARCHAR(150) NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_case_advocate (case_id, advocate_id),
  FOREIGN KEY (case_id)     REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (advocate_id) REFERENCES users(id),
  INDEX idx_case     (case_id),
  INDEX idx_advocate (advocate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────
-- Table: court_notices
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS court_notices (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  notice_title  VARCHAR(255) NOT NULL,
  case_id       INT DEFAULT NULL COMMENT 'Nullable — general notices have no case',
  date_issued   DATE NOT NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
  INDEX idx_date (date_issued)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════
-- LEGAL KNOWLEDGE REPOSITORY TABLES
-- ═══════════════════════════════════════════════════════════════════

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

CREATE TABLE IF NOT EXISTS legal_categories (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(50) NOT NULL UNIQUE,
  name            VARCHAR(150) NOT NULL,
  domain          ENUM('Criminal Law', 'Constitutional Law', 'Civil Law', 'Family Law', 'Commercial Law', 'Evidence & Procedure', 'Administrative Law') NOT NULL,
  description     TEXT,
  INDEX idx_cat_domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legal_section_categories (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  section_id      INT NOT NULL,
  category_id     INT NOT NULL,
  FOREIGN KEY (section_id) REFERENCES legal_sections(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES legal_categories(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sec_cat (section_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS judgment_legal_sections (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  judgment_id         INT NOT NULL,
  section_id          INT NOT NULL,
  relevance_nature    ENUM('Interpreted & Applied', 'Substantial Question of Law', 'Overruled / Struck Down', 'Referred', 'Guilt / Conviction Provision') DEFAULT 'Interpreted & Applied',
  FOREIGN KEY (judgment_id) REFERENCES legal_judgments(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id)  REFERENCES legal_sections(id) ON DELETE CASCADE,
  UNIQUE KEY uq_judg_sec (judgment_id, section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS judgment_citations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  judgment_id         INT NOT NULL,
  reporter_name       VARCHAR(50) NOT NULL,
  citation_value      VARCHAR(100) NOT NULL,
  FOREIGN KEY (judgment_id) REFERENCES legal_judgments(id) ON DELETE CASCADE,
  INDEX idx_rep_cit (reporter_name, citation_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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


-- ═══════════════════════════════════════════════════════════════════
-- CASE <-> LEGAL REPOSITORY ASSOCIATION TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS case_legal_sections (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  case_id           INT NOT NULL,
  legal_section_id  INT NOT NULL,
  relevance_type    ENUM('PRIMARY', 'SECONDARY', 'PROCEDURAL', 'EVIDENTIARY') NOT NULL DEFAULT 'PRIMARY',
  is_synthetic      BOOLEAN DEFAULT 0,
  notes             VARCHAR(255) DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (legal_section_id) REFERENCES legal_sections(id) ON DELETE CASCADE,
  UNIQUE KEY uq_case_sec_rel (case_id, legal_section_id, relevance_type),
  INDEX idx_cls_case (case_id),
  INDEX idx_cls_sec (legal_section_id),
  INDEX idx_cls_rel (relevance_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_legal_judgments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  case_id           INT NOT NULL,
  judgment_id       INT NOT NULL,
  relevance_type    ENUM('PRECEDENT', 'RELATED', 'CITED', 'RESEARCH') NOT NULL DEFAULT 'PRECEDENT',
  is_synthetic      BOOLEAN DEFAULT 0,
  notes             VARCHAR(255) DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (judgment_id) REFERENCES legal_judgments(id) ON DELETE CASCADE,
  UNIQUE KEY uq_case_judg_rel (case_id, judgment_id, relevance_type),
  INDEX idx_clj_case (case_id),
  INDEX idx_clj_judg (judgment_id),
  INDEX idx_clj_rel (relevance_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════
-- APPELLATE WORKFLOW TABLE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS case_appeals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_case_id INT NOT NULL,
  appeal_case_id INT NOT NULL,
  appeal_level ENUM('DISTRICT_TO_HIGH_COURT', 'HIGH_COURT_TO_SUPREME_COURT', 'SUBORDINATE_TO_HIGH_COURT', 'SUBORDINATE_TO_DISTRICT') NOT NULL,
  originating_court_level_id INT NOT NULL,
  destination_court_level_id INT NOT NULL,
  destination_high_court_id INT NULL,
  destination_bench_id INT NULL,
  destination_district_id INT NULL,
  appeal_type VARCHAR(150) NOT NULL,
  governing_statute VARCHAR(255) NULL,
  filing_date DATE NOT NULL,
  status ENUM('Filed', 'Admitted', 'Pending', 'Disposed', 'Withdrawn') NOT NULL DEFAULT 'Filed',
  grounds TEXT NULL,
  is_synthetic TINYINT(1) NOT NULL DEFAULT 0,
  provenance VARCHAR(50) NOT NULL DEFAULT 'STAFF_FILED',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (original_case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (appeal_case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (originating_court_level_id) REFERENCES court_levels(id) ON DELETE RESTRICT,
  FOREIGN KEY (destination_court_level_id) REFERENCES court_levels(id) ON DELETE RESTRICT,
  FOREIGN KEY (destination_high_court_id) REFERENCES high_courts(id) ON DELETE SET NULL,
  FOREIGN KEY (destination_bench_id) REFERENCES high_court_benches(id) ON DELETE SET NULL,
  FOREIGN KEY (destination_district_id) REFERENCES districts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_original_appeal (original_case_id, appeal_case_id),
  INDEX idx_ca_original (original_case_id),
  INDEX idx_ca_appeal (appeal_case_id),
  INDEX idx_ca_status (status),
  INDEX idx_ca_level (appeal_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
