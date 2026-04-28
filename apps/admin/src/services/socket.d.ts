import { Socket } from 'socket.io-client';
export declare function connectSocket(token: string): Socket;
export declare function disconnectSocket(): void;
export declare function getSocket(): Socket | null;
export declare function onOrderUpdated(callback: (data: Record<string, unknown>) => void): void;
export declare function onOrderStuckAlert(callback: (data: Record<string, unknown>) => void): void;
export declare function offOrderUpdated(callback: (data: Record<string, unknown>) => void): void;
export declare function offOrderStuckAlert(callback: (data: Record<string, unknown>) => void): void;
//# sourceMappingURL=socket.d.ts.map