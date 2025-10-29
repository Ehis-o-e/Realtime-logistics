import { useEffect, useState } from 'react';
import { io,  Socket } from 'socket.io-client';

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
            transports: ['websocket'],
        });

        socketInstance.on('connect', () => {
            console.log('Websocket connected: ', socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Websocket disconnected');
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);
    
    return { socket, isConnected };

}