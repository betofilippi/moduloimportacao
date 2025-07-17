import { createSupabaseBrowserClient } from './supabase-browser'
import { createSupabaseServerClient, getSession as getServerSession } from './supabase-server'
import type { User } from '@supabase/supabase-js'
import type { UserRole, UserMetadata, AuthUser, RegisterData, AuthResponse } from '@/types/auth'

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials extends SignInCredentials {
  nome_completo?: string
  telefone?: string
  role?: UserRole
  id_empresa?: string
}

/**
 * Get the current authenticated user with metadata
 */
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }

    if (!user) {
      return null
    }

    // Return user with metadata - no additional queries needed
    return user as AuthUser
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

/**
 * Sign in with email and password
 */
export const signIn = async (credentials: SignInCredentials): Promise<AuthResponse> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    })

    if (error) {
      return {
        error: error.message,
        user: null,
        success: false
      }
    }

    return {
      user: data.user as AuthUser,
      success: true
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      user: null,
      success: false
    }
  }
}

/**
 * Sign up a new user
 */
export const signUp = async (credentials: SignUpCredentials): Promise<AuthResponse> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const userMetadata: UserMetadata = {
      nome_completo: credentials.nome_completo || '',
      telefone: credentials.telefone,
      id_empresa: credentials.id_empresa,
      role: credentials.role || 'user'
    }

    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: userMetadata
      }
    })

    if (error) {
      return {
        error: error.message,
        user: null,
        success: false
      }
    }

    return {
      user: data.user as AuthUser,
      success: true
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      user: null,
      success: false
    }
  }
}

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<{ error?: string; success: boolean }> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        error: error.message,
        success: false
      }
    }

    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false
    }
  }
}

/**
 * Get user metadata
 */
export const getUserMetadata = async (userId?: string): Promise<UserMetadata | null> => {
  try {
    if (!userId) {
      const user = await getCurrentUser()
      return user?.user_metadata as UserMetadata || null
    }
    
    // For specific user ID, we would need admin access
    // This would require a server-side implementation
    console.warn('Getting metadata for specific user ID requires admin access')
    return null
  } catch (error) {
    console.error('Error getting user metadata:', error)
    return null
  }
}

/**
 * Update user metadata
 */
export const updateUserMetadata = async (
  updates: Partial<UserMetadata>
): Promise<{ error?: string; success: boolean }> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        error: 'Usuário não autenticado',
        success: false
      }
    }

    const updatedMetadata = {
      ...currentUser.user_metadata,
      ...updates
    }

    const { error } = await supabase.auth.updateUser({
      data: updatedMetadata
    })

    if (error) {
      return {
        error: error.message,
        success: false
      }
    }

    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false
    }
  }
}

/**
 * Check if user has required role
 */
export const checkUserRole = async (
  requiredRole: UserRole | UserRole[],
  user?: AuthUser
): Promise<boolean> => {
  try {
    const currentUser = user || await getCurrentUser()
    
    if (!currentUser?.user_metadata?.role) {
      return false
    }

    const userRole = currentUser.user_metadata.role

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole)
    }

    return userRole === requiredRole
  } catch {
    return false
  }
}

/**
 * Check if user is admin
 */
export const isAdmin = async (user?: AuthUser): Promise<boolean> => {
  return checkUserRole('admin', user)
}

/**
 * Check if user has write permissions (admin or user role)
 */
export const hasWritePermissions = async (user?: AuthUser): Promise<boolean> => {
  return checkUserRole(['admin', 'user'], user)
}

/**
 * Check if user has read permissions (any authenticated user)
 */
export const hasReadPermissions = async (user?: AuthUser): Promise<boolean> => {
  return checkUserRole(['admin', 'user', 'viewer'], user)
}

/**
 * Reset password
 */
export const resetPassword = async (email: string): Promise<{ error?: string; success: boolean }> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    })

    if (error) {
      return {
        error: error.message,
        success: false
      }
    }

    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false
    }
  }
}

/**
 * Update password
 */
export const updatePassword = async (newPassword: string): Promise<{ error?: string; success: boolean }> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      return {
        error: error.message,
        success: false
      }
    }

    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false
    }
  }
}

/**
 * Check if user session is valid
 */
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    return !error && !!session && new Date() < new Date(session.expires_at! * 1000)
  } catch {
    return false
  }
}

/**
 * Refresh session
 */
export const refreshSession = async (): Promise<{ error?: string; success: boolean }> => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.refreshSession()

    if (error) {
      return {
        error: error.message,
        success: false
      }
    }

    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false
    }
  }
}

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (): Promise<AuthUser[]> => {
  try {
    // Check if current user is admin
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
      throw new Error('Unauthorized: Admin access required')
    }

    // This requires server-side implementation with admin client
    console.warn('Getting all users requires admin access - implement server-side')
    return []
  } catch (error) {
    throw error instanceof Error ? error : new Error('Erro desconhecido')
  }
}

/**
 * Create user (admin only)
 */
export const createUser = async (userData: RegisterData): Promise<AuthResponse> => {
  try {
    // Check if current user is admin
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
      return {
        error: 'Unauthorized: Admin access required',
        user: null,
        success: false
      }
    }

    // This requires server-side implementation with admin client
    console.warn('Creating users requires admin access - implement server-side')
    return {
      error: 'Feature not implemented',
      user: null,
      success: false
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      user: null,
      success: false
    }
  }
}

// Auth state change subscription
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  const supabase = createSupabaseBrowserClient()
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      callback(session.user as AuthUser)
    } else {
      callback(null)
    }
  })
}