// client/src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3001' : undefined;

export function useSocket() {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [player, setPlayer] = useState(null);

    useEffect(() => {
        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            setConnected(true);
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
        };
    }, []);

    const setName = useCallback((name) => {
        return new Promise((resolve) => {
            socketRef.current?.emit('player:setName', name, (result) => {
                setPlayer(result);
                resolve(result);
            });
        });
    }, []);

    const reconnect = useCallback((name, roomId) => {
        return new Promise((resolve, reject) => {
            socketRef.current?.emit('player:reconnect', { name, roomId }, (result) => {
                if (result) {
                    setPlayer({ id: result.id, name: result.name });
                    resolve(result);
                } else {
                    reject(new Error('Reconnect failed'));
                }
            });
        });
    }, []);

    const emit = useCallback((event, data) => {
        return new Promise((resolve) => {
            socketRef.current?.emit(event, data, (result) => {
                resolve(result);
            });
        });
    }, []);

    const on = useCallback((event, handler) => {
        socketRef.current?.on(event, handler);
        return () => socketRef.current?.off(event, handler);
    }, []);

    const off = useCallback((event, handler) => {
        socketRef.current?.off(event, handler);
    }, []);

    return { socket: socketRef.current, connected, player, setName, reconnect, emit, on, off };
}
