import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseServerClient, getAuthenticatedUser, getSession, getUser } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))

// Mock createServerClient
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}))

describe('Supabase Server Functions', () => {
  let mockCookieStore: any
  let mockSupabaseClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock cookie store
    mockCookieStore = {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn()
    }
    
    // Mock cookies function
    ;(cookies as any).mockResolvedValue(mockCookieStore)
    
    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn()
      }
    }
  })

  describe('getAuthenticatedUser', () => {
    it('deve retornar usuário autenticado com sessão válida', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      const mockSession = {
        user: mockUser,
        access_token: 'token123',
        expires_at: Date.now() + 3600000
      }
      
      // Mock createServerClient para retornar nosso cliente mockado
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const result = await getAuthenticatedUser()
      
      expect(result.user).toEqual(mockUser)
      expect(result.session).toEqual(mockSession)
      expect(result.supabase).toBeDefined()
    })

    it('deve lançar erro quando não há sessão', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await expect(getAuthenticatedUser()).rejects.toThrow('Sessão não encontrada - usuário não autenticado')
    })

    it('deve lançar erro quando há erro ao obter sessão', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Network error' }
      })

      await expect(getAuthenticatedUser()).rejects.toThrow('Erro ao obter sessão: Network error')
    })

    it('deve lançar erro quando usuário não está presente na sessão', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      const mockSession = {
        user: null,
        access_token: 'token123',
        expires_at: Date.now() + 3600000
      }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      await expect(getAuthenticatedUser()).rejects.toThrow('Usuário não encontrado na sessão')
    })
  })

  describe('getSession', () => {
    it('deve retornar sessão quando válida', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token123',
        expires_at: Date.now() + 3600000
      }
      
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const session = await getSession()
      
      expect(session).toEqual(mockSession)
    })

    it('deve retornar null quando não há sessão', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const session = await getSession()
      
      expect(session).toBeNull()
    })

    it('deve retornar null quando há erro', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Error getting session' }
      })

      const session = await getSession()
      
      expect(session).toBeNull()
    })
  })

  describe('getUser', () => {
    it('deve retornar usuário quando há sessão', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      const mockSession = {
        user: mockUser,
        access_token: 'token123',
        expires_at: Date.now() + 3600000
      }
      
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const user = await getUser()
      
      expect(user).toEqual(mockUser)
    })

    it('deve retornar null quando não há sessão', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      ;(createServerClient as any).mockReturnValue(mockSupabaseClient)
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const user = await getUser()
      
      expect(user).toBeNull()
    })
  })

  describe('createSupabaseServerClient', () => {
    it('deve criar cliente com configuração correta de cookies', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      
      await createSupabaseServerClient()
      
      expect(createServerClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function)
          })
        })
      )
    })

    it('deve configurar corretamente getAll para cookies', async () => {
      const mockCookies = [
        { name: 'cookie1', value: 'value1' },
        { name: 'cookie2', value: 'value2' }
      ]
      mockCookieStore.getAll.mockReturnValue(mockCookies)
      
      const { createServerClient } = await import('@supabase/ssr')
      let capturedConfig: any
      
      ;(createServerClient as any).mockImplementation((url: string, key: string, config: any) => {
        capturedConfig = config
        return mockSupabaseClient
      })
      
      await createSupabaseServerClient()
      
      const result = capturedConfig.cookies.getAll()
      expect(result).toEqual(mockCookies)
    })

    it('deve configurar corretamente setAll para cookies', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      let capturedConfig: any
      
      ;(createServerClient as any).mockImplementation((url: string, key: string, config: any) => {
        capturedConfig = config
        return mockSupabaseClient
      })
      
      await createSupabaseServerClient()
      
      const cookiesToSet = [
        { name: 'cookie1', value: 'value1', options: { httpOnly: true } },
        { name: 'cookie2', value: 'value2', options: { secure: true } }
      ]
      
      capturedConfig.cookies.setAll(cookiesToSet)
      
      expect(mockCookieStore.set).toHaveBeenCalledTimes(2)
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie1', 'value1', { httpOnly: true })
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie2', 'value2', { secure: true })
    })

    it('deve capturar erro ao definir cookies em Server Component', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cannot set cookies in Server Component')
      })
      
      const { createServerClient } = await import('@supabase/ssr')
      let capturedConfig: any
      
      ;(createServerClient as any).mockImplementation((url: string, key: string, config: any) => {
        capturedConfig = config
        return mockSupabaseClient
      })
      
      await createSupabaseServerClient()
      
      const cookiesToSet = [{ name: 'cookie1', value: 'value1', options: {} }]
      
      // Não deve lançar erro
      expect(() => capturedConfig.cookies.setAll(cookiesToSet)).not.toThrow()
      
      // Deve logar o erro
      expect(consoleSpy).toHaveBeenCalledWith('Error setting cookies:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})