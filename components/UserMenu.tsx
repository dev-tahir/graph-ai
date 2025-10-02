'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { 
  User, 
  LogOut, 
  Settings, 
  BarChart3, 
  FileText,
  ChevronDown,
  LogIn,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { createGuestUser, getOrCreateGuestUserId, type GuestUser } from '@/lib/guest-user';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Set up guest user if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      const guestId = getOrCreateGuestUserId();
      setGuestUser(createGuestUser(guestId));
    } else {
      setGuestUser(null);
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  if (!session && guestUser) {
    return (
      <div className="flex items-center space-x-3">
        {/* Guest user indicator */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="h-8 w-8 bg-gray-400 rounded-full flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-gray-900">
                {guestUser.name}
              </div>
              <div className="text-xs text-gray-500">
                Guest Mode
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Guest Dropdown Menu */}
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-3 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    {guestUser.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    You're using Graph AI as a guest
                  </div>
                </div>
                
                <div className="p-2">
                  <div className="mb-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-xs text-blue-800 mb-2">
                      💡 Sign up to save your chats and graphs permanently!
                    </p>
                  </div>
                  
                  <Link
                    href="/auth/signin"
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    <LogIn className="h-4 w-4 mr-3" />
                    Sign In
                  </Link>
                  
                  <Link
                    href="/auth/signup"
                    className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    <UserPlus className="h-4 w-4 mr-3" />
                    Create Account
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center space-x-3">
        <Link
          href="/auth/signin"
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {session.user.name || 'User'}
          </div>
          <div className="text-xs text-gray-500">
            {session.user.email}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-3 border-b border-gray-100">
              <div className="text-sm font-medium text-gray-900">
                {session.user.name || 'User'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {session.user.email}
              </div>
            </div>

            <div className="py-2">
              <Link
                href="/dashboard"
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                My Dashboards
              </Link>
              
              <Link
                href="/graphs"
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <FileText className="h-4 w-4 mr-3" />
                My Graphs
              </Link>
              
              <Link
                href="/profile"
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4 mr-3" />
                Profile & Settings
              </Link>
            </div>

            <div className="py-2 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}