// server/poker/deck.js
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

function shuffle(deck) {
    const shuffled = [...deck];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

class Deck {
    constructor() {
        this.cards = shuffle(createDeck());
        this.dealt = 0;
    }

    deal(count = 1) {
        const cards = this.cards.slice(this.dealt, this.dealt + count);
        this.dealt += count;
        return cards;
    }

    reset() {
        this.cards = shuffle(createDeck());
        this.dealt = 0;
    }
}

module.exports = { Deck, SUITS, RANKS };
