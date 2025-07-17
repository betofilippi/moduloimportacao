import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/processos',
  '/relatorios',
  '/configuracoes',
  '/ocr'
]

// Admin-only routes
const adminRoutes = [
  '/configuracoes'
]

// Public routes (no authentication required)
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/auth/callback'
]

// API routes that require authentication
const protectedApiRoutes = [
  '/api/ocr',
  '/api/processos',
  '/api/relatorios'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and public assets, but NOT API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    (pathname.includes('.') && !pathname.startsWith('/api'))
  ) {
    return NextResponse.next()
  }

  // Create a response object to pass to supabase
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user session
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()
  
  // Log authentication status for debugging
  if (pathname.startsWith('/api')) {
    console.log('Middleware - API route:', pathname)
    console.log('Middleware - User authenticated:', !!user)
    console.log('Middleware - Auth error:', error)
  }

  // Check if current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Check if current route is admin-only
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Check if current API route is protected
  const isProtectedApiRoute = protectedApiRoutes.some(route => 
    pathname.startsWith(route)
  )

  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  // If user is not authenticated and trying to access protected API route
  if (!user && isProtectedApiRoute) {
    return NextResponse.json(
      { error: 'Usuário não autenticado' },
      { status: 401 }
    )
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && isPublicRoute && pathname !== '/auth/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check user role for admin routes
  if (user && isAdminRoute) {
    try {
      // Check role from user metadata
      const userRole = user.user_metadata?.role

      // If user is not admin, redirect to dashboard
      if (!userRole || userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      console.error('Error checking user role:', error)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Redirect root path to dashboard if authenticated, otherwise to login
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}