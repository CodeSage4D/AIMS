# <p align="center"><img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" width="40" height="40" valign="middle" alt="AIMS Logo" /> <b>A I M S</b></p>
<p align="center"><b>Aurxon Internal Management System</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.6-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## 🌟 The Heart of AIMS

Welcome to **AIMS (Aurxon Internal Management System)**—the official internal nerve center for managing administrative and educational life cycles at **AURXON**.

AIMS isn't just another database spreadsheet in disguise. We engineered it to solve a very human problem: **onboarding, tracking, and elevating real human talent without drowning in spreadsheets.** It provides mentors, administrators, and coordinators with a seamless, lag-free administrative workspace built on premium **aurxon-brand ergonomics**.

No mock fallbacks, no placeholder shortcuts—just a clean, robust, and lightning-fast internal SaaS tool built for enterprise scale.

---

## ✨ Core Superpowers

| Feature | Description | Operational Workflow |
| :--- | :--- | :--- |
| **💡 Smart ID Engine** | Alphanumeric unique IDs based on official roles. | Auto-generated standard patterns: `AXN-SWE-2605-KV01`. |
| **📁 Workspace Profile** | Dynamic dashboard pages for individual interns. | Direct view (`/interns/[id]`) showing all tasks, attendance registers, and compliance files. |
| **🗑️ Secure Deletes** | Administrator-restricted roster clearing mechanics. | Cascades database relations cleanly from database storage without leaving orphaned logs. |
| **🔒 Role Guards** | Level-based middleware and REST guards. | Strict separation between admin permissions and mentor views. |
| **✨ Clean Branding** | Sleek Glacial Blue-White premium palette. | Fast, responsive, dark-mode toggle ready layout with minimum clutter. |

---

## 🏗️ Technical Architecture Layout

AIMS is engineered on **Clean Architecture** patterns utilizing Next.js Server Components for lightning-fast database retrievals and client side hooks for high-fidelity interactive elements.

```text
aurxon-aims/
├── prisma/                         # DB Schemas & Production Seed Scripts
│   ├── schema.prisma               # PostgreSQL cascade models
│   └── seed.ts                     # Cleansed seeder for Admin & Mentor
│
├── src/                            # Application Root
│   ├── app/                        # Next.js App Router (100% Async Parameters compatible)
│   │   ├── (auth)/                 # Login views
│   │   ├── (dashboard)/            # Shared Side Navigation Workspace views
│   │   │   ├── interns/            # Intern Roster, Add Wizards, & Profiles
│   │   │   ├── tasks/              # Task Queues
│   │   │   ├── documents/          # Compliance Document Vaults
│   │   │   └── logs/               # Operational Logs
│   │   └── api/                    # Serverless API routes (POST, DELETE, PUT)
│   │
│   ├── components/                 # Presentation Layer
│   │   ├── ui/                     # Premium atomic components (Buttons, Cards, Modals)
│   │   └── layout/                 # Interactive widgets (Forms, Filters, Action Modals)
│   │
│   └── lib/                        # Core Logic & Shared State
│       ├── auth.ts                 # NextAuth credentials authentication config
│       ├── roles.ts                # 50-Role alphanumeric code dictionary
│       └── generateInternId.ts     # Sequential duplicate-resistant ID engine
```

---

## 🚀 Speedrun Setup (Getting Started)

Deploy the system locally in **under 3 minutes** using the following steps:

### 1. Pre-requisites
Ensure you have **Node.js (v18+)** and a running **PostgreSQL** database instance.

### 2. Configure Environment Secrets
Create a `.env` file in the root directory (refer to `.env.example`):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/aims_db?schema=public"
NEXTAUTH_SECRET="your-super-secret-jwt-key-minimum-32-characters"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Push Database Schemas & Run Production Seed
AIMS comes with a concise, clean seeder that creates your initial administrative credentials.
```bash
# Push schema schemas directly to the DB
npx prisma db push

# Run production-ready seeder (creates default admin accounts)
npx prisma db seed
```

### 5. Launch Development Workspace
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser and sign in:
* **Admin Role**: `admin@aurxon.demo` / `aims-demo-admin-2026`
* **Mentor Role**: `mentor@aurxon.demo` / `aims-demo-mentor-2026`

---

## 🛠️ Verification & Building for Production

Compile a production-ready package to verify types, static optimization paths, and bundler constraints:

```bash
# Run production compiler audit
npm run build
```

---

## 🤝 Git Workflow Commit Rules

To keep the project history as clean and readable as a Fortune 500 company:
1. **Always use Semantic Commits**: `feat(...)`, `fix(...)`, `refactor(...)`, `chore(...)`.
2. **Write in the imperative mood**: e.g., `feat(interns): add onboard button` instead of `added onboarding button`.
3. **Use Kebab-Case**: Always name files and folders in lowercase kebab-case (e.g., `add-intern-form.tsx`).

---

<p align="center">Made with 💙 by the <b>AURXON Engineering & Platform Team</b>.</p>
