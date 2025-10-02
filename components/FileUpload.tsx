'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Database } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
}

const FileUpload = ({ onFileUpload, disabled = false, multiple = false }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileUpload(acceptedFiles);
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple,
    disabled,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <div>
                <p>
                  <span className="font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  CSV, JSON, Excel files (max 10MB)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface FileItemProps {
  file: {
    id: string;
    originalName: string;
    size: number;
    mimetype: string;
    data?: {
      headers: string[];
      sampleRows: any[][];
      type: 'csv' | 'json' | 'excel';
      analysis?: any;
    };
  };
  onRemove?: (id: string) => void;
  showPreview?: boolean;
}

const FileItem = ({ file, onRemove, showPreview = false }: FileItemProps) => {
  const [expanded, setExpanded] = useState(false);
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (file.mimetype.includes('csv')) return <FileText className="w-4 h-4 text-green-500" />;
    if (file.mimetype.includes('json')) return <Database className="w-4 h-4 text-blue-500" />;
    if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) {
      return <FileText className="w-4 h-4 text-orange-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.originalName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(file.size)}
              {file.data && (
                <span className="ml-2">
                  • {file.data.analysis?.summary.totalRows} rows, {file.data.analysis?.summary.totalColumns} columns
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showPreview && file.data && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {expanded ? 'Hide' : 'Preview'}
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(file.id)}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {expanded && file.data && (
        <div className="mt-3 border-t pt-3">
          <div className="text-xs text-gray-600 mb-2">
            Data Preview ({file.data.type.toUpperCase()})
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {file.data.headers.slice(0, 5).map((header, i) => (
                    <th key={i} className="px-2 py-1 text-left font-medium text-gray-700 border border-gray-200">
                      {header}
                    </th>
                  ))}
                  {file.data.headers.length > 5 && (
                    <th className="px-2 py-1 text-left font-medium text-gray-700 border border-gray-200">
                      ...
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {file.data.sampleRows.slice(0, 3).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.slice(0, 5).map((cell, j) => (
                      <td key={j} className="px-2 py-1 border border-gray-200 text-gray-900">
                        {String(cell).slice(0, 20)}{String(cell).length > 20 ? '...' : ''}
                      </td>
                    ))}
                    {row.length > 5 && (
                      <td className="px-2 py-1 border border-gray-200 text-gray-500">
                        ...
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {file.data.analysis && (
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">Analysis:</span>{' '}
              {file.data.analysis.summary.numericColumns.length} numeric columns, {' '}
              {file.data.analysis.summary.categoricalColumns.length} categorical columns
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { FileUpload, FileItem };
export type { FileUploadProps, FileItemProps };