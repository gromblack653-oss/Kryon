export type UserRole = 'admin' | 'customer' | 'agent';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  created_at: string;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
