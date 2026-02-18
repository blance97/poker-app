// server/poker/cpuPlayer.js
const { evaluateBestHand, HAND_RANKINGS } = require('./handEvaluator');
const logger = require('../utils/logger');

/**
 * CPU player AI for poker
 * Difficulty levels: 'easy', 'medium', 'hard'
 */
class CPUPlayer {
    constructor(id, name, difficulty = 'medium') {
        this.id = id;
        this.name = name;
        this.difficulty = difficulty;
        this.isCPU = true;
    }

    /**
     * Decide what action to take given current game state
     */
    decide(gameState) {
        const { holeCards, communityCards, currentBet, myBet, myChips, pot, phase } = gameState;

        // Calculate hand strength if we have community cards
        let handStrength = 0;
        if (communityCards.length >= 3) {
            const allCards = [...holeCards, ...communityCards];
            const evaluation = evaluateBestHand(allCards);
            handStrength = evaluation.ranking / 10; // normalize to 0-1
        } else {
            // Pre-flop: evaluate hole cards
            handStrength = this._evaluatePreFlop(holeCards);
        }

        // Add randomness based on difficulty
        const noise = this._getNoise();
        const adjustedStrength = Math.min(1, Math.max(0, handStrength + noise));

        const toCall = currentBet - myBet;
        const canCheck = toCall === 0;

        logger.debug('CPU', `${this.name} strength=${adjustedStrength.toFixed(2)} toCall=${toCall} canCheck=${canCheck}`);

        // Decision thresholds based on difficulty
        const thresholds = this._getThresholds();

        // Very weak hand
        if (adjustedStrength < thresholds.fold) {
            if (canCheck) {
                return { action: 'check' };
            }
            // Sometimes bluff
            if (Math.random() < thresholds.bluffChance) {
                return { action: 'call' };
            }
            return { action: 'fold' };
        }

        // Medium hand
        if (adjustedStrength < thresholds.raise) {
            if (canCheck) {
                // Sometimes bet with medium hands
                if (Math.random() < 0.3) {
                    const betAmount = Math.min(myChips, Math.floor(pot * 0.5));
                    if (betAmount > 0) return { action: 'raise', amount: betAmount };
                }
                return { action: 'check' };
            }
            if (toCall <= myChips * 0.3) {
                return { action: 'call' };
            }
            return { action: 'fold' };
        }

        // Strong hand
        if (canCheck) {
            // Bet or slow-play
            if (Math.random() < 0.7) {
                const betAmount = Math.min(myChips, Math.floor(pot * (0.5 + adjustedStrength * 0.5)));
                if (betAmount > 0) return { action: 'raise', amount: betAmount };
            }
            return { action: 'check' };
        }

        // Strong hand, need to call
        if (toCall <= myChips) {
            // Consider raising
            if (adjustedStrength > thresholds.bigRaise && Math.random() < 0.5) {
                const raiseAmount = Math.min(myChips, toCall + Math.floor(pot * 0.75));
                return { action: 'raise', amount: raiseAmount };
            }
            return { action: 'call' };
        }

        // All-in decision
        if (adjustedStrength > 0.7) {
            return { action: 'call' }; // all-in
        }
        return { action: 'fold' };
    }

    _evaluatePreFlop(holeCards) {
        if (holeCards.length < 2) return 0.3;

        const { RANK_VALUES } = require('./handEvaluator');
        const v1 = RANK_VALUES[holeCards[0].rank];
        const v2 = RANK_VALUES[holeCards[1].rank];
        const isPair = v1 === v2;
        const isSuited = holeCards[0].suit === holeCards[1].suit;
        const highCard = Math.max(v1, v2);
        const gap = Math.abs(v1 - v2);

        let strength = (highCard / 14) * 0.4; // base is high card value

        if (isPair) {
            strength += 0.3 + (highCard / 14) * 0.2;
        }
        if (isSuited) {
            strength += 0.05;
        }
        if (gap <= 2 && !isPair) {
            strength += 0.05; // connected cards
        }
        // Premium hands
        if (isPair && highCard >= 12) strength = Math.max(strength, 0.8);
        if (highCard === 14 && Math.min(v1, v2) >= 12) strength = Math.max(strength, 0.7);

        return Math.min(1, strength);
    }

    _getNoise() {
        const ranges = { easy: 0.3, medium: 0.15, hard: 0.05 };
        const range = ranges[this.difficulty] || 0.15;
        return (Math.random() - 0.5) * range * 2;
    }

    _getThresholds() {
        const presets = {
            easy: { fold: 0.2, raise: 0.5, bigRaise: 0.7, bluffChance: 0.3 },
            medium: { fold: 0.25, raise: 0.55, bigRaise: 0.75, bluffChance: 0.15 },
            hard: { fold: 0.3, raise: 0.6, bigRaise: 0.8, bluffChance: 0.1 },
        };
        return presets[this.difficulty] || presets.medium;
    }
}

module.exports = { CPUPlayer };
