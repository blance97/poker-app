// client/src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';
import { loadProfile } from './utils/profileUtils';

const SESSION_KEY = 'poker_session';

function saveSession(data) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
}

function loadSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

export default function App() {
    const { socket, connected, player, setName, reconnect } = useSocket();
    const [view, setView] = useState('login'); // login | lobby | game
    const [playerName, setPlayerName] = useState('');
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [reconnecting, setReconnecting] = useState(false);

    // On mount + connected, try to restore session
    useEffect(() => {
        if (!socket || !connected) return;

        const session = loadSession();
        if (session && session.name && !player) {
            setReconnecting(true);
            const p = loadProfile();
            const avatar = p.avatar || 'default';
            const winAnimation = p.winAnimation || 'confetti';
            reconnect(session.name, session.roomId, avatar, winAnimation).then((result) => {
                setReconnecting(false);
                if (result && result.view) {
                    setCurrentRoomId(result.roomId || null);
                    setView(result.view);
                } else {
                    // Fallback: session info was stale, go to lobby
                    setName(session.name, session.avatar || 'default', session.winAnimation || 'confetti').then(() => {
                        setView('lobby');
                    });
                }
            }).catch(() => {
                setReconnecting(false);
                clearSession();
            });
        }
    }, [socket, connected]);

    useEffect(() => {
        if (!socket) return;

        socket.on('game:stateUpdate', (state) => {
            if (state && view === 'lobby') {
                setView('game');
            }
        });

        return () => {
            socket.off('game:stateUpdate');
        };
    }, [socket, view]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (playerName.trim()) {
            const p = loadProfile();
            await setName(playerName.trim(), p.avatar || 'default', p.winAnimation || 'confetti');
            saveSession({ name: playerName.trim(), roomId: null, view: 'lobby' });
            setView('lobby');
        }
    };

    const handleJoinGame = (roomId) => {
        setCurrentRoomId(roomId);
        saveSession({ name: player?.name, roomId, view: 'game' });
        setView('game');
    };

    const handleLeaveGame = () => {
        setCurrentRoomId(null);
        saveSession({ name: player?.name, roomId: null, view: 'lobby' });
        setView('lobby');
    };

    // Update session when room changes
    useEffect(() => {
        if (player && currentRoomId) {
            saveSession({ name: player.name, roomId: currentRoomId, view });
        }
    }, [player, currentRoomId, view]);

    // Reconnecting screen
    if (reconnecting) {
        return (
            <div className="app">
                <div className="login">
                    <div className="login__card">
                        <div className="login__logo">
                            <span className="login__icon">🃏</span>
                            <h1>Card Room</h1>
                            <p className="login__tagline">Reconnecting...</p>
                        </div>
                        <div className="login__status login__status--connected">
                            ⏳ Restoring your session...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Login screen
    if (view === 'login' || !player) {
        return (
            <div className="app">
                <div className="login">
                    <div className="login__card">
                        <div className="login__logo">
                            <span className="login__icon">🃏</span>
                            <h1>Card Room</h1>
                            <p className="login__tagline">Play poker with friends or practice against CPU</p>
                        </div>
                        <form onSubmit={handleLogin} className="login__form">
                            <input
                                type="text"
                                placeholder="Enter your name..."
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                                className="login__input"
                                maxLength={20}
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="login__btn"
                                disabled={!connected || !playerName.trim()}
                            >
                                {connected ? 'Enter Lobby →' : 'Connecting...'}
                            </button>
                        </form>
                        <div className={`login__status ${connected ? 'login__status--connected' : ''}`}>
                            {connected ? '🟢 Connected to server' : '🔴 Connecting...'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            {view === 'lobby' && (
                <Lobby socket={socket} player={player} onJoinGame={handleJoinGame} />
            )}
            {view === 'game' && (
                <GameTable
                    socket={socket}
                    player={player}
                    roomId={currentRoomId}
                    onLeave={handleLeaveGame}
                />
            )}
        </div>
    );
}
