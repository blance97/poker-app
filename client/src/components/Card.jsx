// client/src/components/Card.jsx
import { getCardDisplay } from '../utils/cardUtils';

export default function Card({ card, faceDown = false, small = false }) {
    const display = getCardDisplay(card);
    const isHidden = faceDown || !card || card.rank === 'hidden';

    return (
        <div className={`card ${isHidden ? 'card--facedown' : ''} ${small ? 'card--small' : ''}`}>
            {isHidden ? (
                <div className="card__back">
                    <div className="card__back-pattern"></div>
                </div>
            ) : (
                <div className="card__front" style={{ color: display.color }}>
                    <span className="card__rank">{display.rank}</span>
                    <span className="card__suit">{display.symbol}</span>
                    <span className="card__rank card__rank--bottom">{display.rank}</span>
                </div>
            )}
        </div>
    );
}
