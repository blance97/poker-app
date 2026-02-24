// server/roomManager.js
const { PokerGame } = require('./games/PokerGame');
const logger = require('./utils/logger');

// Game type registry — add new games here
const GAME_TYPES = {
    poker: PokerGame,
    // blackjack: BlackjackGame, // future
};

let cpuIdCounter = 0;

class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    createRoom(name, hostPlayer, options = {}) {
        const roomId = this._generateId();
        const gameType = options.gameType || 'poker';

        if (!GAME_TYPES[gameType]) {
            return { error: `Unknown game type: ${gameType}` };
        }

        const room = {
            id: roomId,
            name: name || `Room ${roomId.slice(0, 4)}`,
            hostId: hostPlayer.id,
            gameType,
            status: 'waiting', // waiting | playing | finished
            maxPlayers: options.maxPlayers || 8,
            players: [{ id: hostPlayer.id, name: hostPlayer.name, avatar: hostPlayer.avatar || 'default', winAnimation: hostPlayer.winAnimation || 'confetti', isCPU: false }],
            game: null,
            options: {
                smallBlind: options.smallBlind || 10,
                bigBlind: options.bigBlind || 20,
                startingChips: options.startingChips || 1000,
            },
            messages: [],
            createdAt: Date.now(),
        };

        this.rooms.set(roomId, room);
        logger.info('ROOM', `Room "${room.name}" created by ${hostPlayer.name} (${gameType})`);
        return { room: this._sanitizeRoom(room) };
    }

    joinRoom(roomId, player) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };
        if (room.status === 'finished') return { error: 'Game has ended' };
        if (room.players.find(p => p.id === player.id)) return { error: 'Already in room' };

        // If a non-CPU player with the same name is already here (e.g. disconnected and
        // rejoining before the 10s timeout clears them), treat it as a mid-join reconnect
        const sameNameEntry = room.players.find(p => p.name === player.name && !p.isCPU && p.id !== player.id);
        if (sameNameEntry && room.game) {
            const oldId = sameNameEntry.id;
            sameNameEntry.id = player.id;
            if (room.hostId === oldId) room.hostId = player.id;

            const gamePlayer = room.game.players.find(p => p.id === oldId);
            if (gamePlayer) gamePlayer.id = player.id;
            if (room.game.playerStates[oldId]) {
                room.game.playerStates[player.id] = room.game.playerStates[oldId];
                delete room.game.playerStates[oldId];
            }
            logger.info('ROOM', `${player.name} reconnected to room "${room.name}" via join`);
            return { room: this._sanitizeRoom(room) };
        }

        if (room.players.length >= room.maxPlayers) return { error: 'Room is full' };

        const roomPlayer = { id: player.id, name: player.name, avatar: player.avatar || 'default', winAnimation: player.winAnimation || 'confetti', isCPU: false };
        room.players.push(roomPlayer);

        // If game is in progress, create playerState (room.players and game.players share
        // the same array reference, so push above already added them to game.players)
        if (room.game) {
            room.game.addPlayer(roomPlayer);
        }
        logger.info('ROOM', `${player.name} joined room "${room.name}"`);
        return { room: this._sanitizeRoom(room) };
    }

    /**
     * Reconnect a player to their room after a page refresh.
     * Updates the player's ID from oldId to newId in both the room and the game state.
     */
    reconnectPlayer(roomId, oldPlayerName, newId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        // Find the player by name (since old socket IDs are gone after disconnect)
        const playerEntry = room.players.find(p => p.name === oldPlayerName && !p.isCPU);
        if (!playerEntry) return { error: 'Player not found in room' };

        const oldId = playerEntry.id;
        playerEntry.id = newId;

        // Update host if needed
        if (room.hostId === oldId) {
            room.hostId = newId;
        }

        // Update game state if a game is in progress
        if (room.game && room.game.playerStates) {
            // Update player ID in the players array
            const gamePlayer = room.game.players.find(p => p.id === oldId);
            if (gamePlayer) {
                gamePlayer.id = newId;
            }

            // Move player state to new ID
            if (room.game.playerStates[oldId]) {
                room.game.playerStates[newId] = room.game.playerStates[oldId];
                delete room.game.playerStates[oldId];
            }
        }

        logger.info('ROOM', `Player "${oldPlayerName}" reconnected to room "${room.name}" (${oldId} -> ${newId})`);
        return { room: this._sanitizeRoom(room), reconnected: true };
    }

    leaveRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        room.players = room.players.filter(p => p.id !== playerId);

        // If the host left, assign new host or delete the room
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            logger.info('ROOM', `Room "${room.name}" deleted (empty)`);
            return { deleted: true };
        }

        if (room.hostId === playerId) {
            const humanPlayers = room.players.filter(p => !p.isCPU);
            room.hostId = humanPlayers.length > 0 ? humanPlayers[0].id : room.players[0].id;
        }

        return { room: this._sanitizeRoom(room) };
    }

    addCPU(roomId, difficulty = 'medium') {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };
        if (room.players.length >= room.maxPlayers) return { error: 'Room is full' };

        cpuIdCounter++;
        const cpuNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta', 'Bot Epsilon', 'Bot Zeta', 'Bot Eta', 'Bot Theta'];
        const cpuCount = room.players.filter(p => p.isCPU).length;
        const cpuName = cpuNames[cpuCount % cpuNames.length];

        const cpuPlayer = {
            id: `cpu_${cpuIdCounter}`,
            name: cpuName,
            isCPU: true,
            avatar: 'default',
            winAnimation: 'lightning',
            difficulty,
        };

        room.players.push(cpuPlayer);
        logger.info('ROOM', `CPU "${cpuName}" (${difficulty}) added to room "${room.name}"`);
        return { room: this._sanitizeRoom(room), cpuPlayer };
    }

    removeCPU(roomId, cpuId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        if (room.game) {
            // Use splice via game.removePlayer to keep the shared array reference intact
            room.game.removePlayer(cpuId);
        } else {
            room.players = room.players.filter(p => p.id !== cpuId);
        }
        return { room: this._sanitizeRoom(room) };
    }

    startGame(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };
        if (room.hostId !== playerId) return { error: 'Only the host can start the game' };
        if (room.players.length < 2) return { error: 'Need at least 2 players' };

        const GameClass = GAME_TYPES[room.gameType];
        room.game = new GameClass(room.players, { ...room.options, roomId });
        room.game.start();
        room.status = 'playing';

        logger.info('ROOM', `Game started in room "${room.name}" with ${room.players.length} players`);
        return { room: this._sanitizeRoom(room) };
    }

    handleGameAction(roomId, playerId, action) {
        const room = this.rooms.get(roomId);
        if (!room || !room.game) return { error: 'No active game' };

        const result = room.game.handleAction(playerId, action);
        return { result, isRoundOver: room.game.isRoundOver() };
    }

    newHand(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || !room.game) return { error: 'No active game' };

        const success = room.game.newHand();
        if (!success) {
            room.status = 'finished';
            return { success: false, error: 'Game over - not enough players with chips', room: this._sanitizeRoom(room) };
        }
        return { success: true, room: this._sanitizeRoom(room) };
    }

    rebuy(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room || !room.game) return { error: 'No active game' };

        const result = room.game.rebuy(playerId);
        return { result, room: this._sanitizeRoom(room) };
    }

    getGameState(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room || !room.game) return null;
        return room.game.getStateForPlayer(playerId);
    }

    showCards(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room || !room.game) return { error: 'No active game' };
        const success = room.game.showCards(playerId);
        if (!success) return { error: 'Cannot show cards' };
        return { success: true };
    }

    getCPUAction(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || !room.game) return null;
        return room.game.getCPUAction();
    }

    getRoom(roomId) {
        const room = this.rooms.get(roomId);
        return room ? this._sanitizeRoom(room) : null;
    }

    deleteRoom(roomId) {
        this.rooms.delete(roomId);
    }

    listRooms() {
        return Array.from(this.rooms.values()).map(r => this._sanitizeRoom(r));
    }

    addMessage(roomId, playerId, playerName, text) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.messages.push({ playerId, playerName, text, timestamp: Date.now() });
        // Keep last 100 messages
        if (room.messages.length > 100) room.messages = room.messages.slice(-100);
    }

    getMessages(roomId) {
        const room = this.rooms.get(roomId);
        return room ? room.messages : [];
    }

    _sanitizeRoom(room) {
        return {
            id: room.id,
            name: room.name,
            hostId: room.hostId,
            gameType: room.gameType,
            status: room.status,
            maxPlayers: room.maxPlayers,
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar || 'default',
                winAnimation: p.winAnimation || (p.isCPU ? 'lightning' : 'confetti'),
                isCPU: p.isCPU || false,
                difficulty: p.difficulty,
            })),
            playerCount: room.players.length,
            createdAt: room.createdAt,
        };
    }

    _generateId() {
        return Math.random().toString(36).substring(2, 10);
    }
}

module.exports = { RoomManager, GAME_TYPES };
