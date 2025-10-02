'use client';

import React, { useState } from 'react';
import {
  captureScreenshot,
  exportDataAsCSV,
  exportDataAsExcel,
  ExportOptions,
  getOptimalExportSettings
} from '@/lib/export-utils';

interface ExportToolbarProps {
  targetElementRef: React.RefObject<HTMLElement | null>;
  data?: any[];
  title: string;
  className?: string;
}

export default function ExportToolbar({
  targetElementRef,
  data,
  title,
  className = ''
}: ExportToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'pdf'>('png');

  const handleScreenshot = async (format: 'png' | 'jpg' | 'pdf' = exportFormat) => {
    if (!targetElementRef.current) {
      alert('No element to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      const options: ExportOptions = {
        ...getOptimalExportSettings(targetElementRef.current),
        format,
        filename
      };

      await captureScreenshot(targetElementRef.current, options);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDataExport = async (format: 'csv' | 'excel') => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.${format === 'excel' ? 'xlsx' : 'csv'}`;
      
      if (format === 'csv') {
        exportDataAsCSV(data, filename);
      } else {
        await exportDataAsExcel(data, filename, title);
      }
    } catch (error) {
      console.error('Data export failed:', error);
      alert('Data export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const quickExportPNG = () => handleScreenshot('png');
  const quickExportPDF = () => handleScreenshot('pdf');

  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-50 rounded-lg border ${className}`}>
      {/* Quick Export Buttons */}
      <div className="flex gap-1">
        <button
          onClick={quickExportPNG}
          disabled={isExporting}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          title="Export as PNG"
        >
          📷 PNG
        </button>
        <button
          onClick={quickExportPDF}
          disabled={isExporting}
          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          title="Export as PDF"
        >
          📄 PDF
        </button>
      </div>

      {/* Data Export Buttons */}
      {data && data.length > 0 && (
        <>
          <div className="w-px h-6 bg-gray-300"></div>
          <div className="flex gap-1">
            <button
              onClick={() => handleDataExport('csv')}
              disabled={isExporting}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              title="Export data as CSV"
            >
              📊 CSV
            </button>
            <button
              onClick={() => handleDataExport('excel')}
              disabled={isExporting}
              className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              title="Export data as Excel"
            >
              📈 Excel
            </button>
          </div>
        </>
      )}

      {/* Format Selector */}
      <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpg' | 'pdf')}
          disabled={isExporting}
          className="px-2 py-1 border rounded text-xs"
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="pdf">PDF</option>
        </select>
        <button
          onClick={() => handleScreenshot()}
          disabled={isExporting}
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {isExporting ? '⏳ Exporting...' : '📥 Export'}
        </button>
      </div>
    </div>
  );
}

// Floating export button for minimal UI
export function FloatingExportButton({
  targetElementRef,
  data,
  title,
  className = ''
}: ExportToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async () => {
    if (!targetElementRef.current) return;

    setIsExporting(true);
    try {
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      const options: ExportOptions = {
        ...getOptimalExportSettings(targetElementRef.current),
        format: 'png',
        filename
      };

      await captureScreenshot(targetElementRef.current, options);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : handleQuickExport}
        onMouseEnter={() => setIsOpen(true)}
        disabled={isExporting}
        className="w-10 h-10 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
        title={isOpen ? "Show export options" : "Quick export as PNG"}
      >
        {isExporting ? '⏳' : '📷'}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isExporting && (
        <div 
          className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border p-2 min-w-32"
          onMouseLeave={() => setIsOpen(false)}
        >
          <ExportToolbar
            targetElementRef={targetElementRef}
            data={data}
            title={title}
            className="bg-transparent border-0 p-0"
          />
        </div>
      )}
    </div>
  );
}