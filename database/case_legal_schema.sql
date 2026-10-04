-- =====================================================================
-- JIS – Case to Legal Repository Relationship Schema
-- Tables: case_legal_sections, case_legal_judgments
-- =====================================================================

USE jis_db;

-- 1. Case to Legal Section Association
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

-- 2. Case to Legal Judgment Association
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
