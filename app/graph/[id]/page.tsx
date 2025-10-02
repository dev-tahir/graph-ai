'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import GraphViewer from '@/components/GraphViewer';
import { localStorageManager } from '@/lib/local-storage';
import type { ChartConfig } from '@/lib/chart-generator';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function GraphPage() {
  const params = useParams();
  const router = useRouter();
  const graphId = params.id as string;
  const [initialConfig, setInitialConfig] = useState<ChartConfig | null>(null);
  const [graphTitle, setGraphTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (graphId) {
      loadGraphData();
    }
  }, [graphId]);

  const loadGraphData = async () => {
    try {
      setIsLoading(true);
      const graph = localStorageManager.getGraph(graphId);
      
      if (graph) {
        setInitialConfig(graph.chartConfig as ChartConfig);
        setGraphTitle(graph.title);
      } else {
        setError('Graph not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading graph...</p>
        </div>
      </div>
    );
  }

  if (error || !initialConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Graph Not Found</h2>
            <p className="text-red-700 mb-4">
              {error || 'The requested graph could not be found.'}
            </p>
            <p className="text-sm text-red-600">
              Graph ID: {graphId}
            </p>
          </div>
          
          <div className="flex space-x-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GraphViewer
      graphId={graphId}
      initialConfig={initialConfig}
      title={graphTitle}
      onBack={handleBack}
    />
  );
}