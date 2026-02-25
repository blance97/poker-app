// client/src/components/Card.jsx
import { getCardDisplay } from '../utils/cardUtils';

export default function Card({ card, faceDown = false, small = false, dealDelay = 0 }) {
    const display = getCardDisplay(card);
    const isHidden = faceDown || !card || card.rank === 'hidden';
    const delayStyle = dealDelay > 0 ? { animationDelay: `${dealDelay}s` } : {};

    const cardBack = typeof document !== 'undefined'
        ? (document.documentElement.getAttribute('data-card-back') || 'default')
        : 'default';

    return (
        <div className={`card ${isHidden ? 'card--facedown' : ''} ${small ? 'card--small' : ''}`}>
            {isHidden ? (
                <div className={`card__back card__back--${cardBack}`} style={delayStyle}>
                    <div className="card__back-pattern"></div>
                </div>
            ) : (
                <div className="card__front" style={{ color: display.color, ...delayStyle }}>
                    <span className="card__rank">{display.rank}</span>
                    <span className="card__suit">{display.symbol}</span>
                    <span className="card__rank card__rank--bottom">{display.rank}</span>
                </div>
            )}
        </div>
    );
}
