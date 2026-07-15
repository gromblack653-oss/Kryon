import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import type { CallLog } from '../types';

let socket: Socket | null = null;

/**
 * Слухає події АТС по активному дзвінку: «відповіли», «завершено» тощо.
 * Саме звідси панель дзвінка дізнається результат — оператор нічого не вводить.
 */
export function useCallSocket(onUpdate: (call: CallLog) => void): void {
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;

    socket = io(import.meta.env.VITE_API_URL || '/', { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('call:update', onUpdate);

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token, onUpdate]);
}
