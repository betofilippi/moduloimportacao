import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { getCurrentUser, supabaseAdmin } from './supabase'
import { ApiResponse, PaginatedResponse, PaginationParams } from '@/types/database'

// Standard API response helpers
export function apiSuccess<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message
  })
}

export function apiError(error: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error
  }, { status })
}

export function apiPaginatedSuccess<T>(
  data: T[],
  pagination: PaginationParams & { total: number }
): NextResponse<PaginatedResponse<T>> {
  const { page = 1, limit = 10, total } = pagination
  const totalPages = Math.ceil(total / limit)
  
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  })
}

// Request validation
export async function validateRequest<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = (error as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: `Validation error: ${errors}` }
    }
    return { success: false, error: 'Invalid request body' }
  }
}

// Authentication middleware
export async function requireAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' }
  }
  
  const token = authHeader.split(' ')[1]
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return { success: false, error: 'Invalid or expired token' }
    }
    
    return { success: true, user }
  } catch (error) {
    return { success: false, error: 'Authentication failed' }
  }
}

// Role-based access control
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<{ success: true; user: any } | { success: false; error: string }> {
  const authResult = await requireAuth(req)
  
  if (!authResult.success) {
    return authResult as any
  }
  
  // Check role from user metadata
  const userRole = authResult.user?.user_metadata?.role
  
  if (!userRole) {
    return { success: false, error: 'User role not found' }
  }
  
  if (!allowedRoles.includes(userRole)) {
    return { success: false, error: 'Insufficient permissions' }
  }
  
  return { success: true, user: { ...authResult.user, role: userRole } }
}

// Pagination helpers
export function getPaginationParams(req: NextRequest): PaginationParams {
  const url = new URL(req.url)
  const searchParams = url.searchParams
  
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '10'), 100), // Max 100 items
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  }
}

// Search and filter helpers
export function getSearchParams(req: NextRequest): Record<string, string> {
  const url = new URL(req.url)
  const searchParams = url.searchParams
  const params: Record<string, string> = {}
  
  // Common search/filter parameters
  const allowedParams = [
    'search', 'status', 'fornecedor_id', 'data_inicio', 'data_fim',
    'numero_proforma', 'valor_min', 'valor_max', 'tipo_documento',
    'recinto_aduaneiro', 'urf_despacho', 'canal'
  ]
  
  allowedParams.forEach(param => {
    const value = searchParams.get(param)
    if (value) {
      params[param] = value
    }
  })
  
  return params
}

// Query builder helpers
export function buildSupabaseQuery(
  baseQuery: any,
  params: PaginationParams,
  searchParams: Record<string, string>
) {
  let query = baseQuery
  
  // Apply search
  if (searchParams.search) {
    // This will be customized per entity
    query = query.ilike('numero_proforma', `%${searchParams.search}%`)
  }
  
  // Apply filters
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key !== 'search' && value) {
      if (key.includes('_min')) {
        const field = key.replace('_min', '')
        query = query.gte(field, value)
      } else if (key.includes('_max')) {
        const field = key.replace('_max', '')
        query = query.lte(field, value)
      } else if (key.includes('_inicio')) {
        const field = key.replace('_inicio', '')
        query = query.gte(field, value)
      } else if (key.includes('_fim')) {
        const field = key.replace('_fim', '')
        query = query.lte(field, value)
      } else {
        query = query.eq(key, value)
      }
    }
  })
  
  // Apply sorting
  if (params.sortBy) {
    query = query.order(params.sortBy, { ascending: params.sortOrder === 'asc' })
  }
  
  // Apply pagination
  const from = ((params.page || 1) - 1) * (params.limit || 10)
  const to = from + (params.limit || 10) - 1
  query = query.range(from, to)
  
  return query
}

// Rate limiting (simple in-memory implementation)
// In production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  windowMs = 60000, // 1 minute
  maxRequests = 100
): boolean {
  const now = Date.now()
  const window = rateLimitMap.get(identifier)
  
  if (!window || now > window.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (window.count >= maxRequests) {
    return false
  }
  
  window.count++
  return true
}

// IP address extraction
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const real = req.headers.get('x-real-ip')
  const remoteAddress = req.headers.get('x-vercel-forwarded-for')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real.trim()
  }
  
  if (remoteAddress) {
    return remoteAddress.trim()
  }
  
  return 'unknown'
}

// CORS headers
export function setCORSHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

// Error handling wrapper
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API Error:', error)
      
      if (error instanceof Error) {
        return apiError(error.message, 500)
      }
      
      return apiError('Internal server error', 500)
    }
  }
}

// Type guards
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
  
  if (cleanCNPJ.length !== 14) return false
  
  // Basic CNPJ validation algorithm
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9]
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights1[i]
  }
  
  const remainder1 = sum % 11
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1
  
  if (parseInt(cleanCNPJ[12]) !== digit1) return false
  
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights2[i]
  }
  
  const remainder2 = sum % 11
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2
  
  return parseInt(cleanCNPJ[13]) === digit2
}

export function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/[^\d]/g, '')
  
  if (cleanCPF.length !== 11) return false
  
  // Check for repeated digits
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Calculate first digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i)
  }
  
  const remainder1 = sum % 11
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1
  
  if (parseInt(cleanCPF[9]) !== digit1) return false
  
  // Calculate second digit
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i)
  }
  
  const remainder2 = sum % 11
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2
  
  return parseInt(cleanCPF[10]) === digit2
}

// File validation
export function isValidFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  return extension ? allowedTypes.includes(extension) : false
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Date helpers
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR')
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('pt-BR')
}

export function isValidDateRange(start: string, end: string): boolean {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  return startDate <= endDate
}