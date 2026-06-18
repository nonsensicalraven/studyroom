import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom' // 👇 Import Router tools
import Register from './components/Register'
import Login from './components/Login'
import Lobby from './components/Lobby'
import { io } from 'socket.io-client'
import Room from './components/Room' 

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
    <BrowserRouter> {/*Gives the entire app access to the routing map */}
      <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
        <h1 style={{ textAlign: 'center', color: '#222' }}>StudyRoom Arena</h1>
        
        <hr style={{ margin: '30px 0', borderColor: '#eee' }} />
        
        {/*Define our dynamic page swapping zone */}
        <Routes>
          {/* Default Route: Redirects users straight to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Dedicated Individual Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/lobby" element={<Lobby />} />
          
          {/* Dynamic Room Canvas Workspace (Placeholder for next step) */}
          <Route path="/room/:roomCode" element={<Room />} />
        </Routes>
        
      </div>
    </BrowserRouter>
  )
}

export default App