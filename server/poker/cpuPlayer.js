// server/poker/cpuPlayer.js
const { evaluateBestHand, HAND_RANKINGS } = require('./handEvaluator');
const logger = require('../utils/logger');

/**
 * CPU player AI for poker
 * Difficulty levels: 'easy', 'medium', 'hard'
 * Personalities: 'aggressive', 'passive', 'bluffer', 'balanced', 'maniac'
 */

const PERSONALITY_CHAT = {
    aggressive: {
        raise: ["I'm coming for you!", "Feel the pressure.", "All or nothing.", "Raise it up!"],
        win:   ["Crushed it.", "That's how it's done.", "Bow down.", "Too easy."],
        fold:  ["Smart move.", "You got lucky.", "I'll be back."],
        bluff: ["You folded to THIS?", "Gotcha.", "Weak."],
    },
    passive: {
        raise: ["I suppose I'll bet...", "Going in cautiously.", "Small raise."],
        win:   ["Oh my, I won!", "Lucky me!", "That worked out.", "Phew!"],
        fold:  ["Too risky for me.", "I'll sit this one out.", "Better safe than sorry."],
        bluff: ["Oh, they actually folded!", "It worked!", "Surprising."],
    },
    bluffer: {
        raise: ["Nothing to see here.", "I've got the goods.", "Trust me.", "You should fold."],
        win:   ["Told you.", "Read me wrong?", "That's what bluffing does.", "Surprise!"],
        fold:  ["Fine, you caught me.", "This time.", "Nice read."],
        bluff: ["They believed it!", "Works every time.", "Poker face!"],
    },
    balanced: {
        raise: ["Raising.", "I like my hand.", "Let's see what you've got."],
        win:   ["Good hand.", "Well played.", "I'll take it.", "The math checked out."],
        fold:  ["Not worth it.", "Folding here.", "Good bet."],
        bluff: ["Interesting.", "Sometimes you gotta.", "The bluff lands."],
    },
    maniac: {
        raise: ["ALL IN EVERY HAND", "YOLO!!!", "I CAME TO GAMBLE", "LET'S GOOO"],
        win:   ["CHAOS REIGNS", "NEVER STOP BETTING", "WOOOO", "EZ GG"],
        fold:  ["...fine.", "WHATEVER I'M COMING BACK", "temporary setback"],
        bluff: ["IT WAS A BLUFF THE WHOLE TIME", "CHAOS POKER!!!", "NOTHING IS REAL"],
    },
};

class CPUPlayer {
    constructor(id, name, difficulty = 'medium', personality = 'balanced') {
        this.id = id;
        this.name = name;
        this.difficulty = difficulty;
        this.personality = personality;
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

        logger.debug('CPU', `${this.name} [${this.personality}] strength=${adjustedStrength.toFixed(2)} toCall=${toCall} canCheck=${canCheck}`);

        // Decision thresholds based on difficulty + personality
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
                if (Math.random() < thresholds.medBetChance) {
                    const betAmount = Math.min(myChips, Math.floor(pot * thresholds.betSizing));
                    if (betAmount > 0) return { action: 'raise', amount: betAmount };
                }
                return { action: 'check' };
            }
            if (toCall <= myChips * thresholds.callThreshold) {
                return { action: 'call' };
            }
            return { action: 'fold' };
        }

        // Strong hand
        if (canCheck) {
            if (Math.random() < thresholds.strongBetChance) {
                const betAmount = Math.min(myChips, Math.floor(pot * (thresholds.betSizing + adjustedStrength * 0.5)));
                if (betAmount > 0) return { action: 'raise', amount: betAmount };
            }
            return { action: 'check' };
        }

        // Strong hand, need to call
        if (toCall <= myChips) {
            if (adjustedStrength > thresholds.bigRaise && Math.random() < thresholds.reraisChance) {
                const raiseAmount = Math.min(myChips, toCall + Math.floor(pot * 0.75));
                return { action: 'raise', amount: raiseAmount };
            }
            return { action: 'call' };
        }

        // All-in decision
        if (adjustedStrength > thresholds.allInThreshold) {
            return { action: 'call' }; // all-in
        }
        return { action: 'fold' };
    }

    /** Get a random chat line for an action/event. Returns null if no chat. */
    getChatLine(event) {
        const lines = PERSONALITY_CHAT[this.personality]?.[event];
        if (!lines || lines.length === 0) return null;
        // ~40% chance to chat
        if (Math.random() > 0.4) return null;
        return lines[Math.floor(Math.random() * lines.length)];
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

        let strength = (highCard / 14) * 0.4;

        if (isPair) {
            strength += 0.3 + (highCard / 14) * 0.2;
        }
        if (isSuited) {
            strength += 0.05;
        }
        if (gap <= 2 && !isPair) {
            strength += 0.05;
        }
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
        // Base thresholds by difficulty
        const base = {
            easy:   { fold: 0.2,  raise: 0.5,  bigRaise: 0.7,  bluffChance: 0.3,  medBetChance: 0.3, strongBetChance: 0.7, betSizing: 0.5, callThreshold: 0.3, reraisChance: 0.5, allInThreshold: 0.7 },
            medium: { fold: 0.25, raise: 0.55, bigRaise: 0.75, bluffChance: 0.15, medBetChance: 0.3, strongBetChance: 0.7, betSizing: 0.5, callThreshold: 0.3, reraisChance: 0.5, allInThreshold: 0.7 },
            hard:   { fold: 0.3,  raise: 0.6,  bigRaise: 0.8,  bluffChance: 0.1,  medBetChance: 0.3, strongBetChance: 0.7, betSizing: 0.5, callThreshold: 0.3, reraisChance: 0.5, allInThreshold: 0.7 },
        };
        const t = { ...(base[this.difficulty] || base.medium) };

        // Personality modifiers
        switch (this.personality) {
            case 'aggressive':
                t.fold -= 0.1;
                t.bluffChance += 0.1;
                t.medBetChance = 0.6;
                t.strongBetChance = 0.95;
                t.betSizing = 0.75;
                t.reraisChance = 0.75;
                break;
            case 'passive':
                t.fold += 0.05;
                t.bluffChance = 0.05;
                t.medBetChance = 0.1;
                t.strongBetChance = 0.4;
                t.betSizing = 0.3;
                t.callThreshold = 0.2;
                t.reraisChance = 0.2;
                break;
            case 'bluffer':
                t.bluffChance = 0.5;
                t.fold -= 0.05;
                t.medBetChance = 0.5;
                t.betSizing = 0.6;
                break;
            case 'maniac':
                t.fold = 0.05;
                t.bluffChance = 0.7;
                t.medBetChance = 0.8;
                t.strongBetChance = 1.0;
                t.betSizing = 1.0;
                t.callThreshold = 0.9;
                t.reraisChance = 0.9;
                t.allInThreshold = 0.3;
                break;
            case 'balanced':
            default:
                break;
        }

        return t;
    }
}

module.exports = { CPUPlayer };
