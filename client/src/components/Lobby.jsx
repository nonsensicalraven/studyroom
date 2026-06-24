import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Lobby() {
  const [roomCode, setRoomCode] = useState('');
  const [roomMode, setRoomMode] = useState('focus');
  const [roomName, setRoomName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [customInput, setCustomInput] = useState('');

  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const token = localStorage.getItem('studyArenaToken');
    if (!token) {
      setErrorMessage('Authentication missing. Please re-login.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: roomName, mode: roomMode, customInput: customInput }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Room initialized successfully in DB:", data);
        navigate(`/room/${data.room.roomCode}`);
      } else {
        setErrorMessage(data.message || 'Failed to create room.');
      }
    } catch (error) {
      console.error("Network Error:", error);
      setErrorMessage('Could not connect to the backend database server.');
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanCode = roomCode.toUpperCase().trim();

    const token = localStorage.getItem('studyArenaToken');
    if (!token) {
      setErrorMessage('Authentication missing. Please re-login.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode: cleanCode }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Joined room successfully:", data);
        navigate(`/room/${cleanCode}`);
      } else {
        setErrorMessage(data.message || 'Invalid or expired room code.');
      }
    } catch (error) {
      console.error("Network Error:", error);
      setErrorMessage('Could not connect to the backend database server.');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-5)' }}>
      {/* Error Banner */}
      {errorMessage && (
        <div className="sa-banner sa-banner-error" style={{ marginBottom: 'var(--space-5)', maxWidth: '670px', margin: '0 auto var(--space-5) auto' }}>
          {errorMessage}
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="sa-lobby-grid">
        
        {/* CREATE A ROOM CARD */}
        <div className="sa-lobby-card">
          <h3>Create a Study Room</h3>
          <form onSubmit={handleCreateRoom} className="sa-form-group">
            
            <div>
              <label htmlFor="roomName">Room Name</label>
              <input
                id="roomName"
                type="text"
                placeholder="e.g., OS Session"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="roomMode">Select Mode</label>
              <select
                id="roomMode"
                value={roomMode}
                onChange={(e) => setRoomMode(e.target.value)}
              >
                <option value="focus">Focus Mode (50 mins)</option>
                <option value="arena">Arena Mode (LeetCode Sprint)</option>
              </select>
            </div>

            {/* Conditional: Only shows if Arena Mode is chosen */}
            {roomMode === 'arena' && (
              <div>
                <label htmlFor="customInput">🔗 LeetCode Problem Link / Topic</label>
                <input
                  id="customInput"
                  type="text"
                  placeholder="e.g., https://leetcode.com/problems/two-sum"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  required
                />
              </div>
            )}

            <button type="submit" className="sa-btn sa-btn-primary sa-btn-full">
              Generate Live Room
            </button>
          </form>
        </div>

        {/* JOIN A ROOM CARD */}
        <div className="sa-lobby-card">
          <h3>Join via Room Code</h3>
          <form onSubmit={handleJoinRoom} className="sa-form-group">
            
            <div>
              <label htmlFor="roomCode">Enter 6-Character Code</label>
              <input
                id="roomCode"
                type="text"
                maxLength="6"
                placeholder="e.g., B38E82"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-md)',
                  fontWeight: 'var(--weight-semibold)',
                }}
                required
              />
            </div>

            <button type="submit" className="sa-btn sa-btn-primary sa-btn-full" style={{ marginTop: 'var(--space-4)' }}>
              Enter Arena
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Lobby;