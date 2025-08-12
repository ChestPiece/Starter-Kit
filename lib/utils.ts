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

// Parse the user cookie
export function parseUserData(userCookie: string) {
  return JSON.parse(userCookie)
}

// Get the user cookie from the request
export function getUserCookie(request: NextRequest) {
  const cookies = request.cookies.getAll()
  return cookies.find((c) => c.name === 'auth.user')
}

// Mock utility functions (authentication removed)
export function getUserDataFromCookie() {
  // Return mock data since authentication is removed
  return {
    user: {
      user_profileCollection: {
        edges: [{
          node: {
            id: "mock-user-id",
            first_name: "Demo",
            last_name: "User",
            email: "demo@example.com",
            roles: { name: "admin" },
            avatar_url: null,
            profile: null
          }
        }]
      }
    }
  };
}

// Utility functions that use mock data (no authentication required)
export function getUserId() {
  return "mock-user-id";
}

export function getUserProfile() {
  return {
    id: "mock-user-id",
    first_name: "Demo",
    last_name: "User",
    email: "demo@example.com",
    roles: { name: "admin" },
    avatar_url: undefined,
    profile: undefined
  };
}

export function getUserEmail() {
  return "demo@example.com";
}

export function getUserRole() {
  return "admin";
}

// Mock user data hook (authentication removed)
export function useUserData() {
  return {
    user: {
      user_profileCollection: {
        edges: [{
          node: {
            id: "mock-user-id",
            first_name: "Demo",
            last_name: "User", 
            email: "demo@example.com",
            roles: { name: "admin" },
            avatar_url: null,
            profile: null
          }
        }]
      }
    }
  };
}

// Utility to fix pointer-events style issues
export function fixPointerEvents() {
  // Reset pointer-events if it's been set to 'none'
  if (document.body.style.pointerEvents === 'none') {
    document.body.style.removeProperty('pointer-events');
  }
}

// Setup global listener to fix pointer-events
export function setupPointerEventsReset() {
  // Function to check and fix pointer-events
  const checkAndFixPointerEvents = () => {
    if (document.body.style.pointerEvents === 'none') {
      const activeDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
      const activePopovers = document.querySelectorAll('[role="dialog"][data-state="open"]');
      const activeAlerts = document.querySelectorAll('[role="alertdialog"][data-state="open"]');
      const activeDropdowns = document.querySelectorAll('[data-radix-popper-content-wrapper]');
      
      // If no dialogs are open but pointer-events is still none, fix it
      if (
        activeDialogs.length === 0 && 
        activePopovers.length === 0 &&
        activeAlerts.length === 0 &&
        activeDropdowns.length === 0
      ) {
        document.body.style.removeProperty('pointer-events');
      }
    }
  };
  
  // Add listeners to various events that might indicate dialog closure
  document.addEventListener('click', checkAndFixPointerEvents);
  document.addEventListener('mousedown', checkAndFixPointerEvents);
  document.addEventListener('mouseup', checkAndFixPointerEvents);
  document.addEventListener('touchstart', checkAndFixPointerEvents);
  document.addEventListener('touchend', checkAndFixPointerEvents);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Wait a bit for the dialog to close
      setTimeout(checkAndFixPointerEvents, 100);
    }
  });
  
  // MutationObserver to detect DOM changes (like dialog being removed)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        checkAndFixPointerEvents();
      }
    }
  });
  
  // Observe changes to the body element and its children
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state', 'style']
  });
  
  // Periodic check as a fallback
  const intervalId = setInterval(checkAndFixPointerEvents, 500);
  
  // Return a cleanup function
  return () => {
    document.removeEventListener('click', checkAndFixPointerEvents);
    document.removeEventListener('mousedown', checkAndFixPointerEvents);
    document.removeEventListener('mouseup', checkAndFixPointerEvents);
    document.removeEventListener('touchstart', checkAndFixPointerEvents);
    document.removeEventListener('touchend', checkAndFixPointerEvents);
    document.removeEventListener('keydown', checkAndFixPointerEvents);
    observer.disconnect();
    clearInterval(intervalId);
  };
}
  