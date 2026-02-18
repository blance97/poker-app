// server/poker/handEvaluator.js

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const HAND_RANKINGS = {
    ROYAL_FLUSH: 10,
    STRAIGHT_FLUSH: 9,
    FOUR_OF_A_KIND: 8,
    FULL_HOUSE: 7,
    FLUSH: 6,
    STRAIGHT: 5,
    THREE_OF_A_KIND: 4,
    TWO_PAIR: 3,
    ONE_PAIR: 2,
    HIGH_CARD: 1,
};

const HAND_NAMES = {
    10: 'Royal Flush',
    9: 'Straight Flush',
    8: 'Four of a Kind',
    7: 'Full House',
    6: 'Flush',
    5: 'Straight',
    4: 'Three of a Kind',
    3: 'Two Pair',
    2: 'One Pair',
    1: 'High Card',
};

/**
 * Get all 5-card combinations from a set of cards
 */
function getCombinations(cards, size) {
    if (size === 0) return [[]];
    if (cards.length === 0) return [];
    const [first, ...rest] = cards;
    const withFirst = getCombinations(rest, size - 1).map(c => [first, ...c]);
    const withoutFirst = getCombinations(rest, size);
    return [...withFirst, ...withoutFirst];
}

/**
 * Evaluate a 5-card hand
 */
function evaluate5(cards) {
    const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    const values = sorted.map(c => RANK_VALUES[c.rank]);
    const suits = sorted.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);

    // Check for straight (including A-2-3-4-5 wheel)
    let isStraight = false;
    let straightHigh = values[0];

    if (
        values[0] - values[1] === 1 &&
        values[1] - values[2] === 1 &&
        values[2] - values[3] === 1 &&
        values[3] - values[4] === 1
    ) {
        isStraight = true;
    }
    // Ace-low straight (A-2-3-4-5)
    if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
        isStraight = true;
        straightHigh = 5;
    }

    // Count ranks
    const rankCounts = {};
    for (const v of values) {
        rankCounts[v] = (rankCounts[v] || 0) + 1;
    }
    const counts = Object.entries(rankCounts)
        .map(([rank, count]) => ({ rank: parseInt(rank), count }))
        .sort((a, b) => b.count - a.count || b.rank - a.rank);

    // Royal Flush
    if (isFlush && isStraight && straightHigh === 14) {
        return { ranking: HAND_RANKINGS.ROYAL_FLUSH, score: [10, 14], name: HAND_NAMES[10] };
    }
    // Straight Flush
    if (isFlush && isStraight) {
        return { ranking: HAND_RANKINGS.STRAIGHT_FLUSH, score: [9, straightHigh], name: HAND_NAMES[9] };
    }
    // Four of a Kind
    if (counts[0].count === 4) {
        return {
            ranking: HAND_RANKINGS.FOUR_OF_A_KIND,
            score: [8, counts[0].rank, counts[1].rank],
            name: HAND_NAMES[8],
        };
    }
    // Full House
    if (counts[0].count === 3 && counts[1].count === 2) {
        return {
            ranking: HAND_RANKINGS.FULL_HOUSE,
            score: [7, counts[0].rank, counts[1].rank],
            name: HAND_NAMES[7],
        };
    }
    // Flush
    if (isFlush) {
        return { ranking: HAND_RANKINGS.FLUSH, score: [6, ...values], name: HAND_NAMES[6] };
    }
    // Straight
    if (isStraight) {
        return { ranking: HAND_RANKINGS.STRAIGHT, score: [5, straightHigh], name: HAND_NAMES[5] };
    }
    // Three of a Kind
    if (counts[0].count === 3) {
        const kickers = counts.filter(c => c.count === 1).map(c => c.rank);
        return {
            ranking: HAND_RANKINGS.THREE_OF_A_KIND,
            score: [4, counts[0].rank, ...kickers],
            name: HAND_NAMES[4],
        };
    }
    // Two Pair
    if (counts[0].count === 2 && counts[1].count === 2) {
        const pairs = [counts[0].rank, counts[1].rank].sort((a, b) => b - a);
        const kicker = counts[2].rank;
        return {
            ranking: HAND_RANKINGS.TWO_PAIR,
            score: [3, ...pairs, kicker],
            name: HAND_NAMES[3],
        };
    }
    // One Pair
    if (counts[0].count === 2) {
        const kickers = counts.filter(c => c.count === 1).map(c => c.rank).sort((a, b) => b - a);
        return {
            ranking: HAND_RANKINGS.ONE_PAIR,
            score: [2, counts[0].rank, ...kickers],
            name: HAND_NAMES[2],
        };
    }
    // High Card
    return { ranking: HAND_RANKINGS.HIGH_CARD, score: [1, ...values], name: HAND_NAMES[1] };
}

/**
 * Compare two score arrays lexicographically
 */
function compareScores(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const va = a[i] || 0;
        const vb = b[i] || 0;
        if (va !== vb) return vb - va; // higher is better
    }
    return 0; // tie
}

/**
 * Evaluate the best 5-card hand from 5-7 cards
 */
function evaluateBestHand(cards) {
    if (cards.length < 5) throw new Error('Need at least 5 cards to evaluate');

    if (cards.length === 5) {
        return evaluate5(cards);
    }

    const combos = getCombinations(cards, 5);
    let best = null;

    for (const combo of combos) {
        const result = evaluate5(combo);
        if (!best || compareScores(result.score, best.score) < 0) {
            best = result;
            best.cards = combo;
        }
    }

    return best;
}

/**
 * Given multiple players' hole cards + community cards, determine winner(s)
 */
function determineWinners(players, communityCards) {
    const results = players.map(player => {
        const allCards = [...player.holeCards, ...communityCards];
        const evaluation = evaluateBestHand(allCards);
        return { playerId: player.id, name: player.name, evaluation };
    });

    results.sort((a, b) => compareScores(a.evaluation.score, b.evaluation.score));

    // Find all players tied with the best hand
    const winners = [results[0]];
    for (let i = 1; i < results.length; i++) {
        if (compareScores(results[i].evaluation.score, results[0].evaluation.score) === 0) {
            winners.push(results[i]);
        } else {
            break;
        }
    }

    return { winners, allResults: results };
}

module.exports = {
    evaluateBestHand,
    determineWinners,
    HAND_RANKINGS,
    HAND_NAMES,
    RANK_VALUES,
};
