# 🧠 FiscalMind: Intelligent Financial Intelligence

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_App-blue?style=for-the-badge&logo=vercel)](https://fiscal-mind.vercel.app/)
[![Backend Status](https://img.shields.io/badge/Backend-Online-success?style=for-the-badge&logo=render)](https://fiscal-mind.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

> **A professional full-stack financial workspace designed to track, analyze, and optimize personal wealth.** > Built with the **PERN Stack** (PostgreSQL, Express, React-logic*, Node.js).

---

## 📸 Project Showcase

| **Main Dashboard** | **Smart AI Consultant** |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/6019f81e-9a28-4cfd-8138-b1939576760b" width="400" alt="Dashboard View"> | <img src="https://github.com/user-attachments/assets/2cf06a70-bb35-4674-85e2-025a4eefc633" width="400" alt="AI Logic"> |
| *Real-time analytics & financial health chart* | *Context-aware advice based on spending habits* |

| **Budget Buckets (Gamified)** | **Time Travel (History)** |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/36163efb-34b7-4673-8114-354a7569e631" width="400" alt="Budget Buckets"> | <img src="https://github.com/user-attachments/assets/c15bab70-a238-4fcb-b9aa-25642b2a401a" width="400" alt="Time Travel"> |
| *Visual limits that shake when exceeded* | *Filter records by specific months/years* |

---

## 🚀 Key Features

### 🔐 Bank-Grade Security
* **JWT Authentication:** Secure stateless login/logout sessions.
* **Bcrypt Hashing:** Passwords are encrypted before storage.
* **Data Isolation:** Users can only access their own private transaction data.

### 🧠 Intelligent Analysis
* **Smart Suggestions:** The app detects "High Burn Rates" or "Wealth Builder Modes" dynamically.
* **Pattern Recognition:** Identifies lifestyle inflation (e.g., spending too much on "Coffee" or "Uber").

### 📊 Professional Tools
* **Interactive Visuals:** Dynamic Doughnut charts powered by **Chart.js**.
* **Budget Buckets:** Set custom limits for categories (Food, Transport). The UI warns you visually if you overspend.
* **PDF Reporting:** Generate branded, professional financial statements with chart snapshots.
* **Time Travel:** Filter financial history by month and year to track trends.

---

## 🛠️ Tech Stack

**Frontend:**
* HTML5, CSS3 (Modern Glassmorphism UI)
* Vanilla JavaScript (ES6+ Async/Await)
* **Chart.js** (Data Visualization)
* **jsPDF** (Report Generation)

**Backend:**
* **Node.js** & **Express.js** (REST API)
* **PostgreSQL** (Relational Database via Neon Tech)
* **Authentication:** `jsonwebtoken` (JWT) & `bcryptjs`

**Deployment:**
* **Frontend:** Vercel (Global CDN)
* **Backend:** Render (Auto-Scaling Node Service)

---

## ⚙️ Installation & Local Setup

Want to run this on your machine?

**1. Clone the Repository**
```bash
git clone [https://github.com/Dewan-eng/Fiscal-mind.git](https://github.com/Dewan-eng/Fiscal-mind.git)
cd Fiscal-mind
