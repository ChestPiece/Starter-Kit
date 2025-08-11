"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

/**
 * Server action for proper logout handling
 * Clears both Supabase session and all related cookies
 */
export async function logout() {
  const supabase = await createClient();
  
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Error signing out:", error);
    }
    
    // Clear all session-related cookies
    const cookieStore = await cookies();
    
    // Clear session tracking cookies
    cookieStore.delete('lastActivity');
    cookieStore.delete('sessionStart');
    cookieStore.delete('sessionWarningShown');
    
    // Clear any other auth-related cookies
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    
    // Get all cookies and delete any Supabase-related ones
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || 
          cookie.name.includes('supabase') ||
          cookie.name.includes('auth')) {
        try {
          cookieStore.delete(cookie.name);
        } catch (e) {
          console.warn(`Could not delete cookie ${cookie.name}:`, e);
        }
      }
    });
    
    console.log("User logged out successfully, cookies cleared");
    
  } catch (error) {
    console.error("Error during logout:", error);
  }
  
  // Revalidate and redirect
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

/**
 * Force logout with reason
 */
export async function forceLogout(reason: string = "session_expired") {
  const supabase = await createClient();
  
  try {
    await supabase.auth.signOut();
    
    const cookieStore = await cookies();
    
    // Clear all session-related cookies
    cookieStore.delete('lastActivity');
    cookieStore.delete('sessionStart');
    cookieStore.delete('sessionWarningShown');
    
    // Clear Supabase cookies
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || 
          cookie.name.includes('supabase') ||
          cookie.name.includes('auth')) {
        try {
          cookieStore.delete(cookie.name);
        } catch (e) {
          console.warn(`Could not delete cookie ${cookie.name}:`, e);
        }
      }
    });
    
    console.log(`Force logout completed with reason: ${reason}`);
    
  } catch (error) {
    console.error("Error during force logout:", error);
  }
  
  revalidatePath("/", "layout");
  redirect(`/auth/login?reason=${encodeURIComponent(reason)}`);
}
