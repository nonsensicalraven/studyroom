import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // App Phase States (Synchronized via backend timer properties)
  const [timeRemaining, setTimeRemaining] = useState(3000); // Default to 50 mins in seconds
  const [currentPhase, setCurrentPhase] = useState('work'); // 'work' or 'break' ('reveal' handled at 00:00)

  // Feature 2: Focus Mode Goals State
  const [goals, setGoals] = useState([
    { id: 1, text: '', completed: false },
    { id: 2, text: '', completed: false },
    { id: 3, text: '', completed: false }
  ]);

  // Feature 3: Arena Mode Scratchpad State
  const [scratchpadContent, setScratchpadContent] = useState('');

  useEffect(() => {
    const fetchRoomState = async () => {
      try {
        setErrorMessage('');
        const token = localStorage.getItem('studyArenaToken');
        
        if (!token) {
          setErrorMessage('Authentication missing. Please login.');
          setLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:5000/api/rooms/${roomCode}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          setRoomData({
            name: data.name,
            mode: data.mode,
            host: data.hostId?.username || "Host",
            customInput: data.customInput,
            difficulty: data.difficulty
          });
          
          // Feature 1: Unified Engine - Set starter clock based on host's mode selection
          setCurrentPhase(data.phase || 'work');
          if (data.phase === 'break') {
            setTimeRemaining(data.mode === 'focus' ? 600 : 300); // 10 min vs 5 min break
          } else {
            setTimeRemaining(data.mode === 'focus' ? 3000 : 1200); // 50 min vs 20 min work
          }

        } else {
          setErrorMessage(data.message || 'Failed to retrieve room details.');
        }
      } catch (error) {
        console.error("Network Error fetching room configuration:", error);
        setErrorMessage('Could not connect to the backend database server.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomState();
  }, [roomCode]);

  // Helper to format remaining seconds into clean MM:SS display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGoalTextChange = (id, text) => {
    setGoals(goals.map(g => g.id === id ? { ...g, text } : g));
  };

  const toggleGoalCompletion = (id) => {
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '20px', fontWeight: 'bold', color: '#666' }}>
        Syncing with Study Room Security Grid...
      </div>
    );
  }

  const isFocusMode = roomData?.mode === 'focus';
  const isWorkPhase = currentPhase === 'work';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', padding: '20px' }}>
      
      {errorMessage && (
        <div style={{ padding: '12px', backgroundColor: '#fff0f0', borderLeft: '5px solid #ff4d4d', borderRadius: '4px', color: '#c33', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
          {errorMessage}
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#222', 
        color: '#fff', 
        padding: '15px 25px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px' }}>{roomData?.name}</h2>
          <span style={{ fontSize: '13px', color: '#aaa' }}>Host: {roomData?.host}</span>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ 
            backgroundColor: isFocusMode ? '#4CAF50' : '#008CBA', 
            padding: '6px 12px', 
            borderRadius: '20px', 
            fontSize: '12px', 
            textTransform: 'uppercase', 
            fontWeight: 'bold' 
          }}>
            {roomData?.mode} ({currentPhase} phase)
          </span>
          <div style={{ letterSpacing: '1px', background: '#333', padding: '6px 12px', borderRadius: '4px', border: '1px solid #444' }}>
            CODE: <strong style={{ color: '#FFD700' }}>{roomCode}</strong>
          </div>
          <button 
            onClick={() => navigate('/lobby')}
            style={{ padding: '6px 12px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Leave
          </button>
        </div>
      </div>

      {/* CORE VIEWPORT SPLIT */}
      <div style={{ display: 'flex', gap: '20px', minHeight: '500px' }}>
        
        {/* LEFT COLUMN: SIDEBAR */}
        <div style={{ 
          width: '280px', 
          backgroundColor: '#fff', 
          border: '1px solid #eef', 
          borderRadius: '8px', 
          padding: '20px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h4 style={{ marginTop: 0, borderBottom: '2px solid #f4f4f4', paddingBottom: '10px', color: '#555' }}>
              Online Students (1)
            </h4>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
              <li style={{ padding: '8px 12px', backgroundColor: '#e9ecef', borderRadius: '4px', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                {roomData?.host} <span style={{ fontSize: '11px', color: '#28a745', marginLeft: '5px' }}>(Host)</span>
              </li>
            </ul>
          </div>

          {/* Feature 4 & 5: Unified Summary Feed Revealed During Break */}
          {!isWorkPhase && (
            <div style={{ backgroundColor: '#f0f7ff', padding: '12px', borderRadius: '6px', border: '1px solid #bce0ff', marginTop: '20px' }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#0056b3' }}>Automated Summary Feed</h5>
              <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>
                {isFocusMode ? "Displaying verified completed user milestones..." : "Displaying unmasked team code scratchpads..."}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CENTRAL WORKSPACE */}
        <div style={{ 
          flex: 1, 
          backgroundColor: '#fff', 
          border: '1px solid #eef', 
          borderRadius: '8px', 
          padding: '30px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          
          {/* Feature 1: The Unified Pomodoro Countdown Display */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '72px', margin: 0, fontFamily: 'monospace', color: isWorkPhase ? '#333' : '#ff5722' }}>
              {formatTimer(timeRemaining)}
            </h1>
            <p style={{ color: '#888', margin: '5px 0 0 0', fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold' }}>
              {isWorkPhase ? "Session Active - Focus Interval Locked" : "Break Active - Collaboration Open"}
            </p>
          </div>

          {/* Feature 5: Frictionless Discussion Lounge Icebreakers (Only Shows During Break) */}
          {!isWorkPhase && (
            <div style={{ width: '100%', padding: '15px', backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', marginBottom: '20px', textAlign: 'center' }}>
              <strong style={{ color: '#b78103', fontSize: '14px' }}>Discussion Prompt Indicator:</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#5d4037' }}>
                {isFocusMode ? "What did you get stuck on during this focus block?" : "Who used a better data structure or lower time complexity?"}
              </p>
            </div>
          )}

          {/* CORE CHAMELEON INTERFACE WORKSPACE */}
          <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {isFocusMode ? (
              
              /* Feature 2: Dopamine Goal Tracker Canvas (Focus Mode) */
              <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                <h3 style={{ textAlign: 'center', color: '#444', marginBottom: '20px' }}>Session Micro-Goals</h3>
                <p style={{ textAlign: 'center', color: '#777', fontSize: '13px', marginTop: '-15px', marginBottom: '20px' }}>
                  Anchor your session profile by specifying exactly three milestones.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {goals.map((goal, index) => (
                    <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#fdfdfd', padding: '12px', borderRadius: '6px', border: '1px solid #eaeaea' }}>
                      <input 
                        type="checkbox"
                        checked={goal.completed}
                        disabled={!isWorkPhase} // Freeze interaction rules when time finishes
                        onChange={() => toggleGoalCompletion(goal.id)}
                        style={{ width: '20px', height: '20px', cursor: isWorkPhase ? 'pointer' : 'not-allowed' }}
                      />
                      <input 
                        type="text"
                        placeholder={`Micro-Goal ${index + 1}`}
                        value={goal.text}
                        disabled={!isWorkPhase}
                        onChange={(e) => handleGoalTextChange(goal.id, e.target.value)}
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          textDecoration: goal.completed ? 'line-through' : 'none',
                          color: goal.completed ? '#aaa' : '#333',
                          backgroundColor: goal.completed ? '#f5f5f5' : '#fff'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

            ) : (
              
              /* Feature 3: LeetCode Gateway & Hidden Scratchpad Canvas (Arena Mode) */
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                {roomData?.customInput && (
                  <div style={{ margin: '0 0 20px 0', padding: '15px', background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#888', display: 'block', textTransform: 'uppercase' }}>Target Challenge Pipeline</span>
                      <a href={roomData.customInput} target="_blank" rel="noopener noreferrer" style={{ color: '#008CBA', fontWeight: 'bold', textDecoration: 'underline', fontSize: '15px' }}>
                        Open Live External Problem Platform
                      </a>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#999', display: 'block' }}>DIFFICULTY</span>
                      <span style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: '#e53935' }}>{roomData?.difficulty}</span>
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Private Scratchpad</span>
                    <span style={{ fontSize: '11px', color: '#999' }}>
                      {isWorkPhase ? "Hidden from other participants until 00:00" : "Unmasked - Public View"}
                    </span>
                  </div>
                  
                  <textarea 
                    value={scratchpadContent}
                    onChange={(e) => setScratchpadContent(e.target.value)}
                    disabled={!isWorkPhase} // Feature 4: Automated Reveal Phase freezes interaction
                    placeholder={isWorkPhase ? "// Copy-paste your algorithm logic, approaches, or functions here before the timer hits zero..." : "// Session finalized. Content is now public."}
                    style={{ 
                      width: '100%', 
                      flex: 1,
                      minHeight: '280px',
                      padding: '15px', 
                      fontFamily: 'monospace', 
                      borderRadius: '6px', 
                      border: '1px solid #ccc', 
                      boxSizing: 'border-box',
                      backgroundColor: isWorkPhase ? '#fafafa' : '#fff',
                      color: '#333',
                      resize: 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Room;