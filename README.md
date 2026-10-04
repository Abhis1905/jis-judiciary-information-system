# Judiciary Information System (JIS)

> **Modern, Institutional Indian Judiciary Information System & Legal Knowledge Portal**  
> Built with Node.js, Express, MySQL 8.0, and EJS.

---

## 🏛 Overview

The **Judiciary Information System (JIS)** is a full-featured, institutional web application designed to model the administrative, judicial, and public-facing workflows of the Indian Judiciary.

It integrates:
- **Case Docket Management & Lifecycle**: Handling civil, criminal, constitutional, and appellate case dockets across 6 court tiers.
- **Role-Based Access Control (RBAC)**: Distinct, isolated workflows for anonymous **Citizens**, **Advocates**, **Prosecutors**, **Judges**, and **Registrars**.
- **Real Indian Judiciary Hierarchy**: Complete database model covering all 36 States & UTs, 25 High Courts, 41 Benches, 787 Judicial Districts, and 3,152 Subordinate Court complexes.
- **Legal Intelligence Repository**: 2,419 statutory sections across 10 major Indian Acts, 149 Old $\leftrightarrow$ New Criminal Law transition mappings (IPC $\leftrightarrow$ BNS, CrPC $\leftrightarrow$ BNSS, IEA $\leftrightarrow$ BSA), and 605 legal judgments with rigorous provenance classification.
- **Multi-Tier Appellate Workflow Engine**: Validates statutory appeal pathways (Subordinate $\rightarrow$ District $\rightarrow$ High Court $\rightarrow$ Supreme Court), blocks illegal bypasses, transfers case records, and records appellate history.

---

## 💻 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js (v18+ / v22+) |
| **Framework** | Express.js 4.19+ |
| **View Engine** | EJS 3.1+ with Bootstrap 5 |
| **Database** | MySQL 8.0+ |
| **Driver / Pooling** | `mysql2/promise` (connection pooling, parameterized prepared statements, atomic transactions) |
| **Authentication & Session** | `express-session` with MySQL-backed `express-mysql-session` persistent store, `bcrypt` password hashing, constant-time dummy verification, session regeneration on login |
| **Security & Headers** | Helmet-grade HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS), sliding-window rate limiting, Synchronizer Token Pattern CSRF protection |
| **File Handling** | `multer` for secure, validated document uploads |

---

## 🏗 Architecture & Core Modules

```mermaid
flowchart TD
    subgraph Client Tier
        C[Citizen - Anonymous Public]
        A[Advocate - RBAC]
        P[Prosecutor - RBAC]
        J[Judge - RBAC]
        R[Registrar - RBAC]
    end

    subgraph Security & Application Tier [Express.js]
        Sec[Security Headers + Rate Limiting + CSRF]
        Auth[MySQL Session Store + Session Regeneration + RBAC Middleware]
        Router[Role-Scoped Routers]
        Ctrl[Controllers & State Machines]
        Model[Data Models & Parameterized MySQL Queries]
    end

    subgraph Database Tier [MySQL 8.0]
        JH[Real Judiciary Hierarchy<br/>36 States | 25 HCs | 41 Benches | 787 Districts]
        LR[Legal Repository<br/>105 Real + 500 Synthetic Judgments | 2,419 Sections | 149 Mappings]
        CD[Case Dockets<br/>100,000 Base Cases + Multi-Tier Appeals]
        REL[Normalized Relational Junctions<br/>Case-Sections | Case-Judgments]
    end

    C --> Sec --> Router
    A & P & J & R --> Sec --> Auth --> Router
    Router --> Ctrl --> Model
    Model --> JH & LR & CD & REL
```

### 1. Indian Judiciary Hierarchy Model
- **States & Union Territories**: All 36 territorial jurisdictions.
- **High Courts & Benches**: 25 High Courts, 41 Benches with territorial jurisdiction mappings.
- **Districts & Subordinate Courts**: 787 judicial districts and 3,152 subordinate court complexes.
- **Data Integrity**: Enforced via `ON DELETE RESTRICT` foreign keys.

### 2. Legal Intelligence Repository & Honest Provenance
JIS enforces explicit provenance separation in both database and UI:
- **Statutory Sections (`2,419`)**: IPC (1860), CrPC (1973), IEA (1872), BNS (2023), BNSS (2023), BSA (2023), Constitution of India (1950), CPC (1908), Commercial Courts Act (2015), Family Courts Act (1984).
- **Old $\leftrightarrow$ New Criminal Law Mappings (`149`)**: Verified correlation between old colonial codes and new criminal laws.
- **Legal Judgments (`605`)**:
  - **`REAL_VERIFIED` (`105 records`, `is_synthetic = 0`)**: 84 Supreme Court landmark decisions + 21 High Court landmark decisions with verified case titles, citations, benches, and holdings. Includes 11 verified Supreme Court judgment PDFs stored in `uploads/legal_judgments/`.
  - **`SYNTHETIC_REPRESENTATIVE` (`500 records`, `is_synthetic = 1`)**: Explicitly flagged template records for broad academic and jurisdictional simulation.

### 3. Appellate Workflow Engine
- Validates statutory appeal pathways against the judicial hierarchy.
- Prevents jurisdiction bypass (e.g. Subordinate/District $\rightarrow$ Supreme Court direct appeal bypass is strictly rejected).
- Carries forward case metadata, legal precedents, and statutory sections via atomic transactions.
- Emits real-time in-app notifications to assigned parties upon appeal admission.

---

## ⚙️ Environment Configuration

Configuration is managed via environment variables. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your local database credentials:

```ini
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=jis_db
SESSION_SECRET=jis_change_this_secret_in_production
NODE_ENV=development
```

> **Security Note:** Never commit `.env` or sensitive credentials to version control. The `.gitignore` is pre-configured to exclude all environment files except `.env.example`.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL Server** (v8.0 or higher, running on configured port, e.g., `3307` or `3306`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Provisioning

To set up the main database (`jis_db`):
```bash
# 1. Initialize schema
mysql -u root -p -P 3307 < database/schema.sql

# 2. Seed Indian Judiciary Hierarchy
npm run db:seed:hierarchy

# 3. Seed Legal Knowledge Repository
npm run db:seed:legal

# 4. (Optional) Generate case dockets
npm run generate:cases
```

To set up the isolated test database (`jis_test_db`):
```bash
npm run test:setup
```

### 3. Start the Server
```bash
# Development mode with hot-reloading:
npm run dev

# Production mode:
npm start
```
The application will be accessible at: `http://localhost:3000`

---

## 🧪 Automated Test Suite

JIS includes an extensive automated test suite covering all tiers, security domains, and data pipelines. All tests run deterministically against an isolated test database (`jis_test_db`), guaranteeing that the live database (`jis_db`) is never mutated.

Run all tests:
```bash
npm test
```

### Test Suite Breakdown:
| Test File | Scope | Assertions |
| :--- | :--- | :--- |
| `test_full_suite.js` | Core routes, auth, case creation, hearing scheduling | 25 Passed |
| `test_hierarchy_integration.js` | State, High Court, Bench, District, and Subordinate court relationships | 29 Passed |
| `test_legal_repository.js` | Legal repository routes, filters, verified vs synthetic judgment isolation | 13 Passed |
| `test_legal_case_integration.js` | Case-to-statute and case-to-precedent associations, search | 52 Passed |
| `test_appellate_workflow.js` | Multi-tier appeal validation, bypass blocking, history tracking | 73 Passed |
| `test_security_audit.js` | Session regeneration, CSRF, RBAC, SQLi resistance, rate limiting | 68 Passed |
| **Total** | **All 6 Suites** | **260+ Passed, 0 Failed** |

---

## 📂 Project Directory Structure

```text
├── app.js                          # Express application entrypoint & middleware setup
├── config/
│   ├── db.js                       # MySQL2 connection pool & query helpers
│   └── sessionStore.js             # MySQL-backed session store configuration
├── controllers/                    # Role-specific & public route controllers
│   ├── advocateController.js       # Advocate workspace & case filing
│   ├── authController.js           # Login, logout, session management
│   ├── caseController.js           # Core case lifecycle & assignment
│   ├── documentController.js       # Case document upload & viewing
│   ├── hearingController.js        # Hearing scheduling & calendar
│   ├── hierarchyController.js      # API for dynamic hierarchy dropdowns
│   ├── judgementController.js      # Judgement drafting & delivery
│   ├── legalController.js          # Legal repository & precedent research
│   ├── notificationController.js   # User notification inbox
│   └── publicController.js         # Public portal & case search
├── database/
│   ├── schema.sql                  # Single authoritative database schema (26 tables)
│   ├── seed.js                     # Base test fixtures & user accounts
│   ├── seed_hierarchy.js           # Hierarchy data importer
│   └── seed_legal_repository.js    # Legal repository importer
├── middleware/                     # Authentication, RBAC, CSRF, rate limiters
├── models/                         # Data access layer (parameterized queries)
├── public/                         # Static assets (CSS, JS, emblems, brand marks)
├── routes/                         # Express route definitions
├── scripts/                        # Utility & migration scripts
├── tests/                          # 6 automated test suites (root-level test_*.js)
├── uploads/
│   ├── legal_judgments/            # 11 authentic landmark Supreme Court judgment PDFs
│   └── ...                         # Internal case document upload paths (.gitkeep)
└── views/                          # EJS view templates (Variant B visual system)
    ├── advocate/                   # Advocate views
    ├── judge/                      # Judge bench views
    ├── legal/                      # Legal intelligence & precedent views
    ├── partials/                   # Reusable components (header, footer, cards)
    ├── prosecutor/                 # Prosecutor views
    ├── public/                     # Public portal & citizen case status
    └── registrar/                  # Registrar case management views
```

---

## 📄 License
Academic & Educational Implementation — JIS Judiciary Information System.
