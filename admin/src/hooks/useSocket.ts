import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

/**
 * Real-time для адміна: нове замовлення → інвалідація списків/статистики.
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

    socket = io(import.meta.env.VITE_API_URL || '/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    };
    socket.on('order:created', refresh);
    socket.on('order:status', refresh);

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token, queryClient]);
}
