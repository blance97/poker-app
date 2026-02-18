// server/games/PokerGame.js
const { BaseGame } = require('./BaseGame');
const { Deck } = require('../poker/deck');
const { evaluateBestHand, determineWinners } = require('../poker/handEvaluator');
const { CPUPlayer } = require('../poker/cpuPlayer');
const logger = require('../utils/logger');

const PHASES = ['preflop', 'flop', 'turn', 'river', 'showdown'];

class PokerGame extends BaseGame {
    constructor(players, options = {}) {
        super(players, options);
        this.smallBlind = options.smallBlind || 10;
        this.bigBlind = options.bigBlind || 20;
        this.startingChips = options.startingChips || 1000;
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.sidePots = [];
        this.currentBet = 0;
        this.phase = 'waiting';
        this.dealerIndex = 0;
        this.currentPlayerIndex = 0;
        this.lastRaiserIndex = -1;
        this.roundActions = 0;
        this.winners = null;
        this.handNumber = 0;

        // Initialize player state
        this.playerStates = {};
        for (const p of this.players) {
            this.playerStates[p.id] = {
                chips: this.startingChips,
                holeCards: [],
                currentBet: 0,
                totalBetThisRound: 0,
                folded: false,
                allIn: false,
                isActive: true,
            };
        }
    }

    static getGameType() {
        return 'poker';
    }

    start() {
        this.status = 'playing';
        this._startNewHand();
    }

    _startNewHand() {
        this.handNumber++;
        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.lastRaiserIndex = -1;
        this.roundActions = 0;
        this.winners = null;
        this.phase = 'preflop';

        // Reset player states for new hand
        const activePlayers = this.players.filter(p => this.playerStates[p.id].chips > 0);
        if (activePlayers.length < 2) {
            this.status = 'finished';
            return;
        }

        for (const p of this.players) {
            const ps = this.playerStates[p.id];
            ps.holeCards = [];
            ps.currentBet = 0;
            ps.totalBetThisRound = 0;
            ps.folded = ps.chips <= 0;
            ps.allIn = false;
            ps.isActive = ps.chips > 0;
        }

        // Move dealer
        this._advanceDealer();

        // Deal 2 cards to each active player
        for (const p of this.players) {
            if (this.playerStates[p.id].isActive) {
                this.playerStates[p.id].holeCards = this.deck.deal(2);
            }
        }

        // Post blinds
        this._postBlinds();

        // Set current player to after big blind
        const bbIndex = this._getPositionAfter(this._getPositionAfter(this.dealerIndex));
        this.currentPlayerIndex = this._getPositionAfter(bbIndex);
        this.lastRaiserIndex = bbIndex; // BB is the last raiser initially

        logger.info('POKER', `Hand #${this.handNumber} started. Dealer: ${this.players[this.dealerIndex].name}`);
    }

    _advanceDealer() {
        let next = (this.dealerIndex + 1) % this.players.length;
        let attempts = 0;
        while (!this.playerStates[this.players[next].id].isActive && attempts < this.players.length) {
            next = (next + 1) % this.players.length;
            attempts++;
        }
        this.dealerIndex = next;
    }

    _getPositionAfter(index) {
        let next = (index + 1) % this.players.length;
        let attempts = 0;
        while (attempts < this.players.length) {
            const ps = this.playerStates[this.players[next].id];
            if (ps.isActive && !ps.folded && !ps.allIn) {
                return next;
            }
            next = (next + 1) % this.players.length;
            attempts++;
        }
        return -1; // No active players
    }

    _postBlinds() {
        const sbIndex = this._getPositionAfter(this.dealerIndex);
        const bbIndex = this._getPositionAfter(sbIndex);

        // Small blind
        const sbPlayer = this.players[sbIndex];
        const sbState = this.playerStates[sbPlayer.id];
        const sbAmount = Math.min(this.smallBlind, sbState.chips);
        sbState.chips -= sbAmount;
        sbState.currentBet = sbAmount;
        sbState.totalBetThisRound = sbAmount;
        this.pot += sbAmount;
        if (sbState.chips === 0) sbState.allIn = true;

        // Big blind
        const bbPlayer = this.players[bbIndex];
        const bbState = this.playerStates[bbPlayer.id];
        const bbAmount = Math.min(this.bigBlind, bbState.chips);
        bbState.chips -= bbAmount;
        bbState.currentBet = bbAmount;
        bbState.totalBetThisRound = bbAmount;
        this.pot += bbAmount;
        if (bbState.chips === 0) bbState.allIn = true;

        this.currentBet = this.bigBlind;
    }

    handleAction(playerId, action) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return { error: 'Player not in game' };
        if (playerIndex !== this.currentPlayerIndex) return { error: 'Not your turn' };
        if (this.phase === 'showdown' || this.phase === 'waiting') return { error: 'No active betting round' };

        const player = this.players[playerIndex];
        const ps = this.playerStates[playerId];

        if (ps.folded || ps.allIn) return { error: 'Cannot act (folded or all-in)' };

        const toCall = this.currentBet - ps.currentBet;
        let result = {};

        switch (action.action) {
            case 'fold':
                ps.folded = true;
                result = { action: 'fold', player: player.name };
                break;

            case 'check':
                if (toCall > 0) return { error: 'Cannot check, must call or raise' };
                result = { action: 'check', player: player.name };
                break;

            case 'call': {
                const callAmount = Math.min(toCall, ps.chips);
                ps.chips -= callAmount;
                ps.currentBet += callAmount;
                ps.totalBetThisRound += callAmount;
                this.pot += callAmount;
                if (ps.chips === 0) ps.allIn = true;
                result = { action: 'call', player: player.name, amount: callAmount };
                break;
            }

            case 'raise': {
                let raiseAmount = action.amount || this.bigBlind;
                const minRaise = this.currentBet + this.bigBlind;
                const totalBet = Math.max(raiseAmount, minRaise);
                const additionalCost = totalBet - ps.currentBet;
                const actualCost = Math.min(additionalCost, ps.chips);

                ps.chips -= actualCost;
                ps.currentBet += actualCost;
                ps.totalBetThisRound += actualCost;
                this.pot += actualCost;
                this.currentBet = ps.currentBet;
                this.lastRaiserIndex = playerIndex;

                if (ps.chips === 0) ps.allIn = true;
                result = { action: 'raise', player: player.name, amount: this.currentBet };
                break;
            }

            default:
                return { error: `Unknown action: ${action.action}` };
        }

        this.roundActions++;

        // Advance to next player or next phase
        this._advanceGame();

        return result;
    }

    _advanceGame() {
        // Check if only one non-folded player remains
        const activePlayers = this.players.filter(p => {
            const ps = this.playerStates[p.id];
            return ps.isActive && !ps.folded;
        });

        if (activePlayers.length === 1) {
            // Winner by default (everyone else folded)
            this._resolveWinner(activePlayers);
            return;
        }

        // Find next player who can act
        const nextPlayer = this._getPositionAfter(this.currentPlayerIndex);

        // Check if round of betting is complete
        const allActed = this._isBettingRoundComplete();

        if (allActed || nextPlayer === -1) {
            this._advancePhase();
        } else {
            this.currentPlayerIndex = nextPlayer;
        }
    }

    _isBettingRoundComplete() {
        const activePlayers = this.players.filter(p => {
            const ps = this.playerStates[p.id];
            return ps.isActive && !ps.folded && !ps.allIn;
        });

        if (activePlayers.length === 0) return true;

        // All active players must have matched the current bet
        const allMatched = activePlayers.every(p => {
            return this.playerStates[p.id].currentBet === this.currentBet;
        });

        if (!allMatched) return false;

        // Make sure everyone has had a chance to act
        // Check if we've come back around to the last raiser
        const nextPlayer = this._getPositionAfter(this.currentPlayerIndex);
        if (this.lastRaiserIndex >= 0 && nextPlayer === this.lastRaiserIndex && this.roundActions > 0) {
            return true;
        }
        if (this.lastRaiserIndex < 0 && allMatched && this.roundActions >= activePlayers.length) {
            return true;
        }

        return false;
    }

    _advancePhase() {
        const phaseIndex = PHASES.indexOf(this.phase);
        if (phaseIndex >= 3) {
            // After river, go to showdown
            this.phase = 'showdown';
            this._resolveShowdown();
            return;
        }

        this.phase = PHASES[phaseIndex + 1];

        // Reset betting state for new phase
        for (const p of this.players) {
            this.playerStates[p.id].currentBet = 0;
        }
        this.currentBet = 0;
        this.lastRaiserIndex = -1;
        this.roundActions = 0;

        // Deal community cards
        switch (this.phase) {
            case 'flop':
                this.communityCards = this.deck.deal(3);
                break;
            case 'turn':
                this.communityCards.push(...this.deck.deal(1));
                break;
            case 'river':
                this.communityCards.push(...this.deck.deal(1));
                break;
        }

        // Check if all active players are all-in
        const canAct = this.players.filter(p => {
            const ps = this.playerStates[p.id];
            return ps.isActive && !ps.folded && !ps.allIn;
        });

        if (canAct.length <= 1) {
            // Skip betting, advance to next phase
            this._advancePhase();
            return;
        }

        // Set current player to first after dealer
        const firstToAct = this._getPositionAfter(this.dealerIndex);
        if (firstToAct === -1) {
            this._advancePhase();
            return;
        }
        this.currentPlayerIndex = firstToAct;

        logger.info('POKER', `Phase: ${this.phase}, Community: ${this.communityCards.map(c => `${c.rank}${c.suit[0]}`).join(' ')}`);
    }

    _resolveWinner(winners) {
        this.phase = 'showdown';
        const winAmount = Math.floor(this.pot / winners.length);

        this.winners = winners.map(p => {
            this.playerStates[p.id].chips += winAmount;
            const evaluation = this.playerStates[p.id].holeCards.length >= 2 && this.communityCards.length >= 3
                ? evaluateBestHand([...this.playerStates[p.id].holeCards, ...this.communityCards])
                : { name: 'Winner by fold', ranking: 0 };
            return {
                playerId: p.id,
                name: p.name,
                chips: this.playerStates[p.id].chips,
                amount: winAmount,
                hand: evaluation.name,
            };
        });

        logger.info('POKER', `Winner: ${this.winners.map(w => w.name).join(', ')} wins ${this.pot}`);
    }

    _resolveShowdown() {
        const activePlayers = this.players.filter(p => {
            const ps = this.playerStates[p.id];
            return ps.isActive && !ps.folded;
        });

        const playersForEval = activePlayers.map(p => ({
            id: p.id,
            name: p.name,
            holeCards: this.playerStates[p.id].holeCards,
        }));

        const { winners, allResults } = determineWinners(playersForEval, this.communityCards);
        const winAmount = Math.floor(this.pot / winners.length);

        this.winners = winners.map(w => {
            this.playerStates[w.playerId].chips += winAmount;
            return {
                playerId: w.playerId,
                name: w.name,
                chips: this.playerStates[w.playerId].chips,
                amount: winAmount,
                hand: w.evaluation.name,
            };
        });

        // Store all results for display
        this.showdownResults = allResults.map(r => ({
            playerId: r.playerId,
            name: r.name,
            hand: r.evaluation.name,
            holeCards: this.playerStates[r.playerId].holeCards,
        }));

        logger.info('POKER', `Showdown! Winners: ${this.winners.map(w => `${w.name} (${w.hand})`).join(', ')}`);
    }

    getStateForPlayer(playerId) {
        const ps = this.playerStates[playerId];
        const currentPlayer = this.players[this.currentPlayerIndex];

        // Evaluate current hand for handicap/helper mode
        let myHandInfo = null;
        if (ps && ps.holeCards && ps.holeCards.length >= 2 && this.communityCards.length >= 3) {
            try {
                const allCards = [...ps.holeCards, ...this.communityCards];
                const evaluation = evaluateBestHand(allCards);
                myHandInfo = {
                    name: evaluation.name,
                    ranking: evaluation.ranking,
                };
            } catch (e) {
                // ignore evaluation errors
            }
        } else if (ps && ps.holeCards && ps.holeCards.length >= 2) {
            // Pre-flop: describe the hole cards
            const isPair = ps.holeCards[0].rank === ps.holeCards[1].rank;
            const isSuited = ps.holeCards[0].suit === ps.holeCards[1].suit;
            if (isPair) {
                myHandInfo = { name: `Pocket ${ps.holeCards[0].rank}s`, ranking: 0 };
            } else if (isSuited) {
                myHandInfo = { name: `${ps.holeCards[0].rank}-${ps.holeCards[1].rank} Suited`, ranking: 0 };
            } else {
                myHandInfo = { name: `${ps.holeCards[0].rank}-${ps.holeCards[1].rank} Off-suit`, ranking: 0 };
            }
        }

        return {
            phase: this.phase,
            pot: this.pot,
            communityCards: this.communityCards,
            currentBet: this.currentBet,
            handNumber: this.handNumber,
            dealerIndex: this.dealerIndex,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerId: currentPlayer ? currentPlayer.id : null,
            isMyTurn: currentPlayer && currentPlayer.id === playerId,
            myHandInfo,
            myState: ps ? {
                chips: ps.chips,
                holeCards: ps.holeCards,
                currentBet: ps.currentBet,
                folded: ps.folded,
                allIn: ps.allIn,
            } : null,
            players: this.players.map((p, i) => {
                const pState = this.playerStates[p.id];
                return {
                    id: p.id,
                    name: p.name,
                    isCPU: p.isCPU || false,
                    chips: pState.chips,
                    currentBet: pState.currentBet,
                    folded: pState.folded,
                    allIn: pState.allIn,
                    isActive: pState.isActive,
                    isDealer: i === this.dealerIndex,
                    isCurrent: i === this.currentPlayerIndex,
                    // Only show hole cards for the requesting player or at showdown
                    holeCards: (p.id === playerId || this.phase === 'showdown')
                        ? pState.holeCards
                        : pState.holeCards.map(() => ({ suit: 'hidden', rank: 'hidden' })),
                };
            }),
            winners: this.winners,
            showdownResults: this.phase === 'showdown' ? this.showdownResults : null,
        };
    }

    getFullState() {
        return {
            phase: this.phase,
            pot: this.pot,
            communityCards: this.communityCards,
            currentBet: this.currentBet,
            players: this.players.map((p, i) => ({
                ...p,
                ...this.playerStates[p.id],
                isDealer: i === this.dealerIndex,
                isCurrent: i === this.currentPlayerIndex,
            })),
            winners: this.winners,
        };
    }

    isRoundOver() {
        return this.phase === 'showdown';
    }

    /**
     * Start a new hand (called after showdown)
     */
    newHand() {
        // Remove players with 0 chips
        const remaining = this.players.filter(p => this.playerStates[p.id].chips > 0);
        if (remaining.length < 2) {
            this.status = 'finished';
            return false;
        }
        this._startNewHand();
        return true;
    }

    /**
     * Get CPU decision for the current player
     */
    getCPUAction() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer || !currentPlayer.isCPU) return null;

        const ps = this.playerStates[currentPlayer.id];
        const cpuAI = new CPUPlayer(currentPlayer.id, currentPlayer.name, currentPlayer.difficulty || 'medium');

        return cpuAI.decide({
            holeCards: ps.holeCards,
            communityCards: this.communityCards,
            currentBet: this.currentBet,
            myBet: ps.currentBet,
            myChips: ps.chips,
            pot: this.pot,
            phase: this.phase,
        });
    }
}

module.exports = { PokerGame };
