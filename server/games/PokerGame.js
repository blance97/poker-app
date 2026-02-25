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
        this.roomId = options.roomId || 'unknown';
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
        this.bigBlindHasOption = false;
        this.winners = null;
        this.shownCards = {};
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

        // Escalate blinds every 8 hands
        if (this.handNumber > 1 && (this.handNumber - 1) % 8 === 0) {
            this.smallBlind = Math.round(this.smallBlind * 1.5 / 5) * 5 || 5;
            this.bigBlind = this.smallBlind * 2;
            this.blindsJustIncreased = true;
            logger.info('POKER', `[${this.roomId}] Blinds increased to ${this.smallBlind}/${this.bigBlind}`);
        } else {
            this.blindsJustIncreased = false;
        }

        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.pots = []; // Reset pots
        this._allContributions = {}; // cumulative chips per player across all streets
        this.currentBet = 0;
        this.lastRaiserIndex = -1;
        this.roundActions = 0;
        this.winners = null;
        this.shownCards = {};
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
        this.lastRaiserIndex = -1; // No raiser yet — BB gets their option
        this.bigBlindHasOption = true; // BB must still get a chance to raise

        logger.info('POKER', `[${this.roomId}] Hand #${this.handNumber} started. Dealer: ${this.players[this.dealerIndex].name}`);
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

        // If this player is the big blind acting for the first time, clear the option flag
        if (this.bigBlindHasOption) {
            this.bigBlindHasOption = false;
        }

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

    rebuy(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return { error: 'Player not in game' };

        const ps = this.playerStates[playerId];
        // Allow rebuy if chips <= 0
        if (ps.chips > 0) return { error: 'You still have chips!' };

        // Prevent rebuy if currently playing a hand (e.g. All-In)
        if (ps.isActive && !ps.folded) return { error: 'Wait for hand to finish!' };

        // Reset chips to starting amount
        ps.chips = this.startingChips;
        ps.folded = true; // Stay folded for current hand if active
        ps.allIn = false;
        ps.isActive = true; // Will be dealt in next hand

        logger.info('POKER', `[${this.roomId}] Player ${this.players[playerIndex].name} bought in for ${this.startingChips}`);

        return {
            success: true,
            chips: ps.chips,
            player: this.players[playerIndex].name
        };
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

        // Big blind still has their option to raise — round is NOT complete yet
        if (this.bigBlindHasOption) return false;

        // All active players must have matched the current bet
        const allMatched = activePlayers.every(p => {
            return this.playerStates[p.id].currentBet === this.currentBet;
        });

        if (!allMatched) return false;

        // Make sure everyone has had a chance to act
        // Check if we've come back around to the last raiser
        const nextPlayer = this._getPositionAfter(this.currentPlayerIndex);

        // If last raiser is defined
        if (this.lastRaiserIndex >= 0) {
            const raiserState = this.playerStates[this.players[this.lastRaiserIndex].id];
            // If raiser is all-in or folded, they won't act again. 
            // Since allMatched is true, everyone else has called the all-in/raise.
            if (raiserState.allIn || raiserState.folded) {
                return true;
            }

            // Standard check: if action is back to raiser
            if (nextPlayer === this.lastRaiserIndex && this.roundActions > 0) {
                return true;
            }
        }

        if (this.lastRaiserIndex < 0 && allMatched && this.roundActions >= activePlayers.length) {
            return true;
        }

        return false;
    }

    _revealRemainingCards() {
        // Fill community cards all the way to 5 (flop=3, turn=4, river=5)
        const needed = 5 - this.communityCards.length;
        if (needed > 0) {
            this.communityCards.push(...this.deck.deal(needed));
        }
    }

    _advancePhase() {
        // Distribute current bets into pots before resetting them
        this._distributeBetsToPots();

        const phaseIndex = PHASES.indexOf(this.phase);
        if (phaseIndex >= 3) {
            // After river, go to showdown — reveal all cards first
            this._revealRemainingCards();
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
        this.bigBlindHasOption = false; // Only relevant in preflop

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

        logger.info('POKER', `[${this.roomId}] Phase: ${this.phase}, Community: ${this.communityCards.map(c => `${c.rank}${c.suit[0]}`).join(' ')}`);
    }

    _distributeBetsToPots() {
        // Accumulate this street's bets into cumulative per-player totals
        if (!this._allContributions) this._allContributions = {};
        for (const p of this.players) {
            const ps = this.playerStates[p.id];
            if (ps.currentBet > 0) {
                this._allContributions[p.id] = (this._allContributions[p.id] || 0) + ps.currentBet;
            }
        }

        // Recalculate all pots from scratch using cumulative contributions.
        // This ensures one pot per all-in level regardless of how many streets
        // have been bet, eliminating spurious extra side pots.
        this.pots = this._recalcPotsFromContributions();
    }

    _recalcPotsFromContributions() {
        const contribs = this._allContributions || {};

        // Build per-player entries with total contributed, all-in flag, fold flag
        const entries = [];
        for (const p of this.players) {
            const ps = this.playerStates[p.id];
            const amount = contribs[p.id] || 0;
            if (amount > 0) {
                entries.push({ id: p.id, amount, isAllIn: ps.allIn, folded: ps.folded });
            }
        }

        if (entries.length === 0) return [];

        const maxContrib = Math.max(...entries.map(e => e.amount));

        // Split levels come from all-in players who contributed less than the max.
        // Folded players don't create split levels.
        const splitLevels = [...new Set(
            entries.filter(e => e.isAllIn && !e.folded && e.amount < maxContrib).map(e => e.amount)
        )].sort((a, b) => a - b);

        const pots = [];
        let prevLevel = 0;

        for (const level of splitLevels) {
            const segmentSize = level - prevLevel;
            const inSegment = entries.filter(e => e.amount > prevLevel);
            const potAmount = inSegment.reduce((sum, e) => sum + Math.min(e.amount - prevLevel, segmentSize), 0);
            // Only non-folded players are eligible to win this pot
            const eligible = inSegment.filter(e => !e.folded).map(e => e.id);

            pots.push({ amount: potAmount, contributors: eligible, winners: [] });
            prevLevel = level;
        }

        // Final pot: everything above the last split level
        const finalEntries = entries.filter(e => e.amount > prevLevel);
        const finalAmount = finalEntries.reduce((sum, e) => sum + (e.amount - prevLevel), 0);
        const finalEligible = finalEntries.filter(e => !e.folded).map(e => e.id);

        if (finalAmount > 0) {
            pots.push({ amount: finalAmount, contributors: finalEligible, winners: [] });
        }

        return pots;
    }

    _resolveWinner(winners) {
        // Reveal all remaining community cards before ending the hand
        this._revealRemainingCards();

        this.phase = 'showdown';
        // If only one player remains, they win the entire pot (which is the sum of all current bets)
        // This is a special case where no showdown evaluation is needed.
        // We need to ensure the pot is correctly calculated from current bets.

        // First, distribute current bets into pots
        this._distributeBetsToPots();

        // Clear any showdown results from previous hands so they don't bleed through
        this.showdownResults = [];

        // Now, resolve the pots. Since there's only one winner, they take all.
        const winnerPlayer = winners[0];
        let totalWinAmount = 0;

        for (const pot of this.pots) {
            if (pot.contributors.includes(winnerPlayer.id)) {
                totalWinAmount += pot.amount;
                pot.winners.push({
                    playerId: winnerPlayer.id,
                    name: winnerPlayer.name,
                    hand: 'Winner by fold',
                    amount: pot.amount
                });
            }
        }

        this.playerStates[winnerPlayer.id].chips += totalWinAmount;

        this.winners = [{
            playerId: winnerPlayer.id,
            name: winnerPlayer.name,
            chips: this.playerStates[winnerPlayer.id].chips,
            amount: totalWinAmount,
            hand: 'Winner by fold',
        }];

        // CPUs automatically show their hole cards
        for (const p of this.players) {
            if (p.isCPU && this.playerStates[p.id].holeCards.length > 0) {
                this.shownCards[p.id] = this.playerStates[p.id].holeCards;
            }
        }

        logger.info('POKER', `[${this.roomId}] Winner: ${this.winners.map(w => w.name).join(', ')} wins ${totalWinAmount}`);
    }

    showCards(playerId) {
        const pState = this.playerStates[playerId];
        if (!pState || !pState.holeCards || pState.holeCards.length === 0) return false;
        this.shownCards[playerId] = pState.holeCards;
        return true;
    }

    _resolveShowdown() {
        // If we have no pots (e.g. everyone checked preflop?), use main pot logic or treat existing 'pot' as one
        if (this.pots.length === 0 && this.pot > 0) {
            // Should not happen if _distributeBetsToPots is called, but fallback
            const activePlayers = this.players.filter(p => {
                const ps = this.playerStates[p.id];
                return ps.isActive && !ps.folded;
            });
            this.pots.push({
                amount: this.pot,
                contributors: activePlayers.map(p => p.id),
                winners: []
            });
        }

        const activePlayersMap = {};
        this.players.forEach(p => {
            const ps = this.playerStates[p.id];
            if (ps.isActive && !ps.folded) {
                activePlayersMap[p.id] = p;
            }
        });

        this.winners = [];
        this.showdownResults = []; // Flattened results for UI
        const handledPlayers = new Set(); // To avoid dupes in winners list if winning multiple pots

        // Resolve each pot
        for (const pot of this.pots) {
            if (pot.amount === 0) continue;

            const eligible = pot.contributors.filter(id => activePlayersMap[id]);
            if (eligible.length === 0) continue; // Should not happen if pot has chips

            // If only one, they win
            if (eligible.length === 1) {
                const winnerId = eligible[0];
                this.playerStates[winnerId].chips += pot.amount;
                pot.winners = [{ playerId: winnerId, name: activePlayersMap[winnerId].name, hand: 'Winner', amount: pot.amount }];

                // Add to main winners list for UI
                const existing = this.winners.find(x => x.playerId === winnerId);
                if (existing) {
                    existing.amount += pot.amount;
                } else {
                    this.winners.push({
                        playerId: winnerId,
                        name: activePlayersMap[winnerId].name,
                        chips: this.playerStates[winnerId].chips,
                        amount: pot.amount,
                        hand: 'Winner by fold' // Or just 'Winner'
                    });
                }
                continue;
            }

            // Evaluate hands
            const playersForEval = eligible.map(id => ({
                id: id,
                name: activePlayersMap[id].name,
                holeCards: this.playerStates[id].holeCards,
            }));

            const { winners, allResults } = determineWinners(playersForEval, this.communityCards);
            const winAmount = Math.floor(pot.amount / winners.length);
            const remainder = pot.amount % winners.length;

            // Update winners
            // Distribute chips
            winners.forEach((w, idx) => {
                const extra = idx < remainder ? 1 : 0;
                const totalWin = winAmount + extra;
                this.playerStates[w.playerId].chips += totalWin;

                pot.winners.push({
                    playerId: w.playerId,
                    name: w.name,
                    hand: w.evaluation.name,
                    amount: totalWin
                });
            });

            // Add to main winners list for UI (aggregating amounts)
            winners.forEach(w => {
                const existing = this.winners.find(x => x.playerId === w.playerId);
                const potWin = pot.winners.find(pw => pw.playerId === w.playerId);
                if (existing) {
                    existing.amount += potWin.amount;
                } else {
                    this.winners.push({
                        playerId: w.playerId,
                        name: w.name,
                        chips: this.playerStates[w.playerId].chips,
                        amount: potWin.amount,
                        hand: potWin.hand // Use the hand from the pot win
                    });
                }
            });

            // Collect all results
            allResults.forEach(r => {
                const existing = this.showdownResults.find(x => x.playerId === r.playerId);
                if (!existing) {
                    this.showdownResults.push({
                        playerId: r.playerId,
                        name: r.name,
                        hand: r.evaluation.name,
                        holeCards: this.playerStates[r.playerId].holeCards,
                    });
                }
            });
        }

        logger.info('POKER', `[${this.roomId}] Showdown! Winners: ${this.winners.map(w => `${w.name} (${w.amount})`).join(', ')}`);
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
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            blindsJustIncreased: this.blindsJustIncreased || false,
            pots: this.pots.map(p => ({
                amount: p.amount,
                contributors: p.contributors,
                winners: p.winners
            })),
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
                    avatar: p.avatar || 'default',
                    winAnimation: p.winAnimation || (p.isCPU ? 'robot' : 'confetti'),
                    isCPU: p.isCPU || false,
                    personality: p.personality || null,
                    chips: pState.chips,
                    currentBet: pState.currentBet,
                    folded: pState.folded,
                    allIn: pState.allIn,
                    isActive: pState.isActive,
                    isDealer: i === this.dealerIndex,
                    isCurrent: i === this.currentPlayerIndex,
                    // Show hole cards for: requesting player, at showdown, or winners (reveal on fold-win too)
                    holeCards: (p.id === playerId || this.phase === 'showdown' ||
                        (this.winners && this.winners.some(w => w.playerId === p.id)))
                        ? pState.holeCards
                        : pState.holeCards.map(() => ({ suit: 'hidden', rank: 'hidden' })),
                };
            }),
            gameOver: this.status === 'finished',
            winners: this.winners,
            showdownResults: this.phase === 'showdown' ? this.showdownResults : null,
            shownCards: Object.entries(this.shownCards || {}).map(([pid, cards]) => {
                const p = this.players.find(pl => pl.id === pid);
                return { playerId: pid, name: p ? p.name : 'Unknown', holeCards: cards };
            }),
        };
    }

    getFullState() {
        return {
            phase: this.phase,
            pot: this.pot,
            pots: this.pots,
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
     * Remove a player (CPU) from an in-progress game.
     * They are folded immediately and removed from future hands.
     * Uses splice so the shared room.players reference stays consistent.
     */
    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return false;

        const ps = this.playerStates[playerId];
        const wasCurrentPlayer = playerIndex === this.currentPlayerIndex;

        // Fold them out of the current hand first
        if (ps) {
            ps.folded = true;
            ps.isActive = false;
        }

        // Remove from the shared players array (affects room.players too via reference)
        this.players.splice(playerIndex, 1);
        delete this.playerStates[playerId];

        // Fix indices after the splice
        if (this.dealerIndex > playerIndex) this.dealerIndex--;
        if (this.dealerIndex >= this.players.length && this.players.length > 0) this.dealerIndex = 0;

        if (!wasCurrentPlayer && this.currentPlayerIndex > playerIndex) this.currentPlayerIndex--;
        if (this.currentPlayerIndex >= this.players.length) this.currentPlayerIndex = 0;

        // If it was their turn, advance the game
        if (wasCurrentPlayer && this.phase !== 'showdown' && this.phase !== 'waiting' && this.players.length > 0) {
            this._advanceGame();
        }

        logger.info('POKER', `[${this.roomId}] Player removed from game`);
        return true;
    }

    /**
     * Add a player to an in-progress game. They sit out the current hand
     * and are dealt in starting from the next one.
     *
     * NOTE: room.players and game.players share the same array reference
     * (set in BaseGame constructor), so joinRoom() already pushed the player
     * into this.players. We only need to create the playerState here.
     */
    addPlayer(player) {
        if (this.playerStates[player.id]) return false; // Already fully registered

        // Ensure player is in this.players (handles standalone addPlayer calls)
        if (!this.players.find(p => p.id === player.id)) {
            this.players.push(player);
        }

        this.playerStates[player.id] = {
            chips: this.startingChips,
            holeCards: [],
            currentBet: 0,
            totalBetThisRound: 0,
            folded: true,   // sits out current hand
            allIn: false,
            isActive: true, // dealt in next hand
        };
        logger.info('POKER', `[${this.roomId}] Player ${player.name} joined mid-game`);
        return true;
    }

    /**
     * Get CPU decision for the current player
     */
    getCPUAction() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer || !currentPlayer.isCPU) return null;

        const ps = this.playerStates[currentPlayer.id];
        const cpuAI = new CPUPlayer(currentPlayer.id, currentPlayer.name, currentPlayer.difficulty || 'medium', currentPlayer.personality || 'balanced');

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
