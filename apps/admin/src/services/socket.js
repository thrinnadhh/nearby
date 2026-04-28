import { io } from 'socket.io-client';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
let socketInstance = null;
export function connectSocket(token) {
    if (socketInstance) {
        return socketInstance;
    }
    socketInstance = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    });
    socketInstance.on('connect', () => {
        socketInstance?.emit('admin:join');
    });
    return socketInstance;
}
export function disconnectSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}
export function getSocket() {
    return socketInstance;
}
export function onOrderUpdated(callback) {
    if (socketInstance) {
        socketInstance.on('order:updated', callback);
    }
}
export function onOrderStuckAlert(callback) {
    if (socketInstance) {
        socketInstance.on('order:stuck-alert', callback);
    }
}
export function offOrderUpdated(callback) {
    if (socketInstance) {
        socketInstance.off('order:updated', callback);
    }
}
export function offOrderStuckAlert(callback) {
    if (socketInstance) {
        socketInstance.off('order:stuck-alert', callback);
    }
}
//# sourceMappingURL=socket.js.map