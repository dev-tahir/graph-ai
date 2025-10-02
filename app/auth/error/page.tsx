'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorDetails = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return {
          title: 'Server Configuration Error',
          description: 'There is a problem with the server configuration. Please contact support.',
          suggestion: 'Try again later or contact support if the problem persists.',
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to sign in with this account.',
          suggestion: 'Please use a different account or contact support.',
        };
      case 'Verification':
        return {
          title: 'Verification Failed',
          description: 'The verification token is invalid or has expired.',
          suggestion: 'Please request a new verification email.',
        };
      case 'OAuthSignin':
        return {
          title: 'OAuth Sign In Failed',
          description: 'There was an error signing in with the OAuth provider.',
          suggestion: 'Please try signing in again or use a different method.',
        };
      case 'OAuthCallback':
        return {
          title: 'OAuth Callback Error',
          description: 'There was an error processing the OAuth callback.',
          suggestion: 'Please try signing in again.',
        };
      case 'OAuthCreateAccount':
        return {
          title: 'OAuth Account Creation Failed',
          description: 'Could not create an account with the OAuth provider.',
          suggestion: 'Please try again or use email/password registration.',
        };
      case 'EmailCreateAccount':
        return {
          title: 'Email Account Creation Failed',
          description: 'Could not create an account with the provided email.',
          suggestion: 'Please check your email and try again.',
        };
      case 'Callback':
        return {
          title: 'Callback Error',
          description: 'There was an error in the authentication callback.',
          suggestion: 'Please try signing in again.',
        };
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Not Linked',
          description: 'This email is already associated with another account. To confirm your identity, sign in with the same account you used originally.',
          suggestion: 'Try signing in with the original method you used for this email.',
        };
      case 'EmailSignin':
        return {
          title: 'Email Sign In Failed',
          description: 'The email sign-in process failed.',
          suggestion: 'Please check your email and try again.',
        };
      case 'CredentialsSignin':
        return {
          title: 'Invalid Credentials',
          description: 'The email or password you entered is incorrect.',
          suggestion: 'Please check your credentials and try again.',
        };
      case 'SessionRequired':
        return {
          title: 'Authentication Required',
          description: 'You must be signed in to access this page.',
          suggestion: 'Please sign in to continue.',
        };
      default:
        return {
          title: 'Authentication Error',
          description: 'An unknown authentication error occurred.',
          suggestion: 'Please try signing in again or contact support if the problem persists.',
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Error Icon */}
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {errorDetails.title}
            </h1>
            <p className="text-gray-600 text-sm">
              {errorDetails.description}
            </p>
          </div>

          {/* Error Code */}
          {error && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Error Code:</span>
                <span className="ml-2 text-gray-600 font-mono">{error}</span>
              </div>
            </div>
          )}

          {/* Suggestion */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 text-blue-600 mt-0.5">
                  💡
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  What you can do:
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  {errorDetails.suggestion}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Sign In Again
            </Link>
            
            {error !== 'SessionRequired' && (
              <Link
                href="/auth/signup"
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create New Account
              </Link>
            )}

            <Link
              href="/"
              className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Graph AI
            </Link>
          </div>
        </div>

        {/* Support Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            If you continue to experience issues, please don't hesitate to contact our support team.
          </p>
          <div className="flex space-x-4 text-sm">
            <a
              href="mailto:support@graphai.com"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Email Support
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Help Center
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}