'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GraphViewer from '@/components/GraphViewer';
import { localStorageManager } from '@/lib/local-storage';
import type { ChartConfig } from '@/lib/chart-generator';
import { Lock, Eye, Clock, Users, AlertCircle, ArrowLeft } from 'lucide-react';

interface SharedGraphData {
  shareId: string;
  graphId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  requiresPassword: boolean;
  createdAt: string;
  accessCount: number;
  graphConfig?: ChartConfig;
}

export default function SharedGraphPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.shareId as string;

  const [sharedData, setSharedData] = useState<SharedGraphData | null>(null);
  const [graphConfig, setGraphConfig] = useState<ChartConfig | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (shareId) {
      loadSharedGraph();
    }
  }, [shareId]);

  const loadSharedGraph = async () => {
    try {
      setIsLoading(true);
      
      // Get share metadata
      const response = await fetch(`/api/share/graph?shareId=${shareId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('This shared graph no longer exists or the link is invalid.');
        } else if (response.status === 410) {
          setError('This share link has expired.');
        } else {
          setError('Failed to load shared graph.');
        }
        return;
      }

      const shareData = await response.json();
      setSharedData(shareData);

      if (shareData.requiresPassword) {
        setNeedsPassword(true);
      } else {
        await loadGraphConfig(shareData.graphId);
      }

    } catch (err) {
      setError('Failed to load shared graph. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGraphConfig = async (graphId: string) => {
    try {
      // Try to load from local storage first
      const localGraph = localStorageManager.getGraph(graphId);
      if (localGraph && localGraph.chartConfig) {
        setGraphConfig(localGraph.chartConfig as ChartConfig);
        return;
      }

      // If not found locally, this is a shared graph from another user
      // In a real app, we'd fetch from the server
      setError('This graph is not available locally. In a full implementation, this would load the graph data from the server.');
    } catch (err) {
      setError('Failed to load graph configuration.');
    }
  };

  const verifyPassword = async () => {
    if (!password.trim()) {
      alert('Please enter a password');
      return;
    }

    setIsVerifying(true);
    try {
      // In a real implementation, we'd verify the password with the server
      // For now, we'll simulate password verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful verification
      if (sharedData) {
        setNeedsPassword(false);
        await loadGraphConfig(sharedData.graphId);
      }
    } catch (err) {
      alert('Invalid password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 p-6 rounded-lg mb-6">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Cannot Load Graph</h2>
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to App
          </button>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Required</h2>
            <p className="text-gray-600">This shared graph is password protected.</p>
          </div>

          {sharedData && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">{sharedData.title}</h3>
              {sharedData.description && (
                <p className="text-sm text-gray-600 mt-1">{sharedData.description}</p>
              )}
              <div className="flex items-center text-xs text-gray-500 mt-2">
                <Clock className="w-3 h-3 mr-1" />
                Shared {new Date(sharedData.createdAt).toLocaleDateString()}
                <span className="mx-2">•</span>
                <Users className="w-3 h-3 mr-1" />
                {sharedData.accessCount} views
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    verifyPassword();
                  }
                }}
              />
            </div>
            <button
              onClick={verifyPassword}
              disabled={isVerifying}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'View Graph'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sharedData || !graphConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Graph not found or not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared Graph Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Visit App
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{sharedData.title}</h1>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  {sharedData.isPublic ? (
                    <Eye className="w-3 h-3 mr-1" />
                  ) : (
                    <Lock className="w-3 h-3 mr-1" />
                  )}
                  <span>{sharedData.isPublic ? 'Public' : 'Private'} shared graph</span>
                  <span className="mx-2">•</span>
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Shared {new Date(sharedData.createdAt).toLocaleDateString()}</span>
                  <span className="mx-2">•</span>
                  <Users className="w-3 h-3 mr-1" />
                  <span>{sharedData.accessCount} views</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Share ID: {shareId}
            </div>
          </div>
          {sharedData.description && (
            <p className="text-gray-600 mt-2">{sharedData.description}</p>
          )}
        </div>
      </div>

      {/* Graph Viewer */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <GraphViewer
          graphId={sharedData.graphId}
          initialConfig={graphConfig}
          title={sharedData.title}
          onBack={() => router.push('/')}
        />
      </div>
    </div>
  );
}