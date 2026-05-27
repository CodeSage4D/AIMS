# <p align="center"><img src="./public/Logo-AIMS/AurxonLogo.png" width="100" height="100" valign="middle" alt="Aurxon Logo" /><br><b>A I M S</b></p>
<p align="center"><b>Aurxon Internal Management System</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.6-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" alt="License" />
</p>

---

## 🌟 Welcome to AIMS

**AIMS (Aurxon Internal Management System)** is the official premium internal nerve center for managing employee onboarding, document verification, smart badge assignment, and training lifecycle tracking at **AURXON**.

Designed with **glassmorphism-themed workspaces**, dynamic onboarding pathways, and high-readability text styling for both dark and light modes, AIMS is engineered for professional, lag-free administrative operational workflows.

---

## ✨ Core Features & Workflows

### 🎨 Premium Glassmorphic Intern Dashboard
*   **Flexible Styling:** Seamless transition between dark and light themes with absolute text legibility (`text-foreground` and `bg-card` mapping).
*   **Interactive Onboarding Roadmap:** Shows dynamic step-by-step progress through onboarding tasks and document submissions.
*   **Announcement Banner:** Notice Board widget displaying relevant news and alerts for interns.
*   **Todo & Task Queues:** Manage pending activities directly from the dashboard.

### 📁 Compliant Document Vault & Digital Signatures
*   **Simplified Signatures:** Clean signature pad and digital acceptance workflow for mandatory employee documents.
*   **Immediate Download & Access:** Employees can preview, digitally sign, and download their executed documents.
*   **Clear Visibility:** Removes confusing notifications and allows users to easily track and review their signed records.

### 🛡️ Smart Badge & Verification Management
*   **Founder-Assigned Designations:** Smart chip badges assigned securely by the leadership team.
*   **Automatic Unique Alphanumeric ID Engine:** Alphanumeric identifier tracking e.g., `AXN-SWE-2605-KV01`.

---

## 🏗️ Project Architecture Layout

```text
aurxon-aims/
├── prisma/                         # DB Schemas & Production Seed Scripts
│   ├── schema.prisma               # PostgreSQL cascade models
│   └── seed.ts                     # Cleansed seeder for Admin & Mentor
│
├── public/                         # Public Assets & Corporate Brand Marks
│   └── Logo-AIMS/                  # Aurxon Official Logos
│
├── src/                            # Application Root
│   ├── app/                        # Next.js App Router (100% Async Parameters compatible)
│   │   ├── (auth)/                 # Login, recovery, and onboarding pathways
│   │   ├── (dashboard)/            # Dashboard layout and view layers
│   │   └── api/                    # Serverless APIs (Tasks, Verification, Auth)
│   │
│   ├── components/                 # Presentation Layer
│   │   ├── ui/                     # Premium atomic components (Buttons, Cards, Modals)
│   │   └── layout/                 # Interactive widgets (NoticeBoard, DocumentVaultClient)
│   │
│   └── lib/                        # Core Logic, Shared Helpers, & Middleware
```

---

## 🚀 Getting Started

### 1. Configure Environment Secrets
Create a `.env` file in the root directory (refer to `.env.example`):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/aims_db?schema=public"
NEXTAUTH_SECRET="your-super-secret-jwt-key-minimum-32-characters"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database & Seed
```bash
npx prisma db push
npx prisma db seed
```

### 4. Run Development Workspace
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** and sign in.

---

## 🛡️ License Notice
This project is licensed under the terms of the **Aurxon Internal Management System (AIMS) Proprietary License and EULA**. Any unauthorized distribution, copying, decompilation, or modification of the source code and database configurations is strictly prohibited. Please read the [LICENSE](file:///e:/Aurxon-DB/LICENSE) file for the full legal terms.

---
<p align="center">Made with 💙 by the <b>AURXON Engineering & Platform Team</b>.</p>
