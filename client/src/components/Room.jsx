import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

// Single shared socket instance created at module level
// This prevents a new socket connection from spawning on every re-render
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

function Room() {
    const { roomCode } = useParams();
    const navigate = useNavigate();

    // Core room data fetched from the REST endpoint on mount
    const [roomData, setRoomData] = useState(null);

    // Live list of participant objects fetched fresh after join/leave events
    const [participantsList, setParticipantsList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // Identity of the currently logged-in user, parsed from localStorage on mount
    const [currentUserId, setCurrentUserId] = useState('');
    const [currentUsername, setCurrentUsername] = useState('Anonymous Student');

    // Collected scratchpad submissions from all Arena mode participants during reveal phase
    const [revealedScratchpads, setRevealedScratchpads] = useState([]);

    // Map of userId -> completedGoalCount, updated live as participants tick off goals
    // Using a map instead of an array makes O(1) lookups in the sidebar render
    const [participantGoalMap, setParticipantGoalMap] = useState({});

    // Break-time chat messages, accumulated in order of arrival
    const [loungeMessages, setLoungeMessages] = useState([]);
    const [typedMessage, setTypedMessage] = useState('');

    // Phase and time state that mirror the server's master timer
    // These are the only values used to drive the UI clock display
    const [timeRemaining, setTimeRemaining] = useState(3000);
    const [currentPhase, setCurrentPhase] = useState('work');

    // Inline notification banner state used instead of alert() to avoid blocking the thread
    // Clears automatically after 4 seconds via a timeout set in the phase-change effect
    const [notification, setNotification] = useState('');

    // Focus mode: three editable, checkable micro-goals per session
    const [goals, setGoals] = useState([
        { id: 1, text: '', completed: false },
        { id: 2, text: '', completed: false },
        { id: 3, text: '', completed: false }
    ]);

    // Arena mode: private scratchpad text, isolated from other participants during work phase
    const [scratchpadContent, setScratchpadContent] = useState('');

    // Ref that mirrors scratchpadContent so the phase-change effect can read the
    // latest value without being stale due to closure capture
    const scratchpadContentRef = useRef('');
    useEffect(() => {
        scratchpadContentRef.current = scratchpadContent;
    }, [scratchpadContent]);

    // Ref that mirrors roomData.mode so the session_ended socket listener can read it
    // without being stale inside the closure created when the listener was registered
    // This is the same pattern used for scratchpadContentRef above
    const roomModeRef = useRef(null);

    // Fetch the full participant list from the REST API
    // Called after join and leave socket broadcasts to keep the sidebar accurate
    const refreshParticipants = async () => {
        try {
            const token = localStorage.getItem('studyArenaToken');
            const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`, {
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

    // Loads all initial room state from the REST endpoint and kicks off the socket join handshake
    // Runs once on mount via the [] dependency array in the main useEffect below
    const fetchRoomState = async () => {
        try {
            setErrorMessage('');
            const token = localStorage.getItem('studyArenaToken');

            if (!token) {
                setErrorMessage('Authentication missing. Please login.');
                setLoading(false);
                return;
            }

            // Read cached user identity written to localStorage by the login flow
            const cachedUser = localStorage.getItem('studyArenaUser');
            let parsedUid = '';
            if (cachedUser) {
                const parsed = JSON.parse(cachedUser);
                parsedUid = parsed.id || parsed._id || '';
                setCurrentUserId(parsedUid);
                if (parsed.username) setCurrentUsername(parsed.username);
            }

            const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                const roomInfo = {
                    name: data.name,
                    mode: data.mode,
                    host: data.hostId?.username || "Host",
                    hostRawId: data.hostId?._id || data.hostId || "",
                    customInput: data.customInput,
                    difficulty: data.difficulty
                };

                setRoomData(roomInfo);

                // Keep the ref in sync so socket listeners can read the mode without stale closures
                roomModeRef.current = data.mode;

                setParticipantsList(data.participants || []);
                setCurrentPhase(data.phase || 'work');

                // Set the initial displayed time based on which phase the room is currently in
                // This matters when joining a room that is already mid-session
                if (data.phase === 'break') {
                    setTimeRemaining(data.mode === 'focus' ? 600 : 300);
                } else {
                    setTimeRemaining(data.mode === 'focus' ? 3000 : 1200);
                }

                // Emit the join event only after we have a confirmed userId so the server
                // can add the user to the DB participants array in the join_room handler
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

    // Fires whenever the server transitions the room between work and break phases
    // Handles scratchpad submission for Arena mode and goal broadcast for Focus mode
    // roomData and goals are in the dependency array to prevent stale closure reads
    useEffect(() => {
        if (!roomData) return;

        if (currentPhase === 'break') {
            if (roomData.mode === 'arena') {
                // Read from the ref pointer rather than state to guarantee the latest value
                // even if React has not yet re-rendered since the last keystroke
                socket.emit('submit_scratchpad', {
                    roomCode: roomCode.toUpperCase(),
                    userId: currentUserId,
                    username: currentUsername,
                    content: scratchpadContentRef.current
                });

                // Show an inline notification instead of a blocking alert
                setNotification("Arena sprint complete! Scratchpads are now revealed.");
                setTimeout(() => setNotification(''), 4000);

            } else if (roomData.mode === 'focus') {
                const completedCount = goals.filter(g => g.completed).length;

                socket.emit('share_goal_progress', {
                    roomCode: roomCode.toUpperCase(),
                    userId: currentUserId,
                    completedCount: completedCount
                });

                setNotification("Focus session complete! Break time has begun.");
                setTimeout(() => setNotification(''), 4000);
            }
        } else if (currentPhase === 'work') {
            // New work sprint starting: flush the previous session's reveal data and chat
            setRevealedScratchpads([]);
            setLoungeMessages([]);
        }
    }, [currentPhase, roomData, goals]);

    // Main lifecycle effect: fetches room state on mount and registers all socket listeners
    // Returns a cleanup function that removes listeners and emits a clean leave on unmount
    useEffect(() => {
        fetchRoomState();

        // Server tick: update the displayed clock every second
        socket.on('timer_update', (timerPayload) => {
            setTimeRemaining(timerPayload.timeRemaining);
            setCurrentPhase(timerPayload.currentPhase);
        });

        // Server phase flip: jump the clock to the new phase duration immediately
        socket.on('phase_changed', (phasePayload) => {
            setCurrentPhase(phasePayload.currentPhase);
            setTimeRemaining(phasePayload.timeRemaining);
        });

        // Someone joined: re-fetch participants so the sidebar shows their name and badge
        socket.on('user_joined_broadcast', (broadcastPayload) => {
            refreshParticipants();
        });

        // Someone left: re-fetch participants and room data in case host changed
        socket.on('user_left_broadcast', (broadcastPayload) => {
            refreshParticipants();
            fetchRoomState();
        });

        // Arena reveal: accumulate each participant's scratchpad as submissions arrive
        // Deduplication by userId prevents double-entries if the event fires more than once
        socket.on('scratchpad_revealed_broadcast', (data) => {
            setRevealedScratchpads(prev => {
                const filtered = prev.filter(item => item.userId !== data.userId);
                return [...filtered, data];
            });
        });

        // Focus mode: update a participant's goal badge whenever they tick a checkbox
        // This fires continuously during the work phase, not just at phase end
        socket.on('goal_progress_broadcast', (data) => {
            setParticipantGoalMap(prev => ({
                ...prev,
                [data.userId]: data.completedCount
            }));
        });

        // Break chat: append each incoming message to the local display list
        socket.on('receive_lounge_message', (data) => {
            setLoungeMessages(prev => [...prev, data]);
        });

        // Break ended: server stopped the interval and is waiting for host to restart
        // Reset the UI back to idle work-phase state so the host's start button reappears
        // roomModeRef is used here instead of roomData because roomData is stale inside
        // this closure — the listener was registered when roomData was still null on mount
        socket.on('session_ended', () => {
            setCurrentPhase('work');
            setTimeRemaining(roomModeRef.current === 'focus' ? 3000 : 1200);
            setScratchpadContent('');
            setGoals([
                { id: 1, text: '', completed: false },
                { id: 2, text: '', completed: false },
                { id: 3, text: '', completed: false }
            ]);
            setNotification("Break over. Host will start the next session when the room is ready.");
            setTimeout(() => setNotification(''), 5000);
        });

        // Cleanup: emit a clean leave and remove all listeners when the component unmounts
        // Prevents memory leaks and duplicate listener registration on hot reloads
        return () => {
            const cachedUser = localStorage.getItem('studyArenaUser');
            if (cachedUser) {
                const parsed = JSON.parse(cachedUser);
                const uid = parsed.id || parsed._id || '';
                socket.emit('leave_room', { roomCode: roomCode.toUpperCase(), userId: uid });
            }

            socket.off('timer_update');
            socket.off('phase_changed');
            socket.off('user_joined_broadcast');
            socket.off('user_left_broadcast');
            socket.off('scratchpad_revealed_broadcast');
            socket.off('goal_progress_broadcast');
            socket.off('receive_lounge_message');
            socket.off('session_ended');
        };
    }, [roomCode]);

    // Emits the start event to the server which kicks off the master interval
    // Only the host sees this button; the lockdown guard in server.js prevents double-starts
    const handleStartMasterTimer = () => {
        if (!roomData) return;
        const totalSeconds = roomData.mode === 'focus' ? 3000 : 1200;

        socket.emit('start_session', {
            roomCode: roomCode.toUpperCase(),
            duration: totalSeconds,
            mode: roomData.mode
        });
    };

    // Sends a chat message to the server which relays it to all room members
    const handleSendChatMessage = (e) => {
        e.preventDefault();
        if (!typedMessage.trim()) return;

        socket.emit('send_lounge_message', {
            roomCode: roomCode.toUpperCase(),
            username: currentUsername,
            text: typedMessage.trim()
        });
        setTypedMessage('');
    };

    // Converts raw seconds into MM:SS display format for the main clock
    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Updates the text of a single goal without touching the other two
    const handleGoalTextChange = (id, text) => {
        setGoals(goals.map(g => g.id === id ? { ...g, text } : g));
    };

    // Flips the completed state of a goal and immediately broadcasts the new count
    // to all room members so their sidebar badges update in real time
    const toggleGoalCompletion = (id) => {
        const updatedGoals = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
        setGoals(updatedGoals);

        const completedCount = updatedGoals.filter(g => g.completed).length;

        // Update your own badge locally so it reflects immediately without waiting
        // for the broadcast to loop back through the server to yourself
        setParticipantGoalMap(prev => ({
            ...prev,
            [currentUserId]: completedCount
        }));

        // Broadcast the new count to all other participants in the room
        socket.emit('share_goal_progress', {
            roomCode: roomCode.toUpperCase(),
            userId: currentUserId,
            completedCount: completedCount
        });
    };

    // Discussion prompt pool
    // Arena always shows the complexity comparison prompt
    // Focus alternates between the two reflection prompts each session
    const breakPrompts = [
        "What did you get stuck on during this interval?",
        "What is one valuable thing you learned this session?",
        "Who used a better approach or lower time complexity?"
    ];

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
        <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-sans)', padding: 'var(--space-5)' }}>

            {/* Error banner */}
            {errorMessage && (
                <div className="sa-banner sa-banner-error" style={{ marginBottom: 'var(--space-5)' }}>
                    {errorMessage}
                </div>
            )}

            {/* Inline notification banner */}
            {notification && (
                <div className="sa-banner sa-banner-success" style={{ marginBottom: 'var(--space-5)' }}>
                    {notification}
                </div>
            )}

            {/* HEADER */}
            <div className="sa-room-header">
                <div>
                    <h2 className="sa-room-title">{roomData?.name}</h2>
                    <span className="sa-room-subtitle">
                        {isCurrentUserHost ? "You are the Host" : "You are a Guest"}
                    </span>
                </div>
                <div className="sa-room-header-right">
                    <span className={`sa-badge ${isFocusMode ? 'sa-badge-focus' : 'sa-badge-arena'}`}>
                        {roomData?.mode} ({currentPhase} phase)
                    </span>
                    <div className="sa-room-code">
                        CODE: <span>{roomCode}</span>
                    </div>
                    <button onClick={() => navigate('/lobby')} className="sa-btn sa-btn-danger">
                        Leave
                    </button>
                </div>
            </div>

            {/* CORE VIEWPORT */}
            <div style={{ display: 'flex', gap: 'var(--space-5)', minHeight: '500px' }}>

                {/* LEFT SIDEBAR */}
                <div className="sa-surface" style={{ width: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h4 className="sa-font-medium" style={{ marginTop: 0, borderBottom: '2px solid var(--border-subtle)', paddingBottom: 'var(--space-3)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                            Online Students ({participantsList.length})
                        </h4>
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {participantsList.map((user) => {
                                const evalUserId = user._id || user;
                                const isUserHost = String(evalUserId) === String(roomData?.hostRawId);
                                const currentScore = participantGoalMap[evalUserId];

                                return (
                                    <li key={evalUserId} className={`sa-participant ${isUserHost ? 'sa-participant-host' : ''}`}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <span>
                                                {user.username || "Student"}
                                                {isUserHost && <span className="sa-participant-host-label">(Host)</span>}
                                            </span>

                                            {isFocusMode && currentScore !== undefined && (
                                                <span className="sa-badge-goal">
                                                    {currentScore}/3
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                {/* RIGHT WORKSPACE */}
                <div className="sa-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                    {/* Master clock display */}
                    <div style={{ marginBottom: 'var(--space-5)', textAlign: 'center' }}>
                        <h1 className={`sa-timer ${!isWorkPhase ? 'sa-timer-break' : ''}`}>
                            {formatTimer(timeRemaining)}
                        </h1>
                        <p className="sa-phase-label">
                            {isWorkPhase ? "Session Active - Focus Interval Locked" : "Break Active - Collaboration Open"}
                        </p>

                        {/* Host-only start button */}
                        {isCurrentUserHost && isWorkPhase && (
                            <button
                                onClick={handleStartMasterTimer}
                                disabled={timeRemaining < (roomData?.mode === 'focus' ? 3000 : 1200)}
                                className="sa-btn sa-btn-primary"
                                style={{ marginTop: 'var(--space-4)' }}
                            >
                                {timeRemaining < (roomData?.mode === 'focus' ? 3000 : 1200)
                                    ? "Session in Progress..."
                                    : "Start Session"
                                }
                            </button>
                        )}
                    </div>

                    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {isFocusMode ? (
                            /* FOCUS MODE */
                            <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                                <h3 style={{ textAlign: 'center', color: 'var(--text-primary)', marginBottom: 'var(--space-5)' }}>
                                    Session Micro-Goals
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                    {goals.map((goal, index) => (
                                        <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                                            <input
                                                type="checkbox"
                                                checked={goal.completed}
                                                disabled={!isWorkPhase}
                                                onChange={() => toggleGoalCompletion(goal.id)}
                                                style={{
                                                    cursor: isWorkPhase ? 'pointer' : 'not-allowed',
                                                    width: '20px',
                                                    height: '20px',
                                                    flexShrink: 0
                                                }}
                                            />
                                            <input
                                                type="text"
                                                placeholder={`Micro-Goal ${index + 1}`}
                                                value={goal.text}
                                                disabled={!isWorkPhase}
                                                onChange={(e) => handleGoalTextChange(goal.id, e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    textDecoration: goal.completed ? 'line-through' : 'none',
                                                    color: goal.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                                    backgroundColor: goal.completed ? 'var(--bg-muted)' : 'var(--bg-raised)'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* ARENA MODE */
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                {roomData?.customInput && (
                                    <div className="sa-challenge-panel">
                                        <span className="sa-challenge-label">
                                            Target Challenge:
                                        </span>
                                        {roomData.customInput.startsWith('http') ? (
                                            <a
                                                href={roomData.customInput}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="sa-challenge-link"
                                            >
                                                {roomData.customInput}
                                            </a>
                                        ) : (
                                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)' }}>
                                                {roomData.customInput}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <textarea
                                        value={scratchpadContent}
                                        onChange={(e) => setScratchpadContent(e.target.value)}
                                        disabled={!isWorkPhase}
                                        placeholder={isWorkPhase ? "// Write your approach or paste your logic here..." : "// Session finalized. Scroll down to see everyone's work!"}
                                        className="sa-scratchpad"
                                        style={{
                                            backgroundColor: isWorkPhase ? 'var(--bg-raised)' : 'var(--bg-muted)',
                                        }}
                                    />
                                </div>

                                {/* Reveal panel */}
                                {!isWorkPhase && revealedScratchpads.length > 0 && (
                                    <div style={{ marginTop: 'var(--space-10)', width: '100%' }}>
                                        <h3 style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 'var(--space-3)', color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
                                            Revealed Arena Submissions
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                            {revealedScratchpads.map((submission) => (
                                                <div key={submission.userId} className="sa-submission-card">
                                                    <strong className="sa-submission-author">{submission.username}</strong>
                                                    <pre style={{ margin: 0, background: 'var(--ctp-text)', color: '#cdd6f4', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                                        {submission.content || "// Left blank"}
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DISCUSSION LOUNGE */}
                        {!isWorkPhase && (
                            <div style={{ marginTop: 'var(--space-12)', width: '100%', borderTop: '2px dashed var(--border-medium)', paddingTop: 'var(--space-5)' }}>

                                {/* Prompt */}
                                <div className="sa-prompt-box">
                                    <strong className="sa-prompt-label">Lounge Prompt</strong>
                                    <p className="sa-prompt-text">
                                        {roomData?.mode === 'arena' ? breakPrompts[2] : breakPrompts[Math.floor(Date.now() / 10000) % 2]}
                                    </p>
                                </div>

                                {/* Chat */}
                                <div className="sa-chat-box">
                                    <div className="sa-chat-header">
                                        Break Discussion Lounge
                                    </div>

                                    <div className="sa-chat-messages">
                                        {loungeMessages.length === 0 ? (
                                            <div className="sa-chat-empty">
                                                Lounge is quiet. Answer the prompt above to get things started.
                                            </div>
                                        ) : (
                                            loungeMessages.map((msg) => (
                                                <div key={msg.id} className="sa-chat-message">
                                                    <span className="sa-chat-username">{msg.username}: </span>
                                                    <span className="sa-chat-text">{msg.text}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <form onSubmit={handleSendChatMessage} className="sa-chat-form">
                                        <input
                                            type="text"
                                            value={typedMessage}
                                            onChange={(e) => setTypedMessage(e.target.value)}
                                            placeholder="Type your reflection and press Enter..."
                                            className="sa-chat-input"
                                        />
                                        <button type="submit" className="sa-chat-send">
                                            Send
                                        </button>
                                    </form>
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