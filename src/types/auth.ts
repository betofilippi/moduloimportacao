import { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'user' | 'viewer';

export interface UserMetadata {
  nome_completo: string;
  telefone?: string;
  id_empresa?: string;
  role: UserRole;
}

export interface AuthUser extends User {
  user_metadata: UserMetadata;
}

export interface AuthResponse {
  user: AuthUser | null;
  error?: string;
  success: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  nome_completo: string;
  telefone?: string;
  id_empresa?: string;
  role?: UserRole;
}