// client/src/components/GameTable.jsx
import { useState, useEffect, useCallback } from 'react';
import PlayerSeat from './PlayerSeat';
import ActionBar from './ActionBar';
import CheatSheet from './CheatSheet';
import ChatBox from './ChatBox';
import Card from './Card';
import { formatChips } from '../utils/cardUtils';

// Seat positions for up to 8 players around an oval table
const SEAT_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7];

export default function GameTable({ socket, player, roomId, onLeave }) {
    const [gameState, setGameState] = useState(null);
    const [messages, setMessages] = useState([]);
    const [actionLog, setActionLog] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [handicapMode, setHandicapMode] = useState(false);

    useEffect(() => {
        const handleStateUpdate = (state) => {
            setGameState(state);
            if (state?.phase === 'showdown') {
                setShowResults(true);
            }
        };

        const handleAction = (data) => {
            setActionLog(prev => [...prev.slice(-20), {
                ...data,
                timestamp: Date.now(),
            }]);
        };

        const handleChat = (msg) => {
            setMessages(prev => [...prev, msg]);
        };

        const handleRoundOver = () => {
            setShowResults(true);
        };

        socket.on('game:stateUpdate', handleStateUpdate);
        socket.on('game:actionTaken', handleAction);
        socket.on('chat:message', handleChat);
        socket.on('game:roundOver', handleRoundOver);

        // Request initial state
        socket.emit('game:getState', (result) => {
            if (result.state) setGameState(result.state);
        });

        return () => {
            socket.off('game:stateUpdate', handleStateUpdate);
            socket.off('game:actionTaken', handleAction);
            socket.off('chat:message', handleChat);
            socket.off('game:roundOver', handleRoundOver);
        };
    }, [socket]);

    const handleAction = useCallback((action) => {
        socket.emit('game:action', action, (result) => {
            if (result.error) {
                console.error('Action error:', result.error);
            }
        });
    }, [socket]);

    const handleNewHand = useCallback(() => {
        setShowResults(false);
        setActionLog([]);
        socket.emit('game:newHand', (result) => {
            if (result.error) {
                console.error('New hand error:', result.error);
            }
        });
    }, [socket]);

    const handleSendChat = useCallback((text) => {
        socket.emit('chat:message', text);
    }, [socket]);

    const handleLeave = useCallback(() => {
        socket.emit('room:leave', () => {
            onLeave();
        });
    }, [socket, onLeave]);

    if (!gameState) {
        return (
            <div className="game-table">
                <div className="game-table__loading">
                    <div className="spinner"></div>
                    <p>Loading game...</p>
                </div>
            </div>
        );
    }

    // Arrange players with current player at the bottom
    const myIndex = gameState.players.findIndex(p => p.id === player.id);
    const arrangedPlayers = [];
    for (let i = 0; i < 8; i++) {
        const playerIndex = (myIndex + i) % gameState.players.length;
        if (i < gameState.players.length) {
            arrangedPlayers.push(gameState.players[playerIndex]);
        } else {
            arrangedPlayers.push(null);
        }
    }

    const phaseName = {
        preflop: 'Pre-Flop',
        flop: 'Flop',
        turn: 'Turn',
        river: 'River',
        showdown: 'Showdown',
    }[gameState.phase] || gameState.phase;

    return (
        <div className="game-table">
            {/* Top bar */}
            <div className="game-table__topbar">
                <button className="game-table__leave-btn" onClick={handleLeave}>← Leave Table</button>
                <div className="game-table__info">
                    <span className="game-table__phase">{phaseName}</span>
                    <span className="game-table__hand">Hand #{gameState.handNumber}</span>
                </div>
                <div className="game-table__my-chips">
                    💰 {gameState.myState ? formatChips(gameState.myState.chips) : 0}
                </div>
            </div>

            {/* Main table area */}
            <div className="game-table__felt">
                {/* Player seats */}
                {arrangedPlayers.map((p, i) => (
                    <PlayerSeat
                        key={i}
                        player={p}
                        isMe={p && p.id === player.id}
                        position={i}
                    />
                ))}

                {/* Center: community cards + pot */}
                <div className="game-table__center">
                    <div className="game-table__pot">
                        <span className="game-table__pot-label">POT</span>
                        <span className="game-table__pot-amount">{formatChips(gameState.pot)}</span>
                    </div>
                    <div className="game-table__community">
                        {gameState.communityCards.map((card, i) => (
                            <Card key={i} card={card} />
                        ))}
                        {/* Empty placeholders for remaining community cards */}
                        {Array.from({ length: 5 - gameState.communityCards.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="card card--placeholder"></div>
                        ))}
                    </div>
                </div>

                {/* Winner announcement */}
                {showResults && gameState.winners && (
                    <div className="game-table__results">
                        <div className="game-table__results-card">
                            <h3>🏆 {gameState.winners.length > 1 ? 'Split Pot!' : 'Winner!'}</h3>
                            {gameState.winners.map((w, i) => (
                                <div key={i} className="game-table__winner">
                                    <span className="game-table__winner-name">{w.name}</span>
                                    <span className="game-table__winner-hand">{w.hand}</span>
                                    <span className="game-table__winner-amount">+{formatChips(w.amount)}</span>
                                </div>
                            ))}
                            {/* Show all players' hands at showdown */}
                            {gameState.showdownResults && (
                                <div className="game-table__showdown-hands">
                                    {gameState.showdownResults.map((r, i) => (
                                        <div key={i} className="game-table__showdown-player">
                                            <span>{r.name}: {r.hand}</span>
                                            <div className="game-table__showdown-cards">
                                                {r.holeCards.map((c, j) => (
                                                    <Card key={j} card={c} small />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button className="game-table__next-hand-btn" onClick={handleNewHand}>
                                Deal Next Hand →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Action bar */}
            <ActionBar gameState={gameState} onAction={handleAction} />

            {/* Handicap mode toggle */}
            <button
                className={`game-table__hand-helper-toggle ${handicapMode ? 'game-table__hand-helper-toggle--active' : ''}`}
                onClick={() => setHandicapMode(!handicapMode)}
            >
                {handicapMode ? '🧠 Helper ON' : '🧠 Helper'}
            </button>

            {/* Hand helper badge */}
            {handicapMode && gameState.myHandInfo && !gameState.myState?.folded && (
                <div className="game-table__hand-helper">
                    <span className="game-table__hand-badge-label">Your Hand</span>
                    <div className="game-table__hand-badge">
                        {gameState.myHandInfo.name}
                    </div>
                </div>
            )}

            {/* Action log */}
            <div className="game-table__log">
                {actionLog.slice(-5).map((a, i) => (
                    <div key={i} className="game-table__log-entry">
                        <span className={`game-table__log-action game-table__log-action--${a.action}`}>
                            {a.isCPU ? '🤖' : ''} {a.playerName} {a.action}s{a.amount ? ` (${formatChips(a.amount)})` : ''}
                        </span>
                    </div>
                ))}
            </div>

            {/* Side panels */}
            <CheatSheet />
            <ChatBox messages={messages} onSend={handleSendChat} />
        </div>
    );
}
