'use client';

import { useState } from 'react';
import ChartRenderer from './ChartRenderer';
import type { ChartConfig } from '@/lib/chart-generator';
import { ArrowLeft, ArrowRight, Calendar, Eye, Download } from 'lucide-react';

interface GraphVersion {
  id: string;
  config: ChartConfig;
  timestamp: Date;
  title?: string;
  description?: string;
}

interface VersionComparisonProps {
  versions: GraphVersion[];
  onClose: () => void;
}

const VersionComparison = ({ versions, onClose }: VersionComparisonProps) => {
  const [selectedVersions, setSelectedVersions] = useState<{
    left: GraphVersion | null;
    right: GraphVersion | null;
  }>({
    left: versions[1] || null,
    right: versions[0] || null
  });

  if (versions.length < 2) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 mb-4">Need at least 2 versions to compare</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    );
  }

  const downloadComparison = () => {
    const comparisonData = {
      versions: selectedVersions,
      comparison: {
        chartTypes: {
          left: selectedVersions.left?.config.type,
          right: selectedVersions.right?.config.type,
          changed: selectedVersions.left?.config.type !== selectedVersions.right?.config.type
        },
        datasets: {
          left: selectedVersions.left?.config.data.datasets.length,
          right: selectedVersions.right?.config.data.datasets.length,
          changed: selectedVersions.left?.config.data.datasets.length !== selectedVersions.right?.config.data.datasets.length
        },
        dataPoints: {
          left: selectedVersions.left?.config.data.labels?.length,
          right: selectedVersions.right?.config.data.labels?.length,
          changed: selectedVersions.left?.config.data.labels?.length !== selectedVersions.right?.config.data.labels?.length
        },
        timestamp: new Date().toISOString()
      }
    };

    const dataStr = JSON.stringify(comparisonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `version-comparison-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Version Comparison</h1>
          </div>
          <button
            onClick={downloadComparison}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Comparison
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Version Selectors */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Left Version Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version A
            </label>
            <select
              value={selectedVersions.left?.id || ''}
              onChange={(e) => {
                const version = versions.find(v => v.id === e.target.value);
                setSelectedVersions(prev => ({ ...prev, left: version || null }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a version</option>
              {versions.map(version => (
                <option key={version.id} value={version.id}>
                  {version.timestamp.toLocaleDateString()} {version.timestamp.toLocaleTimeString()} 
                  {version.description && ` - ${version.description}`}
                </option>
              ))}
            </select>
          </div>

          {/* Right Version Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version B
            </label>
            <select
              value={selectedVersions.right?.id || ''}
              onChange={(e) => {
                const version = versions.find(v => v.id === e.target.value);
                setSelectedVersions(prev => ({ ...prev, right: version || null }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a version</option>
              {versions.map(version => (
                <option key={version.id} value={version.id}>
                  {version.timestamp.toLocaleDateString()} {version.timestamp.toLocaleTimeString()}
                  {version.description && ` - ${version.description}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Results */}
        {selectedVersions.left && selectedVersions.right && (
          <>
            {/* Differences Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Changes Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    selectedVersions.left.config.type !== selectedVersions.right.config.type 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {selectedVersions.left.config.type !== selectedVersions.right.config.type ? 'Changed' : 'Unchanged'}
                  </div>
                  <div className="text-sm text-gray-600">Chart Type</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedVersions.left.config.type} → {selectedVersions.right.config.type}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    selectedVersions.left.config.data.datasets.length !== selectedVersions.right.config.data.datasets.length 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {selectedVersions.left.config.data.datasets.length !== selectedVersions.right.config.data.datasets.length ? 'Changed' : 'Unchanged'}
                  </div>
                  <div className="text-sm text-gray-600">Datasets</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedVersions.left.config.data.datasets.length} → {selectedVersions.right.config.data.datasets.length}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    selectedVersions.left.config.data.labels?.length !== selectedVersions.right.config.data.labels?.length 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {selectedVersions.left.config.data.labels?.length !== selectedVersions.right.config.data.labels?.length ? 'Changed' : 'Unchanged'}
                  </div>
                  <div className="text-sm text-gray-600">Data Points</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedVersions.left.config.data.labels?.length || 0} → {selectedVersions.right.config.data.labels?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-side Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Chart */}
              <div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Version A</h4>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {selectedVersions.left.timestamp.toLocaleString()}
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {selectedVersions.left.config.type}
                      </div>
                    </div>
                    {selectedVersions.left.description && (
                      <p className="text-sm text-gray-600 mt-2">{selectedVersions.left.description}</p>
                    )}
                  </div>
                  <div className="p-4">
                    <ChartRenderer
                      config={selectedVersions.left.config}
                      showControls={false}
                    />
                  </div>
                </div>
              </div>

              {/* Right Chart */}
              <div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Version B</h4>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {selectedVersions.right.timestamp.toLocaleString()}
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {selectedVersions.right.config.type}
                      </div>
                    </div>
                    {selectedVersions.right.description && (
                      <p className="text-sm text-gray-600 mt-2">{selectedVersions.right.description}</p>
                    )}
                  </div>
                  <div className="p-4">
                    <ChartRenderer
                      config={selectedVersions.right.config}
                      showControls={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VersionComparison;