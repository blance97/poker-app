// client/src/components/GameTable.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import PlayerSeat from './PlayerSeat';
import ActionBar from './ActionBar';
import CheatSheet from './CheatSheet';
import ChatBox from './ChatBox';
import Profile from './Profile';
import Card from './Card';
import { formatChips } from '../utils/cardUtils';
import { soundEngine } from '../utils/soundUtils';
import {
    loadProfile, awardHandWin, recordHandPlayed, resetWinStreak,
    getAvatarIcon, getWinAnimationCSS, AVATAR_WIN_FX,
    getRank, applyTableTheme, applyCardBack,
    updateDailyProgress, getDailyChallenges,
} from '../utils/profileUtils';

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
    const [profile, setProfile] = useState(loadProfile);
    const [showProfile, setShowProfile] = useState(false);
    const [achievementToasts, setAchievementToasts] = useState([]);
    const [winnerFx, setWinnerFx] = useState({}); // playerId → { emoji, color }
    const [challengeToasts, setChallengeToasts] = useState([]);

    const prevPhaseRef = useRef(null);
    const prevHandNumberRef = useRef(null);
    const prevActionLogLenRef = useRef(0);
    // Profile tracking refs
    const profileRef = useRef(loadProfile());
    const chipsSnapshotRef = useRef(null); // chips at start of current hand
    const lastChipsRef = useRef(null);     // chips from previous state update
    const awardedHandRef = useRef(null);   // hand number we last awarded points for

    // Apply stored table theme + card back on mount
    useEffect(() => {
        const p = profileRef.current;
        applyTableTheme(p.tableTheme || 'classic');
        applyCardBack(p.cardBack || 'default');
    }, []);

    useEffect(() => {
        const handleStateUpdate = (state) => {
            setGameState(state);
            if (state?.phase === 'showdown' || state?.gameOver) {
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

    // Helper: add achievement toast (auto-dismiss after 4s)
    const showAchievementToast = useCallback((ach) => {
        const id = Date.now() + Math.random();
        setAchievementToasts(prev => [...prev, { ...ach, _id: id }]);
        setTimeout(() => setAchievementToasts(prev => prev.filter(t => t._id !== id)), 4000);
    }, []);

    // Helper: add challenge-completed toast
    const showChallengeToast = useCallback((ch) => {
        const id = Date.now() + Math.random();
        setChallengeToasts(prev => [...prev, { ...ch, _id: id }]);
        setTimeout(() => setChallengeToasts(prev => prev.filter(t => t._id !== id)), 4500);
    }, []);

    // Sound triggers + profile tracking on game state changes
    useEffect(() => {
        if (!gameState) return;

        const prevPhase = prevPhaseRef.current;
        const prevHand = prevHandNumberRef.current;

        // New hand started
        if (prevHand !== null && prevHand !== gameState.handNumber) {
            soundEngine.playCardDeal();
            // Capture chips at start of this hand (= chips at end of previous hand)
            chipsSnapshotRef.current = lastChipsRef.current;
            // Count hands played
            const { profile: p, newAchievements } = recordHandPlayed(profileRef.current);
            profileRef.current = p;
            setProfile(p);
            newAchievements.forEach(showAchievementToast);
            // Daily challenge: hand played
            const { newlyCompleted: chCmp1 } = updateDailyProgress('handPlayed');
            chCmp1.forEach(showChallengeToast);

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

        // Award points + trigger win animations (once per hand)
        if (gameState.winners && gameState.handNumber !== awardedHandRef.current) {
            awardedHandRef.current = gameState.handNumber;

            // Trigger seat win animations for ALL winners based on their avatar
            const fx = {};
            gameState.winners.forEach(w => {
                const winnerPlayer = gameState.players.find(p => p.id === w.playerId);
                const avatarId = winnerPlayer?.isCPU ? 'default' : (winnerPlayer?.avatar || 'default');
                fx[w.playerId] = AVATAR_WIN_FX[avatarId] || AVATAR_WIN_FX.default;
            });
            setWinnerFx(fx);
            setTimeout(() => setWinnerFx({}), 3200);

            // Play sound effect based on the first winner's animation
            if (gameState.winners.length > 0) {
                const firstWinnerId = gameState.winners[0].playerId;
                const winnerPlayer = gameState.players.find(p => p.id === firstWinnerId);
                if (winnerPlayer) {
                    const animationType = winnerPlayer.winAnimation || (winnerPlayer.isCPU ? 'lightning' : 'confetti');
                    switch (animationType) {
                        case 'guns': soundEngine.playMachineGun(); break;
                        case 'fireworks': soundEngine.playFireworks(); break;
                        case 'stars': soundEngine.playStars(); break;
                        case 'hearts': soundEngine.playHearts(); break;
                        case 'money': soundEngine.playMoney(); break;
                        case 'flames': soundEngine.playFlames(); break;
                        case 'snow': soundEngine.playSnow(); break;
                        case 'lightning': soundEngine.playLightning(); break;
                        case 'robot': soundEngine.playRobotWin(); break;
                        case 'confetti': soundEngine.playConfetti(); break;
                        default: soundEngine.playConfetti(); break;
                    }
                }
            }

            // Award points if we won, reset streak if we lost
            const myWin = gameState.winners.find(w => w.playerId === player.id);
            if (myWin) {
                const myResult = gameState.showdownResults?.find(r => r.playerId === player.id);
                const isFoldWin = myWin.hand === 'Winner by fold';
                const wasAllIn = gameState.myState?.allIn;
                const chipsBeforeHand = chipsSnapshotRef.current ?? gameState.myState?.chips;

                const { profile: p, newAchievements } = awardHandWin(profileRef.current, {
                    amount: myWin.amount,
                    hand: myResult?.hand || myWin.hand,
                    wasAllIn,
                    chipsBeforeHand,
                    isGameWin: gameState.gameOver,
                });
                profileRef.current = p;
                setProfile(p);
                newAchievements.forEach(showAchievementToast);

                // Daily challenge: win event
                const { newlyCompleted: chCmp, rewardEarned } = updateDailyProgress('win', {
                    amount: myWin.amount,
                    foldWin: isFoldWin,
                    wasAllIn,
                    chipsBeforeHand,
                });
                chCmp.forEach(showChallengeToast);
                if (rewardEarned > 0) {
                    const np = { ...profileRef.current, points: (profileRef.current.points || 0) + rewardEarned };
                    profileRef.current = np;
                    setProfile(np);
                }
            } else {
                // Player lost: reset win streak + daily streak
                const p = resetWinStreak(profileRef.current);
                profileRef.current = p;
                setProfile(p);
                const { newlyCompleted: chCmp2 } = updateDailyProgress('loss');
                chCmp2.forEach(showChallengeToast);
            }
        }

        // Update chip snapshot for next hand detection
        lastChipsRef.current = gameState.myState?.chips;

        prevPhaseRef.current = gameState.phase;
        prevHandNumberRef.current = gameState.handNumber;
    }, [gameState, player.id, showAchievementToast]);

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

    const handleLeave = useCallback(() => {
        socket.emit('room:leave', () => { onLeave(); });
    }, [socket, onLeave]);

    const handleNewHand = useCallback(() => {
        setShowResults(false);
        setActionLog([]);
        socket.emit('game:newHand', (result) => {
            if (result.error) {
                console.error('New hand error:', result.error);
                if (result.error.includes('not enough players') || result.error.includes('Game over')) {
                    // Game is over
                    const confirmLeave = confirm('Game Over! Not enough players to continue. Leave table?');
                    if (confirmLeave) {
                        handleLeave();
                    } else {
                        setShowResults(true);
                    }
                } else {
                    alert(result.error);
                }
            }
            if (result.success === false) {
                // Game is over, not enough players
                setShowResults(true);
                const confirmLeave = confirm('Game Over! Not enough players to continue. Leave table?');
                if (confirmLeave) {
                    handleLeave();
                }
            }
        });
    }, [socket, handleLeave]);

    // Spacebar shortcut to deal next hand
    useEffect(() => {
        if (!showResults) return;
        const handleKey = (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                handleNewHand();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [showResults, handleNewHand]);

    const handleSendChat = useCallback((text) => {
        socket.emit('chat:message', text);
    }, [socket]);

    const handleEmote = useCallback((emote) => {
        socket.emit('chat:emote', emote);
    }, [socket]);


    const handleShowCards = useCallback(() => {
        socket.emit('game:showCards', (result) => {
            if (result.error) console.error('Show cards error:', result.error);
        });
    }, [socket]);

    const handleKickBot = useCallback((cpuId) => {
        socket.emit('room:removeCPU', cpuId, (result) => {
            if (result.error) console.error('Kick bot error:', result.error);
        });
    }, [socket]);

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

    // Rank badge for local player's seat
    const myRank = getRank(profile);

    // Winner info shown on seats (only when round is over)
    const winnerInfoMap = {};
    if (showResults && gameState.winners) {
        gameState.winners.forEach(w => {
            winnerInfoMap[w.playerId] = { amount: w.amount, hand: w.hand };
        });
    }

    // "Show Cards" button appears on local player's seat after a fold-win (if not already shown)
    const canShowMyCards = showResults
        && gameState.winners
        && gameState.myState?.holeCards?.length > 0
        && !gameState.shownCards?.some(s => s.playerId === player.id);

    // Calculate opponent positions for gun animation (excluding self)
    const opponentPositions = arrangedPlayers
        .map((p, i) => p && p.id !== player.id ? i : null)
        .filter(i => i !== null);

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
                        className="game-table__profile-btn"
                        onClick={() => setShowProfile(v => !v)}
                        title="Profile & achievements"
                    >
                        {getAvatarIcon(profile)} <span className="game-table__profile-pts">⭐{profile.points || 0}</span>
                    </button>
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
                        onKick={p && p.isCPU && gameState.hostId === player.id
                            ? () => handleKickBot(p.id)
                            : null}
                        winFx={p ? winnerFx[p.id] : null}
                        winnerInfo={p ? winnerInfoMap[p.id] : null}
                        onShowCards={p && p.id === player.id && canShowMyCards ? handleShowCards : null}
                        rankBadge={
                            p && p.id === player.id ? myRank
                            : p && p.isCPU && p.personality ? { icon: '', name: p.personality, color: '#94a3b8' }
                            : null
                        }
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

            {/* Non-blocking full-screen celebration — plays winner's equipped animation */}
            {showResults && gameState.winners && !gameState.gameOver && (() => {
                const firstWinnerId = gameState.winners[0].playerId;
                const winnerPlayer = gameState.players.find(p => p.id === firstWinnerId);
                const animCss = winnerPlayer ? (winnerPlayer.winAnimation || (winnerPlayer.isCPU ? 'robot' : 'confetti')) : 'confetti';

                return (
                    <div className={`celebration-layer celebration-layer--${animCss}`} aria-hidden="true" data-opponent-count={opponentPositions.length}>
                        {animCss === 'guns'
                            ? opponentPositions.flatMap(pos =>
                                Array.from({ length: 15 }).map((_, i) => (
                                    <div
                                        key={`${pos}-${i}`}
                                        className="celebration-layer__piece"
                                        style={{ '--ci': i, '--target-pos': pos }}
                                    />
                                ))
                            )
                            : Array.from({ length: animCss === 'robot' ? 10 : 80 }).map((_, i) => (
                                <div key={i} className="celebration-layer__piece" style={{ '--ci': i }} />
                            ))
                        }
                    </div>
                );
            })()}

            {/* Deal Next Hand — centered below felt */}
            {showResults && gameState.winners && !gameState.gameOver && (
                <div className="game-table__deal-bar">
                    <button className="game-table__next-hand-btn" onClick={handleNewHand}>
                        Deal Next Hand →
                    </button>
                    <button className="game-table__leave-deal-btn" onClick={handleLeave}>
                        Leave Table
                    </button>
                    <span className="game-table__deal-hint">Press Space</span>
                </div>
            )}

            {/* Game Over overlay — final standings */}
            {showResults && gameState.gameOver && (
                <div className="winner-overlay">
                    <div className="winner-overlay__card">
                        <div className="winner-overlay__trophy">🏆</div>
                        <h2 className="winner-overlay__title">Game Over</h2>
                        <div className="winner-overlay__gameover">
                            <div className="winner-overlay__gameover-title">— Final Standings —</div>
                            {[...gameState.players]
                                .sort((a, b) => b.chips - a.chips)
                                .map((p, i) => (
                                    <div key={p.id} className="winner-overlay__standing-row">
                                        <span className="winner-overlay__standing-rank">#{i + 1}</span>
                                        <span className="winner-overlay__standing-name">
                                            {p.isCPU && '🤖'} {p.name}
                                        </span>
                                        <span className="winner-overlay__standing-chips">
                                            {formatChips(p.chips)}
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                        <button className="winner-overlay__next-btn" onClick={handleLeave}>
                            Leave Table
                        </button>
                    </div>
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

            {/* Profile panel */}
            {showProfile && (
                <Profile
                    profile={profile}
                    onProfileChange={(p) => {
                        profileRef.current = p;
                        setProfile(p);
                        // Sync avatar + win animation to server so other players see updates
                        socket.emit('player:setProfile', {
                            avatar: p.avatar || 'default',
                            winAnimation: p.winAnimation || 'confetti',
                        });
                    }}
                    onClose={() => setShowProfile(false)}
                />
            )}

            {/* Achievement toasts */}
            <div className="achievement-toasts">
                {achievementToasts.map(ach => (
                    <div key={ach._id} className="achievement-toast">
                        <span className="achievement-toast__icon">{ach.icon}</span>
                        <div className="achievement-toast__text">
                            <div className="achievement-toast__title">Achievement Unlocked!</div>
                            <div className="achievement-toast__name">{ach.name}</div>
                            {ach.reward > 0 && <div className="achievement-toast__reward">+{ach.reward} pts</div>}
                        </div>
                    </div>
                ))}
                {challengeToasts.map(ch => (
                    <div key={ch._id} className="achievement-toast achievement-toast--challenge">
                        <span className="achievement-toast__icon">{ch.icon}</span>
                        <div className="achievement-toast__text">
                            <div className="achievement-toast__title">Challenge Complete!</div>
                            <div className="achievement-toast__name">{ch.desc}</div>
                            <div className="achievement-toast__reward">+{ch.reward} pts</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
