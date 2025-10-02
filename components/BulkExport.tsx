'use client';

import React, { useState } from 'react';
import {
  bulkExportGraphs,
  exportDashboardToPDF,
  BulkExportOptions
} from '@/lib/export-utils';

interface BulkExportProps {
  graphRefs: React.RefObject<HTMLElement | null>[];
  graphTitles: string[];
  dashboardRef?: React.RefObject<HTMLElement | null>;
  dashboardTitle?: string;
  className?: string;
}

export default function BulkExportComponent({
  graphRefs,
  graphTitles,
  dashboardRef,
  dashboardTitle = 'Dashboard',
  className = ''
}: BulkExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<BulkExportOptions>({
    format: 'png',
    includeTitle: true,
  });

  const handleBulkExport = async () => {
    if (graphRefs.length === 0) {
      alert('No graphs available to export');
      return;
    }

    // Filter out null refs and prepare elements
    const elements = graphRefs
      .map((ref, index) => ({
        element: ref.current,
        title: graphTitles[index] || `Graph ${index + 1}`
      }))
      .filter(({ element }) => element !== null) as {
        element: HTMLElement;
        title: string;
      }[];

    if (elements.length === 0) {
      alert('No valid graph elements found');
      return;
    }

    setIsExporting(true);
    try {
      const filename = `${dashboardTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_graphs`;
      await bulkExportGraphs(elements, {
        ...exportOptions,
        filename: `${filename}.${exportOptions.format === 'pdf' ? 'pdf' : 'zip'}`
      });
    } catch (error) {
      console.error('Bulk export failed:', error);
      alert('Bulk export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDashboardExport = async () => {
    if (!dashboardRef?.current) {
      alert('Dashboard element not found');
      return;
    }

    setIsExporting(true);
    try {
      await exportDashboardToPDF(
        dashboardRef.current,
        dashboardTitle,
        `${dashboardTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dashboard.pdf`
      );
    } catch (error) {
      console.error('Dashboard export failed:', error);
      alert('Dashboard export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const availableGraphs = graphRefs.filter(ref => ref.current !== null).length;

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        📦 Bulk Export
        <span className="ml-2 text-sm text-gray-500 font-normal">
          ({availableGraphs} graphs available)
        </span>
      </h3>

      {/* Export Options */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                format: e.target.value as 'png' | 'pdf'
              }))}
              disabled={isExporting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="png">PNG Images (ZIP)</option>
              <option value="pdf">PDF Document</option>
            </select>
          </div>

          {/* Include Titles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.includeTitle || false}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  includeTitle: e.target.checked
                }))}
                disabled={isExporting}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Include graph titles</span>
            </label>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleBulkExport}
            disabled={isExporting || availableGraphs === 0}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                📊 Export All Graphs
                <span className="ml-1 text-xs">
                  ({exportOptions.format === 'pdf' ? 'PDF' : 'ZIP'})
                </span>
              </>
            )}
          </button>

          {dashboardRef && (
            <button
              onClick={handleDashboardExport}
              disabled={isExporting}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              📄 Export Dashboard PDF
            </button>
          )}
        </div>

        {/* Info Text */}
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
          <p className="mb-1">
            <strong>PNG Images:</strong> Each graph exported as high-quality PNG, packaged in a ZIP file
          </p>
          <p>
            <strong>PDF Document:</strong> All graphs combined in a single PDF with titles and timestamps
          </p>
        </div>

        {/* Graph List */}
        {availableGraphs > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Graphs to Export ({availableGraphs})
            </h4>
            <div className="max-h-32 overflow-y-auto">
              <ul className="text-sm text-gray-600 space-y-1">
                {graphTitles.map((title, index) => (
                  graphRefs[index]?.current && (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {title || `Graph ${index + 1}`}
                    </li>
                  )
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simplified bulk export button for compact spaces
export function BulkExportButton({
  graphRefs,
  graphTitles,
  dashboardTitle = 'Dashboard',
  className = ''
}: Omit<BulkExportProps, 'dashboardRef'>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickBulkExport = async () => {
    const elements = graphRefs
      .map((ref, index) => ({
        element: ref.current,
        title: graphTitles[index] || `Graph ${index + 1}`
      }))
      .filter(({ element }) => element !== null) as {
        element: HTMLElement;
        title: string;
      }[];

    if (elements.length === 0) {
      alert('No graphs available to export');
      return;
    }

    setIsExporting(true);
    try {
      await bulkExportGraphs(elements, {
        format: 'png',
        includeTitle: true,
        filename: `${dashboardTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_graphs.zip`
      });
    } catch (error) {
      console.error('Bulk export failed:', error);
      alert('Bulk export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const availableGraphs = graphRefs.filter(ref => ref.current !== null).length;

  return (
    <button
      onClick={handleQuickBulkExport}
      disabled={isExporting || availableGraphs === 0}
      className={`px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${className}`}
      title={`Export ${availableGraphs} graphs as PNG images`}
    >
      {isExporting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Exporting...
        </>
      ) : (
        <>
          📦 Export All ({availableGraphs})
        </>
      )}
    </button>
  );
}