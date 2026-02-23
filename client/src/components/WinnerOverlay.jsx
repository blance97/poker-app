// client/src/components/WinnerOverlay.jsx
import Card from './Card';
import { formatChips } from '../utils/cardUtils';

const CONFETTI_COUNT = 18;

export default function WinnerOverlay({ gameState, onNextHand }) {
    if (!gameState?.winners) return null;

    const winners = gameState.winners;
    const isFoldWin = winners.every(w => w.hand === 'Winner by fold');
    const showHands = !isFoldWin
        && gameState.showdownResults
        && gameState.showdownResults.length > 0;

    return (
        <div className="winner-overlay">
            <div className="winner-overlay__card">
                {/* Confetti dots */}
                <div className="winner-overlay__confetti">
                    {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
                        <div
                            key={i}
                            className="winner-overlay__dot"
                            style={{ '--i': i }}
                        />
                    ))}
                </div>

                {/* Trophy */}
                <span className="winner-overlay__trophy">
                    {winners.length > 1 ? '🤝' : '🏆'}
                </span>

                {/* Title */}
                <h2 className="winner-overlay__title">
                    {winners.length > 1 ? 'Split Pot!' : 'Winner!'}
                </h2>

                {/* Winner(s) info */}
                {winners.map((w, i) => (
                    <div key={i} className="winner-overlay__winner">
                        <span className="winner-overlay__name">{w.name}</span>
                        <span className="winner-overlay__hand">
                            {w.hand === 'Winner by fold' ? 'Opponents folded' : w.hand}
                        </span>
                        <span className="winner-overlay__amount">+{formatChips(w.amount)}</span>
                    </div>
                ))}

                {/* Board cards */}
                {gameState.communityCards?.length > 0 && (
                    <div className="winner-overlay__board">
                        <div className="winner-overlay__board-label">Board</div>
                        <div className="winner-overlay__board-cards">
                            {gameState.communityCards.map((card, i) => (
                                <Card key={i} card={card} small />
                            ))}
                        </div>
                    </div>
                )}

                {/* Showdown hands */}
                {showHands && (
                    <div className="winner-overlay__hands">
                        {gameState.showdownResults.map((r, i) => (
                            <div key={i} className="winner-overlay__hand-row">
                                <span className="winner-overlay__hand-name">
                                    <strong>{r.name}</strong> — {r.hand}
                                </span>
                                <div className="winner-overlay__hand-cards">
                                    {r.holeCards.map((c, j) => (
                                        <Card key={j} card={c} small />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Deal next hand */}
                <button className="winner-overlay__next-btn" onClick={onNextHand}>
                    Deal Next Hand →
                </button>
                <div className="winner-overlay__hint">
                    Press <kbd>Space</kbd> to deal
                </div>
            </div>
        </div>
    );
}
