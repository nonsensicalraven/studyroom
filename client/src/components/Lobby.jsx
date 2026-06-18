import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Lobby() {
  const [roomCode, setRoomCode] = useState('');
  const [roomMode, setRoomMode] = useState('focus');
  const [roomName, setRoomName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Extract our secure digital keycard from local storage
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
          'Authorization': `Bearer ${token}` // Passing the keycard to pass through auth middleware
        },
        body: JSON.stringify({ name: roomName, mode: roomMode }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Room initialized successfully in DB:", data);
        // Teleport user instantly to the dynamic room workspace route
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
        // Teleport the guest into the exact same dynamic workspace route
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
    <div style={{ padding: '20px' }}>
      {/* Dynamic Global Notification Banner */}
      {errorMessage && (
        <div style={{
          maxWidth: '670px',
          margin: '0 auto 20px auto',
          padding: '12px',
          backgroundColor: '#fff0f0',
          borderLeft: '5px solid #ff4d4d',
          borderRadius: '4px',
          color: '#c33',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '30px',
        justifyContent: 'center',
        marginTop: '20px',
        flexWrap: 'wrap'
      }}>
        {/* BOX 1: CREATE A ROOM */}
        <div style={{
          backgroundColor: '#fff',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          width: '320px',
          border: '1px solid #eef'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>🚀 Create a Study Room</h3>
          <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Room Name</label>
              <input 
                type="text" 
                placeholder="e.g., OS Grind Session" 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Select Mode</label>
              <select 
                value={roomMode} 
                onChange={(e) => setRoomMode(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}
              >
                <option value="focus">🧘 Focus Mode (50 mins)</option>
                <option value="arena">💻 Arena Mode (LeetCode Sprint)</option>
              </select>
            </div>

            <button type="submit" style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: '0.2s'
            }}>
              Generate Live Room
            </button>
          </form>
        </div>

        {/* BOX 2: JOIN A ROOM */}
        <div style={{
          backgroundColor: '#fff',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          width: '320px',
          border: '1px solid #eef'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>🔑 Join via Room Code</h3>
          <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Enter 6-Character Code</label>
              <input 
                type="text" 
                maxLength="6"
                placeholder="e.g., B38E82" 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '6px', 
                  border: '1px solid #ccc', 
                  textTransform: 'uppercase', 
                  letterSpacing: '2px',
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <button type="submit" style={{
              backgroundColor: '#008CBA',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '43px'
            }}>
              Enter Arena
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Lobby;