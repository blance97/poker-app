// client/src/components/ActionBar.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { formatChips } from '../utils/cardUtils';
import { soundEngine } from '../utils/soundUtils';

const TIMER_SECONDS = 30;

export default function ActionBar({ gameState, onAction }) {
    const [raiseAmount, setRaiseAmount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
    const timerRef = useRef(null);
    const onActionRef = useRef(onAction);
    useEffect(() => { onActionRef.current = onAction; }, [onAction]);

    const isActive = !!(gameState?.isMyTurn && gameState?.phase !== 'showdown');

    const bigBlind = gameState?.bigBlind || 20;
    const myState = gameState?.myState;
    const currentBet = gameState?.currentBet ?? 0;
    const pot = gameState?.pot ?? 0;
    const toCall = myState ? Math.max(0, currentBet - (myState.currentBet ?? 0)) : 0;
    const canCheck = toCall === 0;
    const minRaise = currentBet + bigBlind;
    const maxRaise = myState ? myState.chips + (myState.currentBet ?? 0) : minRaise;
    const effectiveRaise = (raiseAmount >= minRaise) ? raiseAmount : minRaise;

    const doAction = useCallback((action, playSound) => {
        clearInterval(timerRef.current);
        playSound();
        onActionRef.current(action);
    }, []);

    // Timer — resets whenever it becomes our turn (new hand or new currentPlayer)
    useEffect(() => {
        if (!isActive) {
            clearInterval(timerRef.current);
            return;
        }
        setTimeLeft(TIMER_SECONDS);
        setRaiseAmount(0);
        soundEngine.playYourTurn();

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev - 1;
                if (next <= 0) {
                    clearInterval(timerRef.current);
                    onActionRef.current({ action: 'fold' });
                    soundEngine.playFold();
                    return 0;
                }
                if (next <= 10) soundEngine.playTick();
                return next;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [isActive, gameState?.handNumber, gameState?.currentPlayerIndex]); // eslint-disable-line

    // Keyboard shortcuts
    useEffect(() => {
        if (!isActive) return;
        const handle = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key.toLowerCase() === 'f') doAction({ action: 'fold' }, () => soundEngine.playFold());
            else if (e.key.toLowerCase() === 'c') doAction(
                { action: canCheck ? 'check' : 'call' },
                () => canCheck ? soundEngine.playCheck() : soundEngine.playChip()
            );
            else if (e.key.toLowerCase() === 'r') doAction(
                { action: 'raise', amount: effectiveRaise },
                () => soundEngine.playRaise()
            );
            else if (e.key.toLowerCase() === 'a') doAction(
                { action: 'raise', amount: maxRaise },
                () => soundEngine.playAllIn()
            );
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [isActive, canCheck, effectiveRaise, maxRaise, doAction]);

    if (!isActive) return null;

    const timerPct = (timeLeft / TIMER_SECONDS) * 100;
    const timerUrgent = timeLeft <= 10;

    // Quick bet presets
    const halfPot = Math.min(maxRaise, Math.max(minRaise, Math.round(pot * 0.5)));
    const threeQPot = Math.min(maxRaise, Math.max(minRaise, Math.round(pot * 0.75)));
    const fullPot = Math.min(maxRaise, Math.max(minRaise, pot));
    const twoPot = Math.min(maxRaise, Math.max(minRaise, pot * 2));

    // Pot odds: how much of the final pot you're paying to call
    const potOdds = toCall > 0 ? Math.round((toCall / (pot + toCall)) * 100) : 0;

    return (
        <div className="action-bar">
            {/* Timer bar */}
            <div className="action-bar__timer-wrap">
                <div
                    className={`action-bar__timer-bar${timerUrgent ? ' action-bar__timer-bar--urgent' : ''}`}
                    style={{ width: `${timerPct}%` }}
                />
                <span className="action-bar__timer-label">
                    {timerUrgent ? `⚠ ${timeLeft}s` : `${timeLeft}s`}
                </span>
            </div>

            {/* Quick bet presets */}
            <div className="action-bar__quick-bets">
                <span className="action-bar__quick-label">Quick:</span>
                {[
                    { label: '½ Pot', val: halfPot },
                    { label: '¾ Pot', val: threeQPot },
                    { label: 'Pot', val: fullPot },
                    { label: '2×', val: twoPot },
                ].map(({ label, val }) => (
                    <button
                        key={label}
                        className={`action-bar__quick-btn${effectiveRaise === val ? ' action-bar__quick-btn--active' : ''}`}
                        onClick={() => setRaiseAmount(val)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="action-bar__buttons">
                <button
                    className="action-bar__btn action-bar__btn--fold"
                    onClick={() => doAction({ action: 'fold' }, () => soundEngine.playFold())}
                >
                    Fold <kbd>F</kbd>
                </button>

                {canCheck ? (
                    <button
                        className="action-bar__btn action-bar__btn--check"
                        onClick={() => doAction({ action: 'check' }, () => soundEngine.playCheck())}
                    >
                        Check <kbd>C</kbd>
                    </button>
                ) : (
                    <button
                        className="action-bar__btn action-bar__btn--call"
                        onClick={() => doAction({ action: 'call' }, () => soundEngine.playChip())}
                    >
                        Call {formatChips(toCall)}
                        {potOdds > 0 && <span className="action-bar__pot-odds">{potOdds}%</span>}
                        {' '}<kbd>C</kbd>
                    </button>
                )}

                <div className="action-bar__raise">
                    <input
                        type="range"
                        min={minRaise}
                        max={maxRaise}
                        value={effectiveRaise}
                        onChange={e => setRaiseAmount(parseInt(e.target.value))}
                        className="action-bar__slider"
                    />
                    <button
                        className="action-bar__btn action-bar__btn--raise"
                        onClick={() => doAction({ action: 'raise', amount: effectiveRaise }, () => soundEngine.playRaise())}
                    >
                        Raise to {formatChips(effectiveRaise)} <kbd>R</kbd>
                    </button>
                </div>

                {myState.chips > 0 && (
                    <button
                        className="action-bar__btn action-bar__btn--allin"
                        onClick={() => doAction({ action: 'raise', amount: maxRaise }, () => soundEngine.playAllIn())}
                    >
                        All In ({formatChips(myState.chips)}) <kbd>A</kbd>
                    </button>
                )}
            </div>
        </div>
    );
}
