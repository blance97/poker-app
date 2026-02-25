// client/src/components/PlayerSeat.jsx
import Card from './Card';
import { formatChips } from '../utils/cardUtils';
import { getAvatarById } from '../utils/profileUtils';

// Fixed spread positions for win particles
const PARTICLE_OFFSETS = [
    { x: -35, y: -70 }, { x: -15, y: -90 }, { x: 5, y: -80 },
    { x: 25, y: -85 }, { x: 40, y: -65 }, { x: -10, y: -95 },
];

export default function PlayerSeat({ player, isMe, position, positionLabel, emote, onKick, winFx, winnerInfo, onShowCards, rankBadge }) {
    if (!player) return <div className={`seat seat--empty seat--pos-${position}`}></div>;

    const { name, chips, holeCards, folded, allIn, isDealer, isCurrent, isCPU, currentBet, avatar } = player;
    const avatarIcon = isCPU ? '🤖' : getAvatarById(avatar || 'default');

    return (
        <div className={`seat seat--pos-${position} ${isCurrent ? 'seat--active' : ''} ${folded ? 'seat--folded' : ''} ${isMe ? 'seat--me' : ''} ${winFx ? 'seat--winning' : ''}`}
            style={winFx ? { '--win-color': winFx.color } : undefined}>

            {isDealer && <div className="seat__dealer-btn">D</div>}
            {positionLabel && !winnerInfo && (
                <div className={`seat__position-label${positionLabel.type !== 'dealer' ? ` seat__position-label--${positionLabel.type}` : ''}`}>
                    {positionLabel.text}
                </div>
            )}
            {emote && <div className="seat__emote-bubble" key={emote.ts}>{emote.emote}</div>}
            {isCPU && onKick && (
                <button className="seat__kick-btn" onClick={onKick} title="Kick bot">✕</button>
            )}

            {/* Winner badge */}
            {winnerInfo && (
                <div className="seat__winner-badge">
                    🏆 +{formatChips(winnerInfo.amount)}
                    <span className="seat__winner-hand">
                        {winnerInfo.hand === 'Winner by fold' ? 'Opponents folded' : winnerInfo.hand}
                    </span>
                </div>
            )}

            {/* Avatar badge */}
            <div className="seat__avatar-badge">{avatarIcon}</div>

            <div className="seat__info">
                <span className="seat__name">{name}</span>
                {rankBadge && (
                    <span className="seat__rank-badge" style={rankBadge.color ? { color: rankBadge.color } : undefined}>
                        {rankBadge.icon} {rankBadge.name}
                    </span>
                )}
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

            {/* Show my cards button (only for human local player on fold-win) */}
            {onShowCards && (
                <button className="seat__show-cards-btn" onClick={onShowCards}>
                    Show Cards
                </button>
            )}

            {/* Win particles */}
            {winFx && (
                <div className="seat__win-particles" aria-hidden="true">
                    {PARTICLE_OFFSETS.map((pos, i) => (
                        <span
                            key={i}
                            className="seat__win-particle"
                            style={{ '--dx': `${pos.x}px`, '--dy': `${pos.y}px`, '--delay': `${i * 0.18}s` }}
                        >
                            {winFx.emoji}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
