// client/src/components/GameTable.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import PlayerSeat from './PlayerSeat';
import ActionBar from './ActionBar';
import CheatSheet from './CheatSheet';
import ChatBox from './ChatBox';
import Card from './Card';
import { formatChips } from '../utils/cardUtils';
import { soundEngine } from '../utils/soundUtils';

// Only label positions that matter to beginners (D chip handles Dealer)
function getPositionLabel(posFromDealer, numPlayers) {
    if (numPlayers <= 2) {
        if (posFromDealer === 0) return { text: 'Small Blind', type: 'sb' };
        return { text: 'Big Blind', type: 'bb' };
    }
    if (posFromDealer === 1) return { text: 'Small Blind', type: 'sb' };
    if (posFromDealer === 2) return { text: 'Big Blind', type: 'bb' };
    return null;
}

export default function GameTable({ socket, player, roomId, onLeave }) {
    const [gameState, setGameState] = useState(null);
    const [messages, setMessages] = useState([]);
    const [actionLog, setActionLog] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [handicapMode, setHandicapMode] = useState(false);
    const [muted, setMuted] = useState(false);
    const [playerEmotes, setPlayerEmotes] = useState({});
    const [showBlindsNotif, setShowBlindsNotif] = useState(false);
    const [blindsText, setBlindsText] = useState('');

    const prevPhaseRef = useRef(null);
    const prevHandNumberRef = useRef(null);
    const prevActionLogLenRef = useRef(0);

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

        const handleEmote = ({ playerId, emote, timestamp }) => {
            setPlayerEmotes(prev => ({ ...prev, [playerId]: { emote, ts: timestamp } }));
            setTimeout(() => {
                setPlayerEmotes(prev => {
                    if (prev[playerId]?.ts !== timestamp) return prev;
                    const next = { ...prev };
                    delete next[playerId];
                    return next;
                });
            }, 3000);
        };

        socket.on('game:stateUpdate', handleStateUpdate);
        socket.on('game:actionTaken', handleAction);
        socket.on('chat:message', handleChat);
        socket.on('game:roundOver', handleRoundOver);
        socket.on('chat:emote', handleEmote);

        socket.emit('game:getState', (result) => {
            if (result.state) setGameState(result.state);
        });

        return () => {
            socket.off('game:stateUpdate', handleStateUpdate);
            socket.off('game:actionTaken', handleAction);
            socket.off('chat:message', handleChat);
            socket.off('game:roundOver', handleRoundOver);
            socket.off('chat:emote', handleEmote);
        };
    }, [socket]);

    // Sound triggers on game state changes
    useEffect(() => {
        if (!gameState) return;

        const prevPhase = prevPhaseRef.current;
        const prevHand = prevHandNumberRef.current;

        if (prevHand !== null && prevHand !== gameState.handNumber) {
            soundEngine.playCardDeal();
            if (gameState.blindsJustIncreased) {
                soundEngine.playBlindsUp();
                setBlindsText(`Blinds up: ${formatChips(gameState.smallBlind)}/${formatChips(gameState.bigBlind)}`);
                setShowBlindsNotif(true);
                setTimeout(() => setShowBlindsNotif(false), 4000);
            }
        }

        if (prevPhase !== null && prevPhase !== gameState.phase) {
            if (['flop', 'turn', 'river'].includes(gameState.phase)) {
                soundEngine.playCardDeal();
            }
            if (gameState.phase === 'showdown' && gameState.winners) {
                const iWon = gameState.winners.some(w => w.playerId === player.id);
                if (iWon) soundEngine.playWin();
                else soundEngine.playChip();
            }
        }

        prevPhaseRef.current = gameState.phase;
        prevHandNumberRef.current = gameState.handNumber;
    }, [gameState, player.id]);

    // Sound triggers for CPU actions
    useEffect(() => {
        const newActions = actionLog.slice(prevActionLogLenRef.current);
        prevActionLogLenRef.current = actionLog.length;
        newActions.forEach(a => {
            if (a.isCPU) {
                switch (a.action) {
                    case 'fold': soundEngine.playFold(); break;
                    case 'check': soundEngine.playCheck(); break;
                    case 'call': soundEngine.playChip(); break;
                    case 'raise': soundEngine.playRaise(); break;
                }
            }
        });
    }, [actionLog]);

    const handleAction = useCallback((action) => {
        socket.emit('game:action', action, (result) => {
            if (result.error) console.error('Action error:', result.error);
        });
    }, [socket]);

    const handleNewHand = useCallback(() => {
        setShowResults(false);
        setActionLog([]);
        socket.emit('game:newHand', (result) => {
            if (result.error) console.error('New hand error:', result.error);
        });
    }, [socket]);

    const handleSendChat = useCallback((text) => {
        socket.emit('chat:message', text);
    }, [socket]);

    const handleEmote = useCallback((emote) => {
        socket.emit('chat:emote', emote);
    }, [socket]);

    const handleLeave = useCallback(() => {
        socket.emit('room:leave', () => { onLeave(); });
    }, [socket, onLeave]);

    const handleMuteToggle = useCallback(() => {
        setMuted(soundEngine.toggle());
    }, []);

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
    const numPlayers = gameState.players.length;
    const arrangedPlayers = [];
    for (let i = 0; i < 8; i++) {
        const playerIndex = (myIndex + i) % numPlayers;
        if (i < numPlayers) {
            arrangedPlayers.push(gameState.players[playerIndex]);
        } else {
            arrangedPlayers.push(null);
        }
    }

    const positionLabels = arrangedPlayers.map((p, i) => {
        if (!p) return null;
        const originalIndex = (myIndex + i) % numPlayers;
        const posFromDealer = (originalIndex - gameState.dealerIndex + numPlayers) % numPlayers;
        return getPositionLabel(posFromDealer, numPlayers);
    });

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
                <button className="game-table__leave-btn" onClick={handleLeave}>← Leave</button>
                <div className="game-table__info">
                    <span className="game-table__phase">{phaseName}</span>
                    <span className="game-table__hand">Hand #{gameState.handNumber}</span>
                    {gameState.smallBlind && (
                        <span className="game-table__blinds">
                            {formatChips(gameState.smallBlind)}/{formatChips(gameState.bigBlind)}
                        </span>
                    )}
                </div>
                <div className="game-table__topbar-right">
                    <button
                        className={`game-table__hand-helper-toggle ${handicapMode ? 'game-table__hand-helper-toggle--active' : ''}`}
                        onClick={() => setHandicapMode(!handicapMode)}
                        title="Toggle hand helper"
                    >
                        🧠
                    </button>
                    <button
                        className={`game-table__mute-btn ${muted ? 'game-table__mute-btn--muted' : ''}`}
                        onClick={handleMuteToggle}
                        title={muted ? 'Unmute' : 'Mute'}
                    >
                        {muted ? '🔇' : '🔊'}
                    </button>
                    <div className="game-table__my-chips">
                        💰 {gameState.myState ? formatChips(gameState.myState.chips) : 0}
                        {gameState.myState && gameState.myState.chips === 0 && (
                            <button
                                className="game-table__rebuy-btn"
                                onClick={() => {
                                    socket.emit('game:rebuy', (result) => {
                                        if (result.error) alert(result.error);
                                    });
                                }}
                            >
                                + Buy In
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Blinds increase notification */}
            {showBlindsNotif && (
                <div className="blinds-notif">📈 {blindsText}</div>
            )}

            {/* Main table area */}
            <div className="game-table__felt">
                {/* Player seats */}
                {arrangedPlayers.map((p, i) => (
                    <PlayerSeat
                        key={i}
                        player={p}
                        isMe={p && p.id === player.id}
                        position={i}
                        positionLabel={positionLabels[i]}
                        emote={p ? playerEmotes[p.id] : null}
                    />
                ))}

                {/* Center: community cards + pot */}
                <div className="game-table__center">
                    <div className="game-table__pot">
                        <span className="game-table__pot-label">POT</span>
                        <span className="game-table__pot-amount">{formatChips(gameState.pot)}</span>
                        {(() => {
                            const activePlayers = gameState.players.filter(p => p.isActive && !p.folded);
                            return gameState.pots && gameState.pots.length > 1 && activePlayers.length >= 2 && (
                                <div className="game-table__side-pots">
                                    {gameState.pots.map((pot, i) => (
                                        <div key={i} className="game-table__side-pot-entry">
                                            <span className="game-table__side-pot-label">{i === 0 ? 'Main' : `Side ${i}`}</span>
                                            <span className="game-table__side-pot-value">{formatChips(pot.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                    <div className="game-table__community">
                        {gameState.communityCards.map((card, i) => (
                            <Card key={`${gameState.phase}-${i}`} card={card} dealDelay={i * 0.12} />
                        ))}
                        {Array.from({ length: 5 - gameState.communityCards.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="card card--placeholder"></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Winner banner — outside the felt, between felt and action bar, no z-index conflicts */}
            {showResults && gameState.winners && (
                <div className="game-table__winner-banner">
                    <div className="game-table__winner-banner-title">
                        {gameState.winners.length > 1 ? '🤝 Split Pot!' : '🏆 Winner!'}
                    </div>
                    <div className="game-table__winner-banner-players">
                        {gameState.winners.map((w, i) => (
                            <div key={i} className="game-table__winner-banner-row">
                                <span className="game-table__winner-name">{w.name}</span>
                                <span className="game-table__winner-hand">
                                    {w.hand === 'Winner by fold' ? 'Opponents folded' : w.hand}
                                </span>
                                <span className="game-table__winner-amount">+{formatChips(w.amount)}</span>
                            </div>
                        ))}
                    </div>
                    {gameState.showdownResults && gameState.showdownResults.length > 0
                        && gameState.winners.every(w => w.hand !== 'Winner by fold') && (
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
            )}

            {/* Action bar */}
            <ActionBar gameState={gameState} onAction={handleAction} />

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
                {actionLog.slice(-4).map((a, i) => (
                    <div key={i} className="game-table__log-entry">
                        <span className={`game-table__log-action game-table__log-action--${a.action}`}>
                            {a.isCPU ? '🤖' : ''} {a.playerName} {a.action}s{a.amount ? ` (${formatChips(a.amount)})` : ''}
                        </span>
                    </div>
                ))}
            </div>

            {/* Side panels */}
            <CheatSheet />
            <ChatBox messages={messages} onSend={handleSendChat} onEmote={handleEmote} />
        </div>
    );
}
