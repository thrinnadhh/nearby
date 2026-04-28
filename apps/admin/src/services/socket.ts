import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socketInstance: Socket | null = null;

export function connectSocket(token: string): Socket {
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

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function getSocket(): Socket | null {
  return socketInstance;
}

export function onOrderUpdated(
  callback: (data: Record<string, unknown>) => void,
): void {
  if (socketInstance) {
    socketInstance.on('order:updated', callback);
  }
}

export function onOrderStuckAlert(
  callback: (data: Record<string, unknown>) => void,
): void {
  if (socketInstance) {
    socketInstance.on('order:stuck-alert', callback);
  }
}

export function offOrderUpdated(
  callback: (data: Record<string, unknown>) => void,
): void {
  if (socketInstance) {
    socketInstance.off('order:updated', callback);
  }
}

export function offOrderStuckAlert(
  callback: (data: Record<string, unknown>) => void,
): void {
  if (socketInstance) {
    socketInstance.off('order:stuck-alert', callback);
  }
}
