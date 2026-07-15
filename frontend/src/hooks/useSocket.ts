import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

/**
 * Підключається до Socket.IO після логіну й слухає real-time події.
 * - order:status  → інвалідовує кеш замовлень (покупець бачить новий статус)
 * - order:created → інвалідовує список (адмін бачить нове замовлення)
 */
export function useSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      socket?.disconnect();
      socket = null;
      return;
    }

    socket = io(import.meta.env.VITE_API_URL || '/', { auth: { token }, transports: ['websocket', 'polling'] });

    socket.on('order:status', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });
    socket.on('order:created', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token, queryClient]);
}
