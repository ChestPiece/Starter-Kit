import { logger } from '@/lib/services/logger';

import { createClient } from './server'
import { mapSupabaseUserToCustomUser } from '@/types/auth'

export async function getUser() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      logger.error('Error fetching user:', { error: error instanceof Error ? error.message : String(error) });
      return null
    }
    
    // Return the mapped custom user format
    return mapSupabaseUserToCustomUser(user)
  } catch (error) {
    logger.error('Error in getUser:', { error: error instanceof Error ? error.message : String(error) });
    return null
  }
}

export async function getSupabaseUser() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      logger.error('Error fetching user:', { error: error instanceof Error ? error.message : String(error) });
      return null
    }
    
    return user
  } catch (error) {
    logger.error('Error in getSupabaseUser:', { error: error instanceof Error ? error.message : String(error) });
    return null
  }
}

export async function getSession() {
  const supabase = await createClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      logger.error('Error fetching session:', { error: error instanceof Error ? error.message : String(error) });
      return null
    }
    
    return session
  } catch (error) {
    logger.error('Error in getSession:', { error: error instanceof Error ? error.message : String(error) });
    return null
  }
}