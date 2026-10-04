-- =====================================================================
-- JIS – Real Indian Judiciary Hierarchy Schema Extension
-- Uses ON DELETE RESTRICT on taxonomy parent references (H-5)
-- =====================================================================

-- 1. States & Union Territories of India
CREATE TABLE IF NOT EXISTS states_uts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(10)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL UNIQUE,
  type        ENUM('State', 'Union Territory') NOT NULL DEFAULT 'State',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. High Courts of India (25 High Courts)
CREATE TABLE IF NOT EXISTS high_courts (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  code                VARCHAR(30)  NOT NULL UNIQUE,
  name                VARCHAR(150) NOT NULL UNIQUE,
  established_year    INT,
  principal_seat_city VARCHAR(100) NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. High Court Jurisdictions (covers States/UTs under each High Court)
CREATE TABLE IF NOT EXISTS high_court_jurisdictions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  high_court_id INT NOT NULL,
  state_ut_id   INT NOT NULL,
  is_primary    BOOLEAN DEFAULT 1,
  FOREIGN KEY (high_court_id) REFERENCES high_courts(id) ON DELETE RESTRICT,
  FOREIGN KEY (state_ut_id)   REFERENCES states_uts(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_hc_state (high_court_id, state_ut_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. High Court Benches (Principal Seat and Permanent/Circuit Benches)
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

-- 5. Judicial Districts of India
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

-- 6. Court Levels / Tiers in the Indian Judicial System
CREATE TABLE IF NOT EXISTS court_levels (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  level_code  VARCHAR(30)  NOT NULL UNIQUE,
  level_name  VARCHAR(120) NOT NULL UNIQUE,
  tier_order  INT NOT NULL,
  category    ENUM('Apex', 'High Court', 'District Level', 'Subordinate Senior', 'Subordinate Junior') NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Subordinate Courts (District Courts, Civil Courts, Magistrates)
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

-- 8. Data-Driven Appellate Paths
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
