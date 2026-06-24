import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

// Single shared socket instance created at module level
// This prevents a new socket connection from spawning on every re-render
const socket = io('http://localhost:5000');

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

            const response = await fetch(`http://localhost:5000/api/rooms/${roomCode}`, {
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', padding: '20px' }}>

            {/* Error banner: only renders if the REST fetch returned a failure */}
            {errorMessage && (
                <div style={{ padding: '12px', backgroundColor: '#fff0f0', borderLeft: '5px solid #ff4d4d', borderRadius: '4px', color: '#c33', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
                    {errorMessage}
                </div>
            )}

            {/* Inline notification banner: replaces alert() for phase transition messages */}
            {notification && (
                <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderLeft: '5px solid #4CAF50', borderRadius: '4px', color: '#166534', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
                    {notification}
                </div>
            )}

            {/* HEADER: room name, mode badge, room code display, and leave button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#222', color: '#fff', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px' }}>{roomData?.name}</h2>
                    <span style={{ fontSize: '13px', color: '#aaa' }}>
                        {isCurrentUserHost ? "(You are the Host)" : "(You are a Guest)"}
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

            {/* CORE VIEWPORT: sidebar on the left, main workspace on the right */}
            <div style={{ display: 'flex', gap: '20px', minHeight: '500px' }}>

                {/* LEFT SIDEBAR: participant list with live goal badges in Focus mode */}
                <div style={{ width: '280px', backgroundColor: '#fff', border: '1px solid #eef', borderRadius: '8px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h4 style={{ marginTop: 0, borderBottom: '2px solid #f4f4f4', paddingBottom: '10px', color: '#555' }}>
                            Online Students ({participantsList.length})
                        </h4>
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                            {participantsList.map((user) => {
                                const evalUserId = user._id || user;
                                const isUserHost = String(evalUserId) === String(roomData?.hostRawId);

                                // Look up this participant's live goal count from the broadcast map
                                // undefined means they have not ticked anything yet, so no badge renders
                                const currentScore = participantGoalMap[evalUserId];

                                return (
                                    <li key={evalUserId} style={{
                                        padding: '8px 12px',
                                        backgroundColor: isUserHost ? '#e8f5e9' : '#f8f9fa',
                                        borderLeft: isUserHost ? '4px solid #4CAF50' : '4px solid #008CBA',
                                        borderRadius: '4px',
                                        marginBottom: '8px',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        color: '#333'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>
                                                {user.username || "Student"}
                                                {isUserHost && <span style={{ fontSize: '11px', color: '#28a745', marginLeft: '5px' }}>(Host)</span>}
                                            </span>

                                            {/* Goal badge: only shows in Focus mode and only once the user has ticked at least one goal */}
                                            {isFocusMode && currentScore !== undefined && (
                                                <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '10px' }}>
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

                {/* RIGHT WORKSPACE: timer, host controls, and mode-specific content */}
                <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #eef', borderRadius: '8px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                    {/* Master clock display: red during break to signal discussion time */}
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '72px', margin: 0, fontFamily: 'monospace', color: isWorkPhase ? '#333' : '#ff5722' }}>
                            {formatTimer(timeRemaining)}
                        </h1>
                        <p style={{ color: '#888', margin: '5px 0 0 0', fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            {isWorkPhase ? "Session Active - Focus Interval Locked" : "Break Active - Collaboration Open"}
                        </p>

                        {/* Host-only start button: only visible when phase is work and timer is at full duration (idle state) */}
                        {isCurrentUserHost && isWorkPhase && (
                            <button
                                onClick={handleStartMasterTimer}
                                disabled={timeRemaining < (roomData?.mode === 'focus' ? 3000 : 1200)}
                                style={{
                                    marginTop: '15px',
                                    padding: '10px 20px',
                                    background: timeRemaining < (roomData?.mode === 'focus' ? 3000 : 1200) ? '#666' : '#4CAF50',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: timeRemaining < (roomData?.mode === 'focus' ? 3000 : 1200) ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '15px'
                                }}
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
                            // FOCUS MODE: three micro-goal inputs with checkboxes
                            // Inputs and checkboxes lock during break phase so goals cannot be edited retroactively
                            <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                                <h3 style={{ textAlign: 'center', color: '#444', marginBottom: '20px' }}>Session Micro-Goals</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {goals.map((goal, index) => (
                                        <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#fdfdfd', padding: '12px', borderRadius: '6px', border: '1px solid #eaeaea' }}>
                                            <input
                                                type="checkbox"
                                                checked={goal.completed}
                                                disabled={!isWorkPhase}
                                                onChange={() => toggleGoalCompletion(goal.id)}
                                                style={{ width: '20px', height: '20px', cursor: isWorkPhase ? 'pointer' : 'not-allowed' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder={`Micro-Goal ${index + 1}`}
                                                value={goal.text}
                                                disabled={!isWorkPhase}
                                                onChange={(e) => handleGoalTextChange(goal.id, e.target.value)}
                                                style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', textDecoration: goal.completed ? 'line-through' : 'none', color: goal.completed ? '#aaa' : '#333', backgroundColor: goal.completed ? '#f5f5f5' : '#fff' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // ARENA MODE: private scratchpad during work, revealed submissions during break
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>

                                {/* Problem link panel: renders only if the host provided a URL or problem name when creating the room */}
                                {roomData?.customInput && (
                                    <div style={{
                                        width: '100%',
                                        backgroundColor: '#f0f9ff',
                                        border: '1px solid #bae6fd',
                                        borderRadius: '6px',
                                        padding: '12px 15px',
                                        marginBottom: '15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        boxSizing: 'border-box'
                                    }}>
                                        <span style={{ fontSize: '14px', color: '#0369a1', fontWeight: 'bold' }}>
                                            Target Challenge:
                                        </span>
                                        {roomData.customInput.startsWith('http') ? (
                                            <a
                                                href={roomData.customInput}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '14px', color: '#0284c7', textDecoration: 'underline', fontWeight: 'bold', wordBreak: 'break-all' }}
                                            >
                                                {roomData.customInput}
                                            </a>
                                        ) : (
                                            <span style={{ fontSize: '14px', color: '#334155', fontWeight: 'bold' }}>
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
                                        style={{ width: '100%', minHeight: '200px', padding: '15px', fontFamily: 'monospace', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: isWorkPhase ? '#fafafa' : '#eee', color: '#333', resize: 'none' }}
                                    />
                                </div>

                                {/* Reveal panel: mounts during break phase and populates as broadcast events arrive */}
                                {!isWorkPhase && revealedScratchpads.length > 0 && (
                                    <div style={{ marginTop: '30px', width: '100%' }}>
                                        <h3 style={{ borderBottom: '2px solid #008CBA', paddingBottom: '10px', color: '#008CBA' }}>Revealed Arena Submissions</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
                                            {revealedScratchpads.map((submission) => (
                                                <div key={submission.userId} style={{ background: '#f4f7f6', borderLeft: '5px solid #008CBA', borderRadius: '4px', padding: '15px' }}>
                                                    <strong style={{ color: '#333', display: 'block', marginBottom: '8px' }}>{submission.username}</strong>
                                                    <pre style={{ margin: 0, background: '#222', color: '#fff', padding: '12px', borderRadius: '4px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                                        {submission.content || "// Left blank"}
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DISCUSSION LOUNGE: mounts automatically when break phase begins
                            Contains the prompt injector and the live chat relay */}
                        {!isWorkPhase && (
                            <div style={{ marginTop: '40px', width: '100%', borderTop: '2px dashed #ddd', paddingTop: '20px' }}>

                                {/* Prompt injector: pulls from the static array based on mode */}
                                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
                                    <strong style={{ color: '#166534', display: 'block', marginBottom: '4px' }}>Lounge Prompt</strong>
                                    <p style={{ margin: 0, color: '#1e293b', fontStyle: 'italic', fontSize: '14px' }}>
                                        {roomData?.mode === 'arena' ? breakPrompts[2] : breakPrompts[Math.floor(Date.now() / 10000) % 2]}
                                    </p>
                                </div>

                                {/* Live chat box: messages accumulate in state */}
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                    <div style={{ background: '#f8fafc', padding: '10px 15px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#475569' }}>
                                        Break Discussion Lounge
                                    </div>

                                    <div style={{ height: '180px', overflowY: 'auto', padding: '15px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {loungeMessages.length === 0 ? (
                                            <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', marginTop: '60px' }}>
                                                Lounge is quiet. Answer the prompt above to get things started.
                                            </div>
                                        ) : (
                                            loungeMessages.map((msg) => (
                                                <div key={msg.id} style={{ fontSize: '14px' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{msg.username}: </span>
                                                    <span style={{ color: '#334155' }}>{msg.text}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Chat input: submit on button click or Enter key via form onSubmit */}
                                    <form onSubmit={handleSendChatMessage} style={{ display: 'flex', borderTop: '1px solid #e2e8f0' }}>
                                        <input
                                            type="text"
                                            value={typedMessage}
                                            onChange={(e) => setTypedMessage(e.target.value)}
                                            placeholder="Type your reflection and press Enter..."
                                            style={{ flex: 1, padding: '12px', border: 'none', outline: 'none', fontSize: '14px' }}
                                        />
                                        <button type="submit" style={{ background: '#0f172a', color: '#fff', padding: '0 20px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
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