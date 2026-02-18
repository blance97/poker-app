// server/games/BaseGame.js

/**
 * Abstract base class for all card games.
 * Extend this to create new game types (Poker, Blackjack, etc.)
 */
class BaseGame {
    constructor(players, options = {}) {
        if (new.target === BaseGame) {
            throw new Error('BaseGame is abstract and cannot be instantiated directly');
        }
        this.players = players; // Array of { id, name, chips, isCPU, ... }
        this.options = options;
        this.status = 'waiting'; // waiting | playing | finished
        this.round = 0;
    }

    /** Start the game / deal a new round */
    start() {
        throw new Error('start() must be implemented by subclass');
    }

    /** Handle a player action (e.g., bet, fold, hit, stand) */
    handleAction(playerId, action) {
        throw new Error('handleAction() must be implemented by subclass');
    }

    /**
     * Get the game state sanitized for a specific player
     * (hide other players' hole cards, etc.)
     */
    getStateForPlayer(playerId) {
        throw new Error('getStateForPlayer() must be implemented by subclass');
    }

    /** Get the full game state (for spectators or game-over reveal) */
    getFullState() {
        throw new Error('getFullState() must be implemented by subclass');
    }

    /** Check if the game/round is over */
    isRoundOver() {
        throw new Error('isRoundOver() must be implemented by subclass');
    }

    /** Get the game type name */
    static getGameType() {
        throw new Error('getGameType() must be implemented by subclass');
    }
}

module.exports = { BaseGame };
