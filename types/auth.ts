import { User as SupabaseUser } from '@supabase/supabase-js'
import { User as CustomUser } from './types'

// Create a type that combines both user types
export type AuthUser = SupabaseUser & {
  // Add custom fields that might come from user profile/metadata
  first_name?: string
  last_name?: string
  profile?: string
  role_id?: string
  project_id?: string
  is_active?: boolean
  roles?: {
    name: string
  }
  projects?: {
    name: string
  }
}

// Utility function to convert Supabase User to CustomUser format
export function mapSupabaseUserToCustomUser(supabaseUser: SupabaseUser | null): CustomUser | null {
  if (!supabaseUser) return null

  // Extract names from user metadata
  const firstName = supabaseUser.user_metadata?.first_name || 
                   supabaseUser.user_metadata?.given_name ||
                   supabaseUser.user_metadata?.name?.split(' ')[0] || 
                   supabaseUser.user_metadata?.full_name?.split(' ')[0] || 
                   ''
                   
  const lastName = supabaseUser.user_metadata?.last_name || 
                  supabaseUser.user_metadata?.family_name ||
                  supabaseUser.user_metadata?.name?.split(' ').slice(1).join(' ') || 
                  supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 
                  ''

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    first_name: firstName,
    last_name: lastName,
    profile: supabaseUser.user_metadata?.avatar_url || 
            supabaseUser.user_metadata?.picture ||
            supabaseUser.user_metadata?.avatar,
    is_active: true,
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.updated_at,
    role_id: supabaseUser.user_metadata?.role_id || supabaseUser.app_metadata?.role_id,
    project_id: supabaseUser.user_metadata?.project_id || supabaseUser.app_metadata?.project_id,
    roles: supabaseUser.user_metadata?.roles || 
           supabaseUser.app_metadata?.roles || 
           (supabaseUser.user_metadata?.role ? { name: supabaseUser.user_metadata.role } : undefined),
  }
}

// Hook to get mapped user data
export { useUser } from '@/components/auth/user-context'
