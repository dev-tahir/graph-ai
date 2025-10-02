import NextAuth, { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createGuestUser, type GuestUser } from "@/lib/guest-user";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isGuest?: boolean;
    };
  }
  
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    isGuest?: boolean;
  }
}

export interface ExtendedSession {
  user: {
    id: string;
    email?: string;
    name?: string | null;
    image?: string | null;
    isGuest: boolean;
  } | null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // For now, return null to disable authentication
        // This allows us to test the configuration without database issues
        console.log("Auth attempt:", credentials?.email);
        return null;
      }
    })
  ],
  
  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isGuest = false; // Authenticated users are not guests
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  debug: false, // Disable debug to reduce console errors
};

// Create NextAuth instance
const handler = NextAuth(authOptions);

// Export for API routes (NextAuth v4 style)
export { handler as GET, handler as POST };

// Export auth function (NextAuth v4 compatible)
export const auth = () => getServerSession(authOptions);

// User registration function (disabled due to schema issues)
export async function registerUser(email: string, password: string, name: string) {
  try {
    console.log("Registration temporarily disabled - schema needs to be fixed");
    return { 
      success: false, 
      error: "Registration temporarily disabled" 
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Registration failed" 
    };
  }
}

// Password validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Get an extended session that includes guest user support
export async function getExtendedSession(): Promise<ExtendedSession> {
  const session = await auth();
  
  if (session?.user) {
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        isGuest: false,
      }
    };
  }
  
  return { user: null };
}
