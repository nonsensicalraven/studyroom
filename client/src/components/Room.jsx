import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

// Initialize the real-time wire point to backend port
const socket = io('http://localhost:5000');

function Room() {
    const { roomCode } = useParams();
    const navigate = useNavigate();

    // Core Data States
    const [roomData, setRoomData] = useState(null);
    const [participantsList, setParticipantsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');

    // App Phase States
    const [timeRemaining, setTimeRemaining] = useState(3000);
    const [currentPhase, setCurrentPhase] = useState('work');

    // Feature 2: Focus Mode Goals State
    const [goals, setGoals] = useState([
        { id: 1, text: '', completed: false },
        { id: 2, text: '', completed: false },
        { id: 3, text: '', completed: false }
    ]);

    // Feature 3: Arena Mode Scratchpad State
    const [scratchpadContent, setScratchpadContent] = useState('');

    // Unified function to refetch who is in the room
    const refreshParticipants = async () => {
        try {
            const token = localStorage.getItem('studyArenaToken');
            const response = await fetch(`http://localhost:5000/api/rooms/${roomCode}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setParticipantsList(data.participants || []);
            }
        } catch (err) {
            console.error("Error refreshing roster sync:", err);
        }
    };

    // Central state synchronization manager
    const fetchRoomState = async () => {
        try {
            setErrorMessage('');
            const token = localStorage.getItem('studyArenaToken');

            if (!token) {
                setErrorMessage('Authentication missing. Please login.');
                setLoading(false);
                return;
            }

            const cachedUser = localStorage.getItem('studyArenaUser');
            let parsedUid = '';
            if (cachedUser) {
                const parsed = JSON.parse(cachedUser);
                parsedUid = parsed.id || parsed._id || '';
                setCurrentUserId(parsedUid);
            }

            const response = await fetch(`http://localhost:5000/api/rooms/${roomCode}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {

                const rawHostId = data.hostId?._id || data.hostId || "";

                setRoomData({
                    name: data.name,
                    mode: data.mode,
                    host: data.hostId?.username || "Host",
                    hostRawId: data.hostId?._id || data.hostId || "",
                    customInput: data.customInput,
                    difficulty: data.difficulty
                });

                setParticipantsList(data.participants || []);
                setCurrentPhase(data.phase || 'work');

                if (data.phase === 'break') {
                    setTimeRemaining(data.mode === 'focus' ? 600 : 300);
                } else {
                    setTimeRemaining(data.mode === 'focus' ? 3000 : 1200);
                }

                // Emit structured metadata containing both room keys and credentials
                if (parsedUid) {
                    socket.emit('join_room', {
                        roomCode: roomCode.toUpperCase(),
                        userId: parsedUid
                    });
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

    useEffect(() => {
        // Kick off verification sequence
        fetchRoomState();

        // Sync UI values with Master Server Engine Heartbeats
        socket.on('timer_update', (timerPayload) => {
            setTimeRemaining(timerPayload.timeRemaining);
            setCurrentPhase(timerPayload.currentPhase);
        });

        socket.on('phase_changed', (phasePayload) => {
            setCurrentPhase(phasePayload.currentPhase);
            setTimeRemaining(phasePayload.timeRemaining);
            alert("Interval Complete! Private workspaces are now available.");
        });

        socket.on('user_joined_broadcast', (broadcastPayload) => {
            console.log("Live Event Broadcast Received:", broadcastPayload.msg);
            refreshParticipants();
        });

        socket.on('user_left_broadcast', (broadcastPayload) => {
            console.log("Live Exit Broadcast Received:", broadcastPayload.msg);
            refreshParticipants();
            fetchRoomState(); // Force-sync configuration updates to run host calculations
        });

        // 🧹 EXTENDED CLEANUP HOOK
        return () => {
            const cachedUser = localStorage.getItem('studyArenaUser');
            if (cachedUser) {
                const parsed = JSON.parse(cachedUser);
                const uid = parsed.id || parsed._id || '';
                // Explicitly inform the server we are exiting this room immediately
                socket.emit('leave_room', { roomCode: roomCode.toUpperCase(), userId: uid });
            }

            socket.off('user_joined_broadcast');
            socket.off('user_left_broadcast');
            socket.off('timer_update');
            socket.off('phase_changed');
        };
    }, [roomCode]); // Fires perfectly every single time roomCode in URL route updates!

    const handleStartMasterTimer = () => {
        if (!roomData) return;
        const totalSeconds = roomData.mode === 'focus' ? 3000 : 1200;

        socket.emit('start_session', {
            roomCode: roomCode.toUpperCase(),
            duration: totalSeconds,
            mode: roomData.mode
        });
    };

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
    const isCurrentUserHost = String(currentUserId) === String(roomData?.hostRawId);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', padding: '20px' }}>

            {errorMessage && (
                <div style={{ padding: '12px', backgroundColor: '#fff0f0', borderLeft: '5px solid #ff4d4d', borderRadius: '4px', color: '#c33', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
                    {errorMessage}
                </div>
            )}

            {/* HEADER SECTION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#222', color: '#fff', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px' }}>{roomData?.name}</h2>
                    <span style={{ fontSize: '13px', color: '#aaa' }}>
                        Host: {roomData?.host} {isCurrentUserHost ? "(You are the Host)" : "(You are a Guest)"}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ backgroundColor: isFocusMode ? '#4CAF50' : '#008CBA', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        {roomData?.mode} ({currentPhase} phase)
                    </span>
                    <div style={{ letterSpacing: '1px', background: '#333', padding: '6px 12px', borderRadius: '4px', border: '1px solid #444' }}>
                        CODE: <strong style={{ color: '#FFD700' }}>{roomCode}</strong>
                    </div>
                    <button onClick={() => navigate('/lobby')} style={{ padding: '6px 12px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Leave
                    </button>
                </div>
            </div>

            {/* CORE VIEWPORT SPLIT */}
            <div style={{ display: 'flex', gap: '20px', minHeight: '500px' }}>

                {/* LEFT COLUMN: SIDEBAR */}
                <div style={{ width: '280px', backgroundColor: '#fff', border: '1px solid #eef', borderRadius: '8px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h4 style={{ marginTop: 0, borderBottom: '2px solid #f4f4f4', paddingBottom: '10px', color: '#555' }}>
                            Online Students ({participantsList.length})
                        </h4>
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                            {participantsList.map((user) => {
                                const isUserHost = String(user._id || user) === String(roomData?.hostRawId);
                                return (
                                    <li key={user._id} style={{
                                        padding: '8px 12px',
                                        backgroundColor: isUserHost ? '#e8f5e9' : '#f8f9fa',
                                        borderLeft: isUserHost ? '4px solid #4CAF50' : '4px solid #008CBA',
                                        borderRadius: '4px',
                                        marginBottom: '8px',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        color: '#333'
                                    }}>
                                        {isUserHost ? "🟢 " : "🟡 "}
                                        {user.username}
                                        {isUserHost && <span style={{ fontSize: '11px', color: '#28a745', marginLeft: '5px' }}>(Host)</span>}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                {/* RIGHT COLUMN: CENTRAL WORKSPACE */}
                <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #eef', borderRadius: '8px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ textalign: 'center', marginBottom: '20px', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '72px', margin: 0, fontFamily: 'monospace', color: isWorkPhase ? '#333' : '#ff5722' }}>
                            {formatTimer(timeRemaining)}
                        </h1>
                        <p style={{ color: '#888', margin: '5px 0 0 0', fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            {isWorkPhase ? "Session Active - Focus Interval Locked" : "Break Active - Collaboration Open"}
                        </p>

                        {isCurrentUserHost && currentPhase === 'work' && (
                            <button
                                onClick={handleStartMasterTimer}
                                disabled={timeRemaining < (roomData?.mode === 'focus' ? 3000 : 1200)}
                                style={{
                                    marginTop: '15px',
                                    padding: '10px 20px',
                                    // Shift colors visually so the host knows it is locked
                                    background: timeRemaining < (roomData?.mode === 'focus' ? 3000 : 1200) ? '#666' : '#4CAF50',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: timeRemaining < (roomData?.mode === 'focus' ? 3000 : 1200) ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '15px'
                                }}
                            >
                                {timeRemaining < (roomData?.mode === 'focus' ? 3000:1200)
                                    ? "Study Session in Progress!"
                                    : "Start Global session Timer"
                                }
                                
                            </button>
                        )}
                    </div>

                    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {isFocusMode ? (
                            <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                                <h3 style={{ textAlign: 'center', color: '#444', marginBottom: '20px' }}>Session Micro-Goals</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {goals.map((goal, index) => (
                                        <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#fdfdfd', padding: '12px', borderRadius: '6px', border: '1px solid #eaeaea' }}>
                                            <input type="checkbox" checked={goal.completed} disabled={!isWorkPhase} onChange={() => toggleGoalCompletion(goal.id)} style={{ width: '20px', height: '20px', cursor: isWorkPhase ? 'pointer' : 'not-allowed' }} />
                                            <input type="text" placeholder={`Micro-Goal ${index + 1}`} value={goal.text} disabled={!isWorkPhase} onChange={(e) => handleGoalTextChange(goal.id, e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', textDecoration: goal.completed ? 'line-through' : 'none', color: goal.completed ? '#aaa' : '#333', backgroundColor: goal.completed ? '#f5f5f5' : '#fff' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <textarea value={scratchpadContent} onChange={(e) => setScratchpadContent(e.target.value)} disabled={!isWorkPhase} placeholder={isWorkPhase ? "// Copy-paste your algorithm logic here..." : "// Session finalized. Content is now public."} style={{ width: '100%', flex: 1, minHeight: '280px', padding: '15px', fontFamily: 'monospace', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: isWorkPhase ? '#fafafa' : '#fff', color: '#333', resize: 'none' }} />
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