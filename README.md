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
adaptive-quiz-system/
├── src/
│   ├── components/       # shadcn/ui and custom reusable UI components
│   ├── context/          # AuthContext handling JWT, role, and URL persistence
│   ├── hooks/            # Custom React hooks (e.g., useToast)
│   ├── pages/            # Landing, Selection, Quiz, and 404 pages
│   └── lib/              # Global types and utility functions
├── backend/
│   ├── app/              # FastAPI application routers and logic
│   ├── pyproject.toml    # uv dependency management
│   └── requirements.txt  # Exported python requirements
└── README.md
```

## ⚙️ Configuration & Setup
Clone the repository to get started:
```bash
git clone https://github.com/KishonShrill/ragtime-reviewer.git
cd ragtime-reviewer
```

### 1. AI Serving (Ollama)
The system requires Ollama to server the LLM locally
    1. Install [Ollama](https://ollama.com/)
    2. Pull the required Llama 3.1 models for testing and inference:
    ```bash
    ollama pull llama3.1:8b
    ollama pull llama3.1:8b-instruct-q2_K
    ollama pull llama3.1:8b-instruct-q4_K_M
    ```

### 2. Secure Tunneling (Cloudflared)To expose your local FastAPI backend securely, install Cloudflared.
To expose your local FastAPI backend securely, install Cloudflared.
**System Dependencies required for Cloudflared:**
- [GNU Make](https://www.gnu.org/software/make/) 
- [capnp](https://capnproto.org/install.html)
- [go >= 1.24](https://go.dev/doc/install)

Once dependencies are met, install and make a Cloudflared tunnel:
```bash
cloudflared --url <the-running-server-url> # This will be seen later
```

### 3. Backend Configuration (FastAPI & uv)
The backend uses [uv for lightning-fast Python](https://docs.astral.sh/uv/) dependency management.

Navigate to the backend directory and set up the environment:
```bash
cd server
```

#### UV Tools
```bash
uv run python -V                # To check for python version of UV
uv python pin <python-version>  # To change the python version of UV
uv python list                  # To see all python versions for download
```

#### Installing from `pyproject.toml`
```bash
uv sync

# (Optional) Standard pip installation:
pip install -r requirements.txt
```

#### Exporting or Freezing Dependencies
```bash
# Export from pyproject.toml / uv.lock
uv pip compile pyproject.toml -o requirements.txt

# Freeze current environment
uv pip freeze > requirements.txt
```

#### Run the backend server:
```bash
# Ensure you are inside server folder
uv run fastapi run main.py [--reload] # reload is optional
```

### 4. Frontend Configuration (React & npm)
Navigate to the root directory then install the dependencies.
```bash
npm install
npm run dev

# or

npm run build
npm run preview
```

## 📝 Ongoing Thesis Research
The project currently focuses on analyzing and categorizing multiple-choice questions based on:

* **Subjects**: General Science, Chemistry, Physics, and Biology.
* **Difficulty Levels**: Easy, Medium, Hard.
* **Bloom's Taxonomy**: Remembering, Understanding, Applying.
* **Pilot Testing**: Specifically targeting Grade 12 Senior High School standards in the Philippines.

---

## Credits
* **Author**: Chriscent Louis June M. Pingol
* **Degree**: BS Computer Science
* **Institution**: Mindanao State University – Iligan Institute of Technology
* **Thesis Panelists**: Sir Orven Llamos, Ma'am Liezel Daberao, Sir Renato Crisostomo
