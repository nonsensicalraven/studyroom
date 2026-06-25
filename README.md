# StudyRoom 

An on-demand, real-time collaborative workspace engineered to cure student isolation, defeat procrastination, and drive academic momentum. Built using the MERN stack and Socket.io, StudyRoom transforms solo study fatigue into synchronized, shared accountability.

> **Why it exists:** Studying alone leads to a vacuum of motivation, while global platforms feel cold and noisy. StudyRoom provides a distraction-free, private container where peer groups, classmates, or hackathon partners can instantly "lock in" together.

---

## The Core Unification & Psychology

1. **Shared Momentum:** Lobbies are private and on-demand. Simply spin up a space, drop the room code in a WhatsApp group, and sync with your peers instantly.
2. **The "Exit Ticket" Pattern:** To destroy the awkward social silence that happens during breaks, the system blocks the screen the exact millisecond the timer hits zero. Users must submit a single-sentence "Exit Ticket" (*What did you get stuck on?*), instantly auto-populating the chat so the discussion flows effortlessly.

---

## Key Core Features

### 1. Focus Mode (Core Engineering Track)
* **The Pacing:** A synchronized 50-minute deep work block followed by a 10-minute break lounge.
* **The Dopamine Goal Tracker:** Before the 50-minute Pomodoro engine kicks off, users must declare exactly **three micro-goals**. 
* **The Reveal:** At `00:00`, everyone's goal progression ($1/3$, $3/3$) is unmasked globally, turning peer comparison into positive motivational fuel.

### 2. Arena Mode (The Logic/Interview Sprint)
* **The Pacing:** A sharp, high-intensity 20-minute algorithmic sprint followed by a 5-minute break lounge.
* **LeetCode/GFG Integration:** The room host drops a direct problem link so users can code and compile directly on platforms.
* **The Locked Scratchpad:** While users code and compile directly on the official platform, the scratchpad acts as a private vault for thoughts, logic, or code blocks. The workspace locks and unmasks everyone's approaches simultaneously at zero hour for code review.

### 3. Real-Time Engine
* **Server-Driven Truth:** Timers are calculated on the Express server and broadcasted via WebSockets to prevent client-side background tab drift.
* **Host Transference:** Complete room lifecycle management—if the room creator leaves mid-session, the control console seamlessly transfers to another active peer without dropping the session state or interrupting the countdown.

---

## Tech Stack & Architecture

* **Frontend:** React.js (Vite), React Router DOM, Custom Context State
* **Backend:** Node.js, Express.js 
* **Real-Time Layer:** Socket.io (Isolated Room Channeling, Real-Time Events).
* **Database:** MongoDB Atlas & Mongoose
* **Security Engine:** JSON Web Tokens (JWT)  & Bcrypt password hashing

---

## Future Scope & Roadmap

Features planned for Version 2 to expand the ecosystem:
* **Custom Pacing Controls:** Allow the room host to select custom session/break durations.
* **Difficulty & Topic Tags:** Add `Easy`, `Medium`, and `Hard` filtering badges to Arena lobbies.
* **Dynamic Prompt Pools:** Expand the automated break lounge questions into diverse categories (conceptual, technical, motivational).
* **Persistent Personal Streaks:** A localized visual streak engine to track consecutive days of completed study blocks.

---

## Local Setup & Installation

```bash
# 1. Clone the repository and navigate into it
git clone [https://github.com/nonsensicalraven/studyroom.git](https://github.com/nonsensicalraven/studyroom.git)
cd StudyRoom

# 2. Setup and start the backend server
cd server
npm install
# (Make sure to create a .env file here with PORT=5000, MONGO_URI, and JWT_SECRET)
npm start

# 3. Setup and start the frontend client (Run this in a separate terminal window at the root folder)
cd client
npm install
npm run dev
```

## What I Learned 

Building this solo as a Full-Stack Product Engineer over a 24-day sprint taught me lessons that tutorials can never replicate:
* **Product vs. Developer Tension:** Learned to brutally cut features (like full in-browser code execution) to prioritize a bulletproof, frictionless user experience.
* **Managing Socket Lifecycles:** Overcame the "Ghost User" problem by handling tricky disconnect edge cases and automated host transference when connection drops occur.
* **Real-Time Client-Server Sync:** Solved the background-tab timer drift problem by establishing the backend server as the absolute, immutable source of truth for time tracking.
* **Full-Stack Independence:** Navigated the full pipeline of a live web application—functioning simultaneously as the frontend engineer, backend developer, and system architect.
