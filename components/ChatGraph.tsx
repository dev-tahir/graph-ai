'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import ChartRenderer from './ChartRenderer';
import type { ChartConfig } from '@/lib/chart-generator';
import { 
  ExternalLink, 
  Download, 
  Maximize2, 
  Copy, 
  Share2,
  Eye,
  MoreVertical
} from 'lucide-react';
import { localStorageManager } from '@/lib/local-storage';

interface ChatGraphProps {
  graphId: string;
  config: ChartConfig;
  title?: string;
  description?: string;
  compact?: boolean;
  showActions?: boolean;
}

const ChatGraph = ({
  graphId,
  config,
  title,
  description,
  compact = false,
  showActions = true
}: ChatGraphProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Find the canvas element in the chart
      const canvas = chartRef.current?.querySelector('canvas');
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${title || 'graph'}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
      setShowMenu(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/graph/${graphId}`;
      await navigator.clipboard.writeText(url);
      alert('Graph link copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
    }
    setShowMenu(false);
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/graph/${graphId}`;
      const shareData = {
        title: title || 'Graph Visualization',
        url,
        text: description || 'Check out this data visualization'
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await handleCopyLink();
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
    setShowMenu(false);
  };

  const handleSaveToLibrary = () => {
    try {
      const storedGraph = {
        id: graphId,
        title: title || 'Untitled Graph',
        description: description,
        chartType: config.type,
        chartConfig: config,
        data: config.data,
        version: 1,
        createdAt: new Date().toISOString()
      };
      
      localStorageManager.saveGraph(storedGraph);
      alert('Graph saved to your library!');
    } catch (err) {
      console.error('Save failed:', err);
    }
    setShowMenu(false);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${compact ? 'max-w-md' : ''}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {title}
              </h4>
            )}
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <span className="capitalize">{config.type}</span>
              <span className="mx-1">•</span>
              <span>{config.data.datasets.length} dataset(s)</span>
              {!compact && (
                <>
                  <span className="mx-1">•</span>
                  <span>{config.data.labels?.length || 0} points</span>
                </>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center space-x-1 ml-3">
              <Link
                href={`/graph/${graphId}`}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="View fullscreen"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="More options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isDownloading ? 'Downloading...' : 'Download PNG'}
                    </button>
                    
                    <button
                      onClick={handleCopyLink}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </button>
                    
                    <button
                      onClick={handleShare}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </button>
                    
                    <hr className="my-1" />
                    
                    <button
                      onClick={handleSaveToLibrary}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Save to Library
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {description && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Chart */}
      <div ref={chartRef} className={compact ? 'p-3' : 'p-4'}>
        <div style={{ position: 'relative', height: compact ? '200px' : '300px', width: '100%' }}>
          <ChartRenderer
            config={config}
            showControls={false}
            className="h-full"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>ID: {graphId.slice(0, 8)}...</span>
          <Link
            href={`/graph/${graphId}`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details →
          </Link>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default ChatGraph;