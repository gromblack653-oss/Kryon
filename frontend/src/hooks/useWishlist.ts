import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';

export function useWishlist() {
  const user = useAuthStore((s) => s.user);
  const enabled = user?.role === 'customer';
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.list,
    enabled,
  });

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      const inList = data?.ids.includes(productId);
      return inList ? wishlistApi.remove(productId) : wishlistApi.add(productId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  return {
    enabled,
    items: data?.items ?? [],
    ids: data?.ids ?? [],
    count: data?.ids.length ?? 0,
    has: (id: string) => data?.ids.includes(id) ?? false,
    toggle: (id: string) => enabled && toggle.mutate(id),
    isPending: toggle.isPending,
  };
}
