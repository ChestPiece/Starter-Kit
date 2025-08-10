import { createClient } from './server'

export async function getUser() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error fetching user:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error in getUser:', error)
    return null
  }
}

export async function getSession() {
  const supabase = await createClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error fetching session:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Error in getSession:', error)
    return null
  }
}
