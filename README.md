# StudyRoom 🚀

An on-demand, real-time collaborative study platform designed for students to break isolation, build accountability, and learn together. Built with the MERN stack and Socket.io.

---

## 💡 The Core Problem
Studying alone leads to procrastination, lack of focus, and zero accountability. While basic chat apps exist, they don't replicate the energy of a real-world study group or a competitive coding contest. **StudyRoom** bridges this gap by creating synchronized, feature-rich virtual spaces for peers.

## 🌟 Key Features

### 1. ⚔️ Arena Mode (For Coders)
* **On-Demand Lobbies:** Create a room for a specific topic (e.g., *DSA - Trees*) and invite classmates to join via a room code.
* **Synchronized Coding Sessions:** Once the host starts the session, a countdown timer ticks down in perfect sync for every user.
* **Embedded Syntax Highlighting:** Write solutions inside a sleek, premium code editor component (powered by Monaco/CodeMirror) right in the browser.
* **The Reveal Phase:** Code boxes remain private during the timer to prevent copying. The microsecond the timer hits `00:00`, all inputs lock and everyone's code is revealed simultaneously for peer review.

### 2. ⏱️ Focus Mode (For General Subjects)
* **Communal Spaces:** Tailored for non-coding topics like Mathematics, Operating Systems prep, or general engineering subjects.
* **Shared Pomodoro Engine:** A synchronized timer handles focus blocks (e.g., 25 minutes of deep work). Inputs are hidden during focus time to maintain deep concentration.
* **Break-Time Discussions:** The moment a break triggers, a dedicated discussion board/chat opens automatically so students can share what they accomplished, clear doubts, and collaborate.

---

## 🛠️ Tech Stack

* **Frontend:** React.js, TailwindCSS, Monaco Editor (or CodeMirror)
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (via Mongoose)
* **Real-Time Engine:** Socket.io (WebSockets)
* **Authentication:** JSON Web Tokens (JWT) & Bcrypt

---

## 📅 The 30-Day Execution Plan

* **Week 1:** Foundation, MongoDB Setup & User Authentication (JWT)
* **Week 2:** Room Management APIs & Socket.io Room/Presence Logic
* **Week 3:** Real-time Core (Synchronized Timers, Monaco Integration, Reveal/Break States)
* **Week 4:** UI Polishing, Testing, and Deployment (Vercel & Render)

---

## ⚙️ Local Setup (Backend Baseline)

1. Clone the repository:
   ```bash
   git clone git@github.com:YOUR_GITHUB_USERNAME/studyroom.git
   cd studyroom/server

2. Install dependencies:
    ```bash
    npm install

3. Configure your environment variables:
    create a .env file in the server directory:
    PORT=5000
    MONGO_URI=your_mongodb_connection_string

4. Run the server:
    ```bash
    npm run dev