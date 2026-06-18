import React, { useEffect } from 'react'
import Register from './components/Register'
import Login from './components/Login'
import Lobby from './components/Lobby' // 1. IMPORT THE LOBBY
import { io } from 'socket.io-client'

const socket = io("http://localhost:5000");

function App() {
  
  useEffect(() => {
    socket.on("connect", () => {
      console.log("🚀 FRONTEND SUCCESS: Connected to Real-Time Server!");
    });
    return () => {
      socket.off("connect");
    };
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#222' }}>StudyRoom Arena</h1>
      
      <hr style={{ margin: '30px 0', borderColor: '#eee' }} />
      
      {/* Existing Auth Setup */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
        <Register />
        <Login />
      </div>

      <hr style={{ margin: '40px 0', borderColor: '#eee' }} />

      {/* 2. THE VISUAL LOBBY CONTROLS */}
      <h2 style={{ textAlign: 'center', color: '#333' }}>Dashboard Lobby</h2>
      <Lobby />
    </div>
  )
}

export default App