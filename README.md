# Adaptive Quiz Generation System

An intelligent, web-based platform developed as part of a computer science thesis: **"Adaptive Quiz Generation for College Entrance Exam Preparation Using Large Language Model"**. This system is designed to streamline exam preparation for institutions like MSU-IIT (SASE) and UP (UPCAT) by providing subject-specific, adaptive question sets.



## 🚀 Project Overview
This project leverages **Retrieval-Augmented Generation (RAG)** and a **MongoDB** database of validated questions to generate quizzes tailored to a student's performance. It features a modular architecture that allows users to provide their own backend endpoints, supporting decentralized hosting of Large Language Models (LLMs).

### Core Technologies
* **Frontend:** React (Vite) with TypeScript.
* **Styling:** Tailwind CSS (v4) with shadcn/ui (Radix UI).
* **Backend:** FastAPI (Python).
* **Authentication:** Custom JWT-based Auth Provider with role persistence.
* **Database:** MongoDB for validated question storage.
* **Package Manager:** Bun.

## 🛠 Features
* **Dynamic Backend Connectivity:** Users enter their server URL at runtime, allowing the frontend to point to different API endpoints.
* **Multi-Layered Security:** Requires Username, Password, and a unique **Admin Secret** to validate account authenticity.
* **Role-Based Access Control (RBAC):**
  * **Admin:** Full access to difficulty filters (Easy, Medium, Hard) and subject categorization.
  * **Regular User:** Access to standard "Start Quiz" features.
  * **Free Trial:** Access restricted to specific trial modes.
* **Adaptive Logic Implementation:** Incorrect answers are logged and sent to a `/retry` endpoint to assist the LLM in generating adaptive content.

## 📂 Project Structure
```text
src/
├── components/   # shadcn/ui and custom reusable UI components
├── context/      # AuthContext handling JWT, role, and URL persistence
├── hooks/        # Custom React hooks (e.g., useToast)
├── pages/        # Landing, Selection, Quiz, and 404 pages
└── lib/          # Global types and utility functions
```

## ⚙️ Configuration & Setup
**Environment Variables**
Create a `.env` file in the root directory:
```text
VITE_AUTH_SALT=your_secure_salt_here
```

**Installation**
```bash
# Using Bun (Recommended)
bun install

# Using NPM
npm install
```

**Running the Application**
```bash
# Using Bun (Recommended)
bun dev

# Using NPM
npm run dev
```

## 📝 Ongoing Thesis Research
The project currently focuses on analyzing and categorizing multiple-choice questions based on:

* **Subjects**: General Science, Chemistry, Physics, and Biology.
* **Difficulty Levels**: Easy, Medium, Hard.
* **Bloom's Taxonomy**: Specifically targeting Grade 12 Senior High School standards in the Philippines.

---

## Credits
**Author**: Chriscent Louis June M. Pingol
**Degree**: BS Computer Science
**Institution**: Mindanao State University – Iligan Institute of Technology
**Thesis Panelists**: Sir Orven, Ma'am Liezel Daberao, Sir Renato Crisostomo
