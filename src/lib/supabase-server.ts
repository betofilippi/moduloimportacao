import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.error('Error setting cookies:', error);
          }
        },
      },
    }
  );
}

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  
  try {
    // First check if there's a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('getAuthenticatedUser - session:', session);
    console.log('getAuthenticatedUser - error:', sessionError);
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`Erro ao obter sessão: ${sessionError.message}`);
    }
    
    if (!session) {
      throw new Error('Sessão não encontrada - usuário não autenticado');
    }
    
    // Now get the user from the session
    const user = session.user;
    
    if (!user) {
      throw new Error('Usuário não encontrado na sessão');
    }
    
    return { user, supabase, session };
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    throw error;
  }
}

export async function getSession() {
  const supabase = await createSupabaseServerClient();
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error in getSession:', error);
    return null;
  }
}

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error in getUser:', error);
    return null;
  }
}

// New secure function that returns both user and session
export async function getSecureSession() {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Get authenticated user from Supabase Auth server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }
    
    // Get session for additional data if needed
    const { data: { session } } = await supabase.auth.getSession();
    
    return {
      user,
      session
    };
  } catch (error) {
    console.error('Error in getSecureSession:', error);
    return null;
  }
}