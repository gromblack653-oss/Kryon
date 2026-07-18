import { query } from '../../db/pool';
import { User, UserRole } from '../../types';

interface UserRow extends User {
  password_hash: string;
}

export const userRepository = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const rows = await query<User>('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async create(input: { email: string; passwordHash: string; name: string; role?: UserRole }): Promise<User> {
    const rows = await query<User>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, COALESCE($4, 'customer'))
       RETURNING id, email, name, role, created_at`,
      [input.email, input.passwordHash, input.name, input.role ?? null],
    );
    return rows[0];
  },
};
