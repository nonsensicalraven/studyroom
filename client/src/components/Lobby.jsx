import React, { useState } from 'react';

function Lobby() {
  const [roomCode, setRoomCode] = useState('');
  const [roomMode, setRoomMode] = useState('focus');
  const [roomName, setRoomName] = useState('');

  const handleCreateRoom = (e) => {
    e.preventDefault();
    console.log("Creating a room named:", roomName, "with mode:", roomMode);
    // Future step: This will trigger our POST /api/rooms/create API call!
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    console.log("Attempting to join room with code:", roomCode.toUpperCase());
    // Future step: This will trigger our GET /api/rooms/:code call!
  };

  return (
    <div style={{
      display: 'flex',
      gap: '30px',
      justifyContent: 'center',
      marginTop: '40px',
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
            marginTop: '43px' // Aligns buttons visually
          }}>
            Enter Arena
          </button>
        </form>
      </div>
    </div>
  );
}

export default Lobby;