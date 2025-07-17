import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '../middleware'

// Mock createServerClient
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}))

describe('Middleware', () => {
  let mockSupabaseClient: any
  let mockRequest: NextRequest

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn()
      }
    }
    
    // Setup createServerClient mock
    const { createServerClient } = require('@supabase/ssr')
    createServerClient.mockReturnValue(mockSupabaseClient)
  })

  const createMockRequest = (url: string) => {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      headers: new Headers({
        'cookie': 'test-cookie=value'
      })
    })
  }

  describe('Static files and public assets', () => {
    it('deve pular middleware para arquivos estáticos', async () => {
      mockRequest = createMockRequest('/_next/static/file.js')
      const response = await middleware(mockRequest)
      
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('deve pular middleware para arquivos com extensão', async () => {
      mockRequest = createMockRequest('/favicon.ico')
      const response = await middleware(mockRequest)
      
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })
  })

  describe('Protected routes', () => {
    it('deve redirecionar para login quando usuário não autenticado acessa rota protegida', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })
      
      mockRequest = createMockRequest('/dashboard')
      const response = await middleware(mockRequest)
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/auth/login?redirect=%2Fdashboard')
    })

    it('deve permitir acesso quando usuário autenticado acessa rota protegida', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockRequest = createMockRequest('/dashboard')
      const response = await middleware(mockRequest)
      
      expect(response.status).not.toBe(307)
    })
  })

  describe('Protected API routes', () => {
    it('deve retornar 401 quando usuário não autenticado acessa API protegida', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })
      
      mockRequest = createMockRequest('/api/ocr/upload')
      const response = await middleware(mockRequest)
      
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Usuário não autenticado')
    })

    it('deve permitir acesso quando usuário autenticado acessa API protegida', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockRequest = createMockRequest('/api/ocr/upload')
      const response = await middleware(mockRequest)
      
      expect(response.status).not.toBe(401)
    })
  })

  describe('Public routes', () => {
    it('deve redirecionar usuário autenticado de login para dashboard', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockRequest = createMockRequest('/auth/login')
      const response = await middleware(mockRequest)
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('deve permitir acesso não autenticado a rotas públicas', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })
      
      mockRequest = createMockRequest('/auth/login')
      const response = await middleware(mockRequest)
      
      expect(response.status).not.toBe(307)
    })

    it('não deve redirecionar de auth/callback mesmo quando autenticado', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockRequest = createMockRequest('/auth/callback')
      const response = await middleware(mockRequest)
      
      expect(response.status).not.toBe(307)
    })
  })

  describe('Admin routes', () => {
    it('deve redirecionar usuário não-admin de rotas admin', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockRequest = createMockRequest('/configuracoes')
      const response = await middleware(mockRequest)
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('deve permitir acesso admin a rotas admin', async () => {
      const mockAdminUser = {
        id: '123',
        email: 'admin@example.com',
        user_metadata: { role: 'admin' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null
      })
      
      mockRequest = createMockRequest('/configuracoes')
      const response = await middleware(mockRequest)
      
      expect(response.status).not.toBe(307)
    })
  })

  describe('Root path redirect', () => {
    it('deve redirecionar usuário autenticado de / para dashboard', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockRequest = createMockRequest('/')
      const response = await middleware(mockRequest)
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('deve redirecionar usuário não autenticado de / para login', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })
      
      mockRequest = createMockRequest('/')
      const response = await middleware(mockRequest)
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/auth/login')
    })
  })

  describe('Cookie handling', () => {
    it('deve preservar cookies na resposta', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      // Mock cookie operations
      const { createServerClient } = require('@supabase/ssr')
      let cookieConfig: any
      
      createServerClient.mockImplementation((url: string, key: string, config: any) => {
        cookieConfig = config
        return mockSupabaseClient
      })
      
      mockRequest = createMockRequest('/dashboard')
      await middleware(mockRequest)
      
      // Verificar que getAll foi configurado
      expect(cookieConfig.cookies.getAll).toBeDefined()
      
      // Verificar que setAll foi configurado
      expect(cookieConfig.cookies.setAll).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('deve redirecionar para dashboard quando erro ao verificar role admin', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        // user_metadata undefined para simular erro
        user_metadata: undefined
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockRequest = createMockRequest('/configuracoes')
      const response = await middleware(mockRequest)
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })
  })
})