import React, { useEffect } from 'react'
import Register from './components/Register'
import Login from './components/Login'
// 1. Import the socket client tool
import { io } from 'socket.io-client'

// 2. Establish the connection to port 5000
const socket = io("http://localhost:5000");

function App() {
  
  // 3. This hook runs once when the app mounts to monitor our connection
  useEffect(() => {
    socket.on("connect", () => {
      console.log("FRONTEND SUCCESS: Connected to Real-Time Server!");
      console.log("Your Temporary Socket Passport ID is:", socket.id);
    });

    // Clean up connection if the user closes the app
    return () => {
      socket.off("connect");
    };
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center' }}>StudyRoom Arena</h1>
      
      <hr style={{ margin: '30px 0', borderColor: '#eee' }} />
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
        <Register />
        <Login />
      </div>
    </div>
  )
}

export default App