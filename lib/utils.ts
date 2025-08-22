import { clsx, type ClassValue } from "clsx"
import { NextRequest } from "next/server"
import { twMerge } from "tailwind-merge"
import Cookies from 'js-cookie';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date to locale string with custom options
export function formatDate(date: string | Date | undefined, options: Intl.DateTimeFormatOptions = {}) {
  if (!date) return "";
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return new Date(date).toLocaleDateString(undefined, defaultOptions);
}

// Cookie utilities (use Supabase auth instead for user data)
export function parseUserData(userCookie: string) {
  return JSON.parse(userCookie)
}

export function getUserCookie(request: NextRequest) {
  const cookies = request.cookies.getAll()
  return cookies.find((c) => c.name === 'auth.user')
}

// Note: Mock functions removed - use proper Supabase authentication via useUser hook
// Note: Pointer events utilities moved to @/utils/pointer-events
  