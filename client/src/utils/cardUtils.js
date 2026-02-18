// client/src/utils/cardUtils.js

export const SUIT_SYMBOLS = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

export const SUIT_COLORS = {
    hearts: '#ef4444',
    diamonds: '#ef4444',
    clubs: '#1e293b',
    spades: '#1e293b',
};

export function getCardDisplay(card) {
    if (!card || card.rank === 'hidden') {
        return { rank: '?', suit: '?', color: '#94a3b8', symbol: '?' };
    }
    return {
        rank: card.rank,
        suit: card.suit,
        color: SUIT_COLORS[card.suit] || '#e2e8f0',
        symbol: SUIT_SYMBOLS[card.suit] || '?',
    };
}

export function formatChips(amount) {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
}
