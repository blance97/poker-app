// client/src/components/Lobby.jsx
import { useState, useEffect } from 'react';

export default function Lobby({ socket, player, onJoinGame }) {
    const [rooms, setRooms] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(6);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [cpuDifficulty, setCpuDifficulty] = useState('medium');

    useEffect(() => {
        // Fetch initial rooms
        socket.emit('room:list', null, () => { });
        fetch('http://localhost:3001/api/rooms')
            .then(r => r.json())
            .then(setRooms)
            .catch(() => { });

        const handleRoomsUpdated = (updatedRooms) => setRooms(updatedRooms);
        const handleRoomUpdated = (room) => {
            if (currentRoom && room.id === currentRoom.id) {
                setCurrentRoom(room);
            }
        };

        socket.on('rooms:updated', handleRoomsUpdated);
        socket.on('room:updated', handleRoomUpdated);

        return () => {
            socket.off('rooms:updated', handleRoomsUpdated);
            socket.off('room:updated', handleRoomUpdated);
        };
    }, [socket, currentRoom?.id]);

    const createRoom = () => {
        socket.emit('room:create', {
            name: roomName || `${player.name}'s Table`,
            options: { maxPlayers, gameType: 'poker' },
        }, (result) => {
            if (result.room) {
                setCurrentRoom(result.room);
                setShowCreate(false);
                setRoomName('');
                // Persist for session restore
                try {
                    const s = JSON.parse(sessionStorage.getItem('poker_session') || '{}');
                    s.roomId = result.room.id;
                    s.view = 'lobby';
                    sessionStorage.setItem('poker_session', JSON.stringify(s));
                } catch (e) { /* ignore */ }
            }
        });
    };

    const joinRoom = (roomId) => {
        socket.emit('room:join', roomId, (result) => {
            if (result.error) return;
            try {
                const s = JSON.parse(sessionStorage.getItem('poker_session') || '{}');
                s.roomId = result.room.id;
                sessionStorage.setItem('poker_session', JSON.stringify(s));
            } catch (e) { /* ignore */ }

            if (result.room.status === 'playing') {
                // Jump straight into the game
                onJoinGame(result.room.id);
            } else {
                setCurrentRoom(result.room);
            }
        });
    };

    const leaveRoom = () => {
        socket.emit('room:leave', () => {
            setCurrentRoom(null);
            try {
                const s = JSON.parse(sessionStorage.getItem('poker_session') || '{}');
                s.roomId = null;
                s.view = 'lobby';
                sessionStorage.setItem('poker_session', JSON.stringify(s));
            } catch (e) { /* ignore */ }
        });
    };

    const addCPU = () => {
        socket.emit('room:addCPU', { difficulty: cpuDifficulty }, (result) => {
            if (result.room) setCurrentRoom(result.room);
        });
    };

    const removeCPU = (cpuId) => {
        socket.emit('room:removeCPU', cpuId, (result) => {
            if (result.room) setCurrentRoom(result.room);
        });
    };

    const startGame = () => {
        socket.emit('game:start', (result) => {
            if (!result.error) {
                onJoinGame(currentRoom.id);
            }
        });
    };

    // If in a room's waiting area
    if (currentRoom) {
        const isHost = currentRoom.hostId === player.id;

        return (
            <div className="lobby">
                <div className="lobby__room-view">
                    <div className="lobby__room-header">
                        <h2>{currentRoom.name}</h2>
                        <span className="lobby__game-type">{currentRoom.gameType.toUpperCase()}</span>
                    </div>

                    <div className="lobby__players-list">
                        <h3>Players ({currentRoom.players.length}/{currentRoom.maxPlayers})</h3>
                        {currentRoom.players.map(p => (
                            <div key={p.id} className={`lobby__player-row ${p.id === player.id ? 'lobby__player-row--me' : ''}`}>
                                <span className="lobby__player-name">
                                    {p.isCPU ? '🤖 ' : '👤 '}{p.name}
                                    {p.id === currentRoom.hostId && <span className="lobby__host-badge">HOST</span>}
                                </span>
                                {p.isCPU && isHost && (
                                    <button className="lobby__remove-btn" onClick={() => removeCPU(p.id)}>✕</button>
                                )}
                            </div>
                        ))}
                    </div>

                    {isHost && (
                        <div className="lobby__cpu-controls">
                            <h3>Add CPU Opponent</h3>
                            <div className="lobby__cpu-row">
                                <select
                                    value={cpuDifficulty}
                                    onChange={e => setCpuDifficulty(e.target.value)}
                                    className="lobby__select"
                                >
                                    <option value="easy">🟢 Easy</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="hard">🔴 Hard</option>
                                </select>
                                <button
                                    className="lobby__btn lobby__btn--cpu"
                                    onClick={addCPU}
                                    disabled={currentRoom.players.length >= currentRoom.maxPlayers}
                                >
                                    + Add CPU
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="lobby__room-actions">
                        {isHost && (
                            <button
                                className="lobby__btn lobby__btn--start"
                                onClick={startGame}
                                disabled={currentRoom.players.length < 2}
                            >
                                🎮 Start Game
                            </button>
                        )}
                        <button className="lobby__btn lobby__btn--leave" onClick={leaveRoom}>
                            Leave Room
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main lobby view
    return (
        <div className="lobby">
            <div className="lobby__header">
                <h1>🃏 Game Lobby</h1>
                <p className="lobby__subtitle">Welcome, <strong>{player.name}</strong></p>
            </div>

            <div className="lobby__actions">
                <button className="lobby__btn lobby__btn--create" onClick={() => setShowCreate(!showCreate)}>
                    + Create Room
                </button>
            </div>

            {showCreate && (
                <div className="lobby__create-form">
                    <input
                        type="text"
                        placeholder="Room name..."
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        className="lobby__input"
                    />
                    <div className="lobby__form-row">
                        <label>Max Players:</label>
                        <select value={maxPlayers} onChange={e => setMaxPlayers(parseInt(e.target.value))} className="lobby__select">
                            {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <button className="lobby__btn lobby__btn--confirm" onClick={createRoom}>
                        Create Room
                    </button>
                </div>
            )}

            <div className="lobby__rooms">
                <h2>Available Rooms</h2>
                {rooms.length === 0 ? (
                    <div className="lobby__empty">
                        <p>No rooms yet. Create one to get started!</p>
                    </div>
                ) : (
                    <div className="lobby__room-list">
                        {rooms.map(room => (
                            <div key={room.id} className="lobby__room-card">
                                <div className="lobby__room-info">
                                    <h3>{room.name}</h3>
                                    <span className="lobby__room-meta">
                                        {room.gameType.toUpperCase()} • {room.playerCount}/{room.maxPlayers} players
                                    </span>
                                    <span className={`lobby__room-status lobby__room-status--${room.status}`}>
                                        {room.status === 'waiting' ? '⏳ Waiting' : room.status === 'playing' ? '🎮 In Progress' : '✅ Finished'}
                                    </span>
                                </div>
                                <button
                                    className="lobby__btn lobby__btn--join"
                                    onClick={() => joinRoom(room.id)}
                                    disabled={room.status === 'finished' || room.playerCount >= room.maxPlayers}
                                >
                                    {room.status === 'playing' ? 'Join Game' : 'Join'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
