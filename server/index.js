// server/index.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { RoomManager } = require('./roomManager');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://poker.lancedinh.com',
        ],
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public')));
}

const roomManager = new RoomManager();

// Track connected players
const connectedPlayers = new Map(); // socketId -> { id, name, roomId }
const disconnectTimeouts = new Map(); // `name_roomId` -> timeout handle

// REST endpoint for room listing
app.get('/api/rooms', (req, res) => {
    res.json(roomManager.listRooms());
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', players: connectedPlayers.size });
});

// Socket.IO
io.on('connection', (socket) => {
    logger.info('SOCKET', `Client connected: ${socket.id}`);

    // Player sets their name
    socket.on('player:setName', (name, callback) => {
        const playerId = socket.id;
        connectedPlayers.set(socket.id, { id: playerId, name, roomId: null });
        logger.info('SOCKET', `Player registered: ${name} (${playerId})`);
        callback({ id: playerId, name });
    });

    // Player reconnects after a page refresh
    socket.on('player:reconnect', ({ name, roomId }, callback) => {
        const playerId = socket.id;
        connectedPlayers.set(socket.id, { id: playerId, name, roomId });
        logger.info('SOCKET', `Player reconnecting: ${name} (${playerId}) to room ${roomId}`);

        if (roomId) {
            // Clear any pending disconnect timeout for this player name
            const timeoutKey = `${name}_${roomId}`;
            if (disconnectTimeouts.has(timeoutKey)) {
                clearTimeout(disconnectTimeouts.get(timeoutKey));
                disconnectTimeouts.delete(timeoutKey);
            }

            const result = roomManager.reconnectPlayer(roomId, name, playerId);
            if (result.error) {
                // Room or player gone — send them to lobby
                connectedPlayers.get(socket.id).roomId = null;
                callback({ id: playerId, name, roomId: null, view: 'lobby' });
                return;
            }

            socket.join(roomId);
            const gameState = roomManager.getGameState(roomId, playerId);
            const view = gameState ? 'game' : 'lobby';
            callback({ id: playerId, name, roomId, view, room: result.room });

            // Broadcast updated state to all
            if (gameState) {
                broadcastGameState(roomId);
            }
        } else {
            callback({ id: playerId, name, roomId: null, view: 'lobby' });
        }
    });

    // Room operations
    socket.on('room:create', (data, callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return callback({ error: 'Not registered' });

        const result = roomManager.createRoom(data.name, player, data.options || {});
        if (result.error) return callback(result);

        player.roomId = result.room.id;
        socket.join(result.room.id);
        callback(result);
        io.emit('rooms:updated', roomManager.listRooms());
    });

    socket.on('room:join', (roomId, callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return callback({ error: 'Not registered' });

        // Leave current room if in one
        if (player.roomId) {
            socket.leave(player.roomId);
            roomManager.leaveRoom(player.roomId, player.id);
        }

        const result = roomManager.joinRoom(roomId, player);
        if (result.error) return callback(result);

        player.roomId = roomId;
        socket.join(roomId);
        callback(result);
        io.to(roomId).emit('room:updated', result.room);
        io.emit('rooms:updated', roomManager.listRooms());
    });

    socket.on('room:leave', (callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return callback?.({ error: 'Not in a room' });

        const roomId = player.roomId;
        const result = roomManager.leaveRoom(roomId, player.id);
        socket.leave(roomId);
        player.roomId = null;

        if (!result.deleted) {
            io.to(roomId).emit('room:updated', result.room);
        }
        callback?.(result);
        io.emit('rooms:updated', roomManager.listRooms());
    });

    socket.on('room:addCPU', (data, callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return callback({ error: 'Not in a room' });

        const result = roomManager.addCPU(player.roomId, data?.difficulty || 'medium');
        if (result.error) return callback(result);

        callback(result);
        io.to(player.roomId).emit('room:updated', result.room);
        io.emit('rooms:updated', roomManager.listRooms());
    });

    socket.on('room:removeCPU', (cpuId, callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return callback({ error: 'Not in a room' });

        const result = roomManager.removeCPU(player.roomId, cpuId);
        if (result.error) return callback(result);

        callback(result);
        io.to(player.roomId).emit('room:updated', result.room);
    });

    // Game operations
    socket.on('game:start', (callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return callback({ error: 'Not in a room' });

        const result = roomManager.startGame(player.roomId, player.id);
        if (result.error) return callback(result);

        callback(result);

        // Send game state to each player
        broadcastGameState(player.roomId);

        // Process CPU turns if needed
        setTimeout(() => processCPUTurns(player.roomId), 1000);
    });

    socket.on('game:action', (action, callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return callback({ error: 'Not in a room' });

        const result = roomManager.handleGameAction(player.roomId, player.id, action);
        if (result.error) return callback({ error: result.error });

        callback(result);

        // Broadcast the action to all players
        io.to(player.roomId).emit('game:actionTaken', {
            playerId: player.id,
            playerName: player.name,
            action: action.action,
            amount: action.amount,
        });

        broadcastGameState(player.roomId);

        if (result.isRoundOver) {
            // Wait then allow new hand
            setTimeout(() => {
                io.to(player.roomId).emit('game:roundOver');
            }, 500);
        } else {
            // Process CPU turns
            setTimeout(() => processCPUTurns(player.roomId), 1200);
        }
    });

    socket.on('game:newHand', (callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return callback({ error: 'Not in a room' });

        const result = roomManager.newHand(player.roomId);
        if (result.error) return callback(result);

        callback(result);
        broadcastGameState(player.roomId);

        if (result.success) {
            setTimeout(() => processCPUTurns(player.roomId), 1000);
        }
    });

    socket.on('game:getState', (callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return callback({ error: 'Not in a room' });

        const state = roomManager.getGameState(player.roomId, player.id);
        callback({ state });
    });

    socket.on('game:rebuy', (callback) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return callback({ error: 'Not in a room' });

        const { result, room } = roomManager.rebuy(player.roomId, player.id);

        if (result.error) {
            return callback({ error: result.error });
        }

        callback({ success: true, chips: result.chips });

        // Announce rebuy
        roomManager.addMessage(player.roomId, 'system', 'System', `${player.name} bought back in!`);
        io.to(player.roomId).emit('chat:message', {
            playerId: 'system',
            playerName: 'System',
            text: `${player.name} bought back in!`,
            timestamp: Date.now(),
        });

        broadcastGameState(player.roomId);
    });

    // Chat
    socket.on('chat:message', (text) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || !player.roomId) return;

        roomManager.addMessage(player.roomId, player.id, player.name, text);
        io.to(player.roomId).emit('chat:message', {
            playerId: player.id,
            playerName: player.name,
            text,
            timestamp: Date.now(),
        });
    });

    // Disconnect — use grace period so quick refreshes don't remove the player
    socket.on('disconnect', () => {
        const player = connectedPlayers.get(socket.id);
        if (player && player.roomId) {
            const timeoutKey = `${player.name}_${player.roomId}`;
            const roomId = player.roomId;
            const playerId = player.id;
            // Give 10 seconds for reconnection before removing from room
            const timeout = setTimeout(() => {
                const room = roomManager.getRoom(roomId);
                if (room) {
                    const result = roomManager.leaveRoom(roomId, playerId);
                    if (result.deleted) {
                        logger.info('ROOM', `Room cleaned up after player disconnect`);
                    } else {
                        // Check if only CPUs remain — if so, delete the room
                        const humanPlayers = result.room.players.filter(p => !p.isCPU);
                        if (humanPlayers.length === 0) {
                            roomManager.deleteRoom(roomId);
                            logger.info('ROOM', `Room deleted — no human players remaining`);
                        } else {
                            io.to(roomId).emit('room:updated', result.room);
                        }
                    }
                    io.emit('rooms:updated', roomManager.listRooms());
                }
                disconnectTimeouts.delete(timeoutKey);
            }, 10000);
            disconnectTimeouts.set(timeoutKey, timeout);
        }
        connectedPlayers.delete(socket.id);
        logger.info('SOCKET', `Client disconnected: ${socket.id}`);
    });
});

// Helpers
function broadcastGameState(roomId) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return;

    for (const socketId of room) {
        const player = connectedPlayers.get(socketId);
        if (player) {
            const state = roomManager.getGameState(roomId, player.id);
            io.to(socketId).emit('game:stateUpdate', state);
        }
    }
}

function processCPUTurns(roomId) {
    const cpuAction = roomManager.getCPUAction(roomId);
    if (!cpuAction) return;

    // Get current game state to find CPU player
    const state = roomManager.getGameState(roomId, 'spectator');
    if (!state) return;

    const cpuPlayer = state.players[state.currentPlayerIndex];
    if (!cpuPlayer || !cpuPlayer.isCPU) return;

    const result = roomManager.handleGameAction(roomId, cpuPlayer.id, cpuAction);

    // Broadcast the CPU action
    io.to(roomId).emit('game:actionTaken', {
        playerId: cpuPlayer.id,
        playerName: cpuPlayer.name,
        action: cpuAction.action,
        amount: cpuAction.amount,
        isCPU: true,
    });

    broadcastGameState(roomId);

    if (result.isRoundOver) {
        setTimeout(() => {
            io.to(roomId).emit('game:roundOver');
        }, 500);
    } else {
        // Continue processing CPU turns
        setTimeout(() => processCPUTurns(roomId), 1200);
    }
}

// SPA catch-all — serve client for any non-API route in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    logger.info('SERVER', `Poker server running on port ${PORT}`);
});
