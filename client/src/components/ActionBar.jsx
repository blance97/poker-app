// client/src/components/ActionBar.jsx
import { useState } from 'react';
import { formatChips } from '../utils/cardUtils';

export default function ActionBar({ gameState, onAction }) {
    const [raiseAmount, setRaiseAmount] = useState(0);

    if (!gameState || !gameState.isMyTurn || gameState.phase === 'showdown') return null;

    const { myState, currentBet } = gameState;
    const toCall = currentBet - myState.currentBet;
    const canCheck = toCall === 0;
    const minRaise = currentBet + 20; // big blind
    const maxRaise = myState.chips + myState.currentBet;

    const handleRaise = () => {
        const amount = Math.max(minRaise, raiseAmount);
        onAction({ action: 'raise', amount });
        setRaiseAmount(0);
    };

    return (
        <div className="action-bar">
            <div className="action-bar__timer">
                <div className="action-bar__timer-label">Your Turn</div>
            </div>

            <div className="action-bar__buttons">
                <button
                    className="action-bar__btn action-bar__btn--fold"
                    onClick={() => onAction({ action: 'fold' })}
                >
                    Fold
                </button>

                {canCheck ? (
                    <button
                        className="action-bar__btn action-bar__btn--check"
                        onClick={() => onAction({ action: 'check' })}
                    >
                        Check
                    </button>
                ) : (
                    <button
                        className="action-bar__btn action-bar__btn--call"
                        onClick={() => onAction({ action: 'call' })}
                    >
                        Call {formatChips(toCall)}
                    </button>
                )}

                <div className="action-bar__raise">
                    <input
                        type="range"
                        min={minRaise}
                        max={maxRaise}
                        value={raiseAmount || minRaise}
                        onChange={e => setRaiseAmount(parseInt(e.target.value))}
                        className="action-bar__slider"
                    />
                    <button
                        className="action-bar__btn action-bar__btn--raise"
                        onClick={handleRaise}
                    >
                        Raise to {formatChips(raiseAmount || minRaise)}
                    </button>
                </div>

                {myState.chips > 0 && (
                    <button
                        className="action-bar__btn action-bar__btn--allin"
                        onClick={() => onAction({ action: 'raise', amount: myState.chips + myState.currentBet })}
                    >
                        All In ({formatChips(myState.chips)})
                    </button>
                )}
            </div>
        </div>
    );
}
