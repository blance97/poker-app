// client/src/components/PlayerSeat.jsx
import Card from './Card';
import { formatChips } from '../utils/cardUtils';

export default function PlayerSeat({ player, isMe, position }) {
    if (!player) return <div className={`seat seat--empty seat--pos-${position}`}></div>;

    const { name, chips, holeCards, folded, allIn, isDealer, isCurrent, isCPU, currentBet } = player;

    return (
        <div className={`seat seat--pos-${position} ${isCurrent ? 'seat--active' : ''} ${folded ? 'seat--folded' : ''} ${isMe ? 'seat--me' : ''}`}>
            {isDealer && <div className="seat__dealer-btn">D</div>}
            <div className="seat__info">
                <span className="seat__name">
                    {isCPU && <span className="seat__cpu-badge">🤖</span>}
                    {name}
                </span>
                <span className="seat__chips">{formatChips(chips)}</span>
            </div>
            <div className="seat__cards">
                {holeCards && holeCards.length > 0 ? (
                    holeCards.map((card, i) => (
                        <Card key={i} card={card} small />
                    ))
                ) : (
                    <>
                        <Card faceDown small />
                        <Card faceDown small />
                    </>
                )}
            </div>
            {currentBet > 0 && (
                <div className="seat__bet">
                    <span className="seat__bet-chip"></span>
                    {formatChips(currentBet)}
                </div>
            )}
            {allIn && <div className="seat__status seat__status--allin">ALL IN</div>}
            {folded && <div className="seat__status seat__status--folded">FOLDED</div>}
        </div>
    );
}
