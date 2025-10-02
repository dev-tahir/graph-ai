'use client';

import { useState } from 'react';
import { X, Link2, Lock, Globe, Calendar, Copy, Download } from 'lucide-react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemType: 'graph' | 'chat';
  title: string;
  description?: string;
}

const ShareDialog = ({
  isOpen,
  onClose,
  itemId,
  itemType,
  title,
  description
}: ShareDialogProps) => {
  const [shareConfig, setShareConfig] = useState({
    isPublic: true,
    password: '',
    hasPassword: false,
    expiresAt: '',
    hasExpiration: false
  });
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateShare = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/share/${itemType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [`${itemType}Id`]: itemId,
          title,
          description,
          isPublic: shareConfig.isPublic,
          password: shareConfig.hasPassword ? shareConfig.password : undefined,
          expiresAt: shareConfig.hasExpiration ? new Date(shareConfig.expiresAt).toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link');
      }
    }
  };

  const handleShare = async () => {
    if (shareUrl && navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: shareUrl,
          text: description || `Check out this ${itemType}: ${title}`,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const resetDialog = () => {
    setShareUrl(null);
    setShareConfig({
      isPublic: true,
      password: '',
      hasPassword: false,
      expiresAt: '',
      hasExpiration: false
    });
    setError(null);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Share {itemType === 'graph' ? 'Graph' : 'Chat'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Item Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900">{title}</h4>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>

          {shareUrl ? (
            /* Share Link Created */
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600 mb-4">
                <Link2 className="w-4 h-4" />
                <span className="text-sm font-medium">Share link created successfully!</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleShare}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Share
                </button>
                <button
                  onClick={resetDialog}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Create Another
                </button>
              </div>
            </div>
          ) : (
            /* Share Configuration */
            <div className="space-y-6">
              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Visibility
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      checked={shareConfig.isPublic}
                      onChange={() => setShareConfig(prev => ({ ...prev, isPublic: true }))}
                      className="mr-3"
                    />
                    <Globe className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-sm">Public - Anyone with the link can view</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!shareConfig.isPublic}
                      onChange={() => setShareConfig(prev => ({ ...prev, isPublic: false }))}
                      className="mr-3"
                    />
                    <Lock className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="text-sm">Private - Only you can share the link</span>
                  </label>
                </div>
              </div>

              {/* Password Protection */}
              <div>
                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={shareConfig.hasPassword}
                    onChange={(e) => setShareConfig(prev => ({ 
                      ...prev, 
                      hasPassword: e.target.checked,
                      password: e.target.checked ? prev.password : ''
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Password Protection</span>
                </label>
                {shareConfig.hasPassword && (
                  <input
                    type="password"
                    placeholder="Enter password..."
                    value={shareConfig.password}
                    onChange={(e) => setShareConfig(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Expiration */}
              <div>
                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={shareConfig.hasExpiration}
                    onChange={(e) => setShareConfig(prev => ({ 
                      ...prev, 
                      hasExpiration: e.target.checked,
                      expiresAt: e.target.checked ? prev.expiresAt : ''
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Link Expiration</span>
                </label>
                {shareConfig.hasExpiration && (
                  <input
                    type="datetime-local"
                    value={shareConfig.expiresAt}
                    onChange={(e) => setShareConfig(prev => ({ ...prev, expiresAt: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateShare}
                  disabled={isCreating || (shareConfig.hasPassword && !shareConfig.password.trim())}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Share Link'}
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;