'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChartRenderer from './ChartRenderer';
import type { ChartConfig } from '@/lib/chart-generator';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Clock, 
  Eye, 
  EyeOff,
  RotateCcw,
  Settings,
  Maximize2,
  Minimize2,
  GitCompare
} from 'lucide-react';
import VersionComparison from './VersionComparison';
import { localStorageManager } from '@/lib/local-storage';

interface GraphVersion {
  id: string;
  config: ChartConfig;
  timestamp: Date;
  title?: string;
  description?: string;
}

interface GraphViewerProps {
  graphId: string;
  initialConfig?: ChartConfig;
  title?: string;
  onBack?: () => void;
}

const GraphViewer = ({ 
  graphId, 
  initialConfig, 
  title, 
  onBack 
}: GraphViewerProps) => {
  const router = useRouter();
  const [currentConfig, setCurrentConfig] = useState<ChartConfig | null>(initialConfig || null);
  const [versions, setVersions] = useState<GraphVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialConfig);
  const [error, setError] = useState<string | null>(null);

  const storageManager = localStorageManager;

  useEffect(() => {
    if (!initialConfig) {
      loadGraph();
    }
    loadVersions();
  }, [graphId]);

  const loadGraph = async () => {
    try {
      setIsLoading(true);
      // Load from localStorage
      const graph = storageManager.getGraph(graphId);
      if (graph && graph.chartConfig) {
        setCurrentConfig(graph.chartConfig as ChartConfig);
      } else {
        setError('Graph not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVersions = () => {
    try {
      const graphVersions = storageManager.getGraphVersions(graphId);
      const parsedVersions = graphVersions.map(graph => ({
        id: graph.id,
        config: graph.chartConfig as ChartConfig,
        timestamp: new Date(graph.createdAt),
        title: graph.title,
        description: graph.description
      }));
      setVersions(parsedVersions);
    } catch (err) {
      console.warn('Failed to load graph versions:', err);
    }
  };

  const saveVersion = (config: ChartConfig, description?: string) => {
    const newVersion: GraphVersion = {
      id: Date.now().toString(),
      config,
      timestamp: new Date(),
      title: title,
      description
    };

    const updatedVersions = [newVersion, ...versions.slice(0, 9)]; // Keep last 10 versions
    setVersions(updatedVersions);
    
    // Save to localStorage as a StoredGraph
    const storedGraph = {
      id: newVersion.id,
      title: title || 'Untitled Graph',
      description: description,
      chartType: config.type,
      chartConfig: config,
      data: config.data,
      version: versions.length + 1,
      originalGraphId: graphId,
      createdAt: new Date().toISOString()
    };
    
    storageManager.saveGraph(storedGraph);
    
    // Update the main graph as well
    const mainGraph = {
      id: graphId,
      title: title || 'Untitled Graph',
      description: description,
      chartType: config.type,
      chartConfig: config,
      data: config.data,
      version: 1,
      createdAt: new Date().toISOString()
    };
    
    storageManager.saveGraph(mainGraph);
  };

  const loadVersion = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setCurrentConfig(version.config);
      setSelectedVersion(versionId);
    }
  };

  const handleConfigUpdate = (config: ChartConfig) => {
    setCurrentConfig(config);
    saveVersion(config, 'Updated configuration');
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: title || 'Graph View',
        url: window.location.href,
        text: `Check out this graph: ${title || 'Data Visualization'}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleReset = () => {
    if (initialConfig) {
      setCurrentConfig(initialConfig);
      setSelectedVersion(null);
    }
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

  if (error || !currentConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 p-4 rounded-lg mb-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Graph</h2>
            <p className="text-red-700">{error || 'Graph configuration not found'}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Header */}
      <div className={`bg-white border-b border-gray-200 ${isFullscreen ? 'p-2' : 'px-6 py-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack || (() => router.back())}
              className={`flex items-center space-x-2 text-gray-600 hover:text-gray-900 ${
                isFullscreen ? 'text-sm' : ''
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            {!isFullscreen && (
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {title || 'Graph View'}
                </h1>
                <p className="text-sm text-gray-500">Graph ID: {graphId}</p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isFullscreen && (
              <>
                <button
                  onClick={() => setShowVersions(!showVersions)}
                  className={`p-2 rounded ${
                    showVersions ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Version history"
                >
                  <Clock className="w-4 h-4" />
                </button>
                
                {versions.length >= 2 && (
                  <button
                    onClick={() => setShowComparison(true)}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="Compare versions"
                  >
                    <GitCompare className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={handleShare}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Share graph"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </>
            )}
            
            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-500 hover:text-gray-700"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Version sidebar */}
        {showVersions && !isFullscreen && (
          <div className="w-80 bg-white border-r border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Version History</h3>
              <button
                onClick={() => setShowVersions(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {versions.length === 0 ? (
                <p className="text-sm text-gray-500">No versions saved yet</p>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedVersion === version.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => loadVersion(version.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {version.timestamp.toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {version.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {version.description && (
                      <p className="text-xs text-gray-600">{version.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className={`flex-1 ${isFullscreen ? 'p-4' : 'p-6'}`}>
          <ChartRenderer
            config={currentConfig}
            title={isFullscreen ? undefined : title}
            onConfigUpdate={handleConfigUpdate}
            onDownload={() => {}}
            onFullscreen={handleFullscreen}
            onReset={handleReset}
            showControls={!isFullscreen}
            className={isFullscreen ? 'h-full' : ''}
          />
        </div>
      </div>
      {/* Version Comparison Modal */}
      {showComparison && (
        <div className="fixed inset-0 z-50 bg-white">
          <VersionComparison
            versions={versions}
            onClose={() => setShowComparison(false)}
          />
        </div>
      )}
    </div>
  );
};

export default GraphViewer;