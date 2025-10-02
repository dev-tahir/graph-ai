import { nanoid } from 'nanoid';

// Key for storing guest user ID in localStorage
const GUEST_USER_KEY = 'graph-ai-guest-user-id';

export interface GuestUser {
  id: string;
  isGuest: true;
  name: string;
  email?: never;
  image?: never;
}

export interface AuthenticatedUser {
  id: string;
  isGuest: false;
  name?: string | null;
  email: string;
  image?: string | null;
}

export type AppUser = GuestUser | AuthenticatedUser;

/**
 * Generate a new guest user ID
 */
export function generateGuestUserId(): string {
  return `guest_${nanoid()}`;
}

/**
 * Get or create a guest user ID from browser storage
 */
export function getOrCreateGuestUserId(): string {
  if (typeof window === 'undefined') {
    // Server-side: generate a new ID (will be replaced client-side)
    return generateGuestUserId();
  }

  let guestId = window.localStorage.getItem(GUEST_USER_KEY);
  
  if (!guestId) {
    guestId = generateGuestUserId();
    window.localStorage.setItem(GUEST_USER_KEY, guestId);
  }
  
  return guestId;
}

/**
 * Clear the guest user ID from browser storage
 */
export function clearGuestUserId(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(GUEST_USER_KEY);
  }
}

/**
 * Create a guest user object
 */
export function createGuestUser(id?: string): GuestUser {
  return {
    id: id || getOrCreateGuestUserId(),
    isGuest: true,
    name: 'Guest User',
  };
}

/**
 * Check if a user ID belongs to a guest user
 */
export function isGuestUserId(userId: string): boolean {
  return userId.startsWith('guest_');
}

/**
 * Get user information for display purposes
 */
export function getUserDisplayInfo(user: AppUser): { name: string; email?: string; isGuest: boolean } {
  if (user.isGuest) {
    return {
      name: user.name,
      isGuest: true,
    };
  }
  
  return {
    name: user.name || 'User',
    email: user.email,
    isGuest: false,
  };
}

/**
 * Convert a NextAuth session user to AppUser format
 */
export function sessionToAppUser(session: any): AuthenticatedUser | null {
  if (!session?.user?.id) return null;
  
  return {
    id: session.user.id,
    isGuest: false,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}

/**
 * Get user ID for API calls (authenticated user ID or guest user ID)
 */
export function getCurrentUserId(session: any): string {
  const authenticatedUser = sessionToAppUser(session);
  if (authenticatedUser) {
    return authenticatedUser.id;
  }
  
  return getOrCreateGuestUserId();
}