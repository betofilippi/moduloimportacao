import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  signIn, 
  signUp, 
  signOut, 
  getCurrentUser,
  getUserMetadata,
  updateUserMetadata,
  checkUserRole,
  isAdmin,
  hasWritePermissions,
  hasReadPermissions,
  isSessionValid,
  refreshSession
} from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// Mock do cliente Supabase
vi.mock('@/lib/supabase-browser', () => ({
  createSupabaseBrowserClient: vi.fn()
}))

describe('Authentication Functions', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    vi.clearAllMocks()
    
    // Mock do cliente Supabase
    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
        getSession: vi.fn(),
        updateUser: vi.fn(),
        refreshSession: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        onAuthStateChange: vi.fn()
      }
    }
    
    // Configurar o mock para retornar nosso cliente mockado
    ;(createSupabaseBrowserClient as any).mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('signIn', () => {
    it('deve fazer login com sucesso', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null
      })

      const result = await signIn({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('deve retornar erro quando credenciais inválidas', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      })

      const result = await signIn({
        email: 'test@example.com',
        password: 'wrongpassword'
      })

      expect(result.success).toBe(false)
      expect(result.user).toBeNull()
      expect(result.error).toBe('Invalid login credentials')
    })
  })

  describe('signUp', () => {
    it('deve registrar usuário com sucesso', async () => {
      const mockUser = {
        id: '123',
        email: 'newuser@example.com',
        user_metadata: {
          nome_completo: 'New User',
          telefone: '11999999999',
          role: 'user'
        }
      }
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null
      })

      const result = await signUp({
        email: 'newuser@example.com',
        password: 'password123',
        nome_completo: 'New User',
        telefone: '11999999999'
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('deve retornar erro quando email já existe', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' }
      })

      const result = await signUp({
        email: 'existing@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.user).toBeNull()
      expect(result.error).toBe('User already registered')
    })
  })

  describe('getCurrentUser', () => {
    it('deve retornar usuário atual quando autenticado', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const user = await getCurrentUser()
      
      expect(user).toEqual(mockUser)
    })

    it('deve retornar null quando não autenticado', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const user = await getCurrentUser()
      
      expect(user).toBeNull()
    })
  })

  describe('signOut', () => {
    it('deve fazer logout com sucesso', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      })

      const result = await signOut()
      
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('deve retornar erro quando falha ao fazer logout', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' }
      })

      const result = await signOut()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Logout failed')
    })
  })

  describe('isSessionValid', () => {
    it('deve retornar true para sessão válida', async () => {
      const futureDate = new Date()
      futureDate.setHours(futureDate.getHours() + 1)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { 
          session: { 
            expires_at: Math.floor(futureDate.getTime() / 1000) 
          } 
        },
        error: null
      })

      const isValid = await isSessionValid()
      
      expect(isValid).toBe(true)
    })

    it('deve retornar false para sessão expirada', async () => {
      const pastDate = new Date()
      pastDate.setHours(pastDate.getHours() - 1)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { 
          session: { 
            expires_at: Math.floor(pastDate.getTime() / 1000) 
          } 
        },
        error: null
      })

      const isValid = await isSessionValid()
      
      expect(isValid).toBe(false)
    })

    it('deve retornar false quando não há sessão', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const isValid = await isSessionValid()
      
      expect(isValid).toBe(false)
    })
  })

  describe('Role Checking Functions', () => {
    it('isAdmin deve retornar true para usuário admin', async () => {
      const mockAdminUser = {
        id: '123',
        email: 'admin@example.com',
        user_metadata: { role: 'admin' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null
      })

      const result = await isAdmin()
      
      expect(result).toBe(true)
    })

    it('isAdmin deve retornar false para usuário não-admin', async () => {
      const mockUser = {
        id: '123',
        email: 'user@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await isAdmin()
      
      expect(result).toBe(false)
    })

    it('hasWritePermissions deve retornar true para admin e user', async () => {
      const mockUser = {
        id: '123',
        email: 'user@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await hasWritePermissions()
      
      expect(result).toBe(true)
    })

    it('hasReadPermissions deve retornar true para qualquer role', async () => {
      const mockViewer = {
        id: '123',
        email: 'viewer@example.com',
        user_metadata: { role: 'viewer' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockViewer },
        error: null
      })

      const result = await hasReadPermissions()
      
      expect(result).toBe(true)
    })
  })

  describe('updateUserMetadata', () => {
    it('deve atualizar metadata do usuário com sucesso', async () => {
      const mockUser = {
        id: '123',
        email: 'user@example.com',
        user_metadata: { 
          nome_completo: 'Old Name',
          telefone: '11999999999'
        }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: null
      })

      const result = await updateUserMetadata({
        nome_completo: 'New Name'
      })

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        data: {
          nome_completo: 'New Name',
          telefone: '11999999999'
        }
      })
    })

    it('deve retornar erro quando usuário não autenticado', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await updateUserMetadata({
        nome_completo: 'New Name'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Usuário não autenticado')
    })
  })

  describe('refreshSession', () => {
    it('deve renovar sessão com sucesso', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        error: null
      })

      const result = await refreshSession()
      
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('deve retornar erro quando falha ao renovar sessão', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        error: { message: 'Session refresh failed' }
      })

      const result = await refreshSession()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Session refresh failed')
    })
  })
})