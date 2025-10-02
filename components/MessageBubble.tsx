'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Edit2, Check, X, Reply, Copy, Trash2, MoreVertical, Loader2, CheckCircle } from 'lucide-react';
import { FileItem } from './FileUpload';
import ChatGraph from './ChatGraph';
import { nanoid } from 'nanoid';
import { localStorageManager } from '@/lib/local-storage';
import type { ChartConfig } from '@/lib/chart-generator';

// Chart Loading State Component
const ChartLoadingState = ({ title, description }: { title: string; description?: string }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h4>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {description}
            </p>
          )}
          <div className="flex items-center mt-2">
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Saving chart to database...
            </span>
          </div>
        </div>
      </div>
      
      {/* Loading placeholder for chart area */}
      <div className="mt-3 bg-gray-100 dark:bg-gray-700 rounded-lg h-64 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Preparing chart...
          </p>
        </div>
      </div>
      
      {/* Disabled action buttons to show it's not ready yet */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-500">
          Chart will be available shortly
        </div>
        <div className="flex space-x-2">
          <button
            disabled
            className="px-3 py-1 text-xs bg-gray-200 text-gray-400 rounded cursor-not-allowed"
          >
            View Fullscreen
          </button>
          <button
            disabled
            className="px-3 py-1 text-xs bg-gray-200 text-gray-400 rounded cursor-not-allowed"
          >
            Save to Library
          </button>
        </div>
      </div>
    </div>
  );
};

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
  parentId?: string;
  files?: Array<{
    id: string;
    originalName: string;
    size: number;
    mimetype: string;
    data?: any;
  }>;
  graphs?: Array<{
    id: string;
    title: string;
    description?: string;
    chartType: string;
  }>;
}

interface MessageBubbleProps {
  message: Message;
  onEdit?: (id: string, content: string) => void;
  onReply?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: (message: Message) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

const MessageBubble = ({ 
  message, 
  onEdit, 
  onReply, 
  onDelete, 
  onSelect,
  isSelected = false,
  showActions = true 
}: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMenu, setShowMenu] = useState(false);
  const [parsedCharts, setParsedCharts] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    chartType: string;
    config: ChartConfig;
    isLoading?: boolean;
    isSaved?: boolean;
    justSaved?: boolean;
  }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse charts from message content
  useEffect(() => {
    const parseChartsFromContent = () => {
      const charts: Array<{
        id: string;
        title: string;
        description?: string;
        chartType: string;
        config: ChartConfig;
        isLoading?: boolean;
        isSaved?: boolean;
        justSaved?: boolean;
      }> = [];
      
      // Look for JSON code blocks containing chart configurations
      const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
      let match;
      
      while ((match = jsonBlockRegex.exec(message.content)) !== null) {
        try {
          const jsonContent = match[1].trim();
          const parsed = JSON.parse(jsonContent);
          
          // Check if it's a chart configuration
          if (parsed.type === 'chart' && parsed.config && parsed.chartType) {
            // Use graphId from the JSON if available (set after database save)
            let chartId = parsed.graphId;
            
            if (!chartId) {
              // Try to find existing saved graph with matching title and config
              const existingGraphs = localStorageManager.getGraphs();
              const existingGraph = existingGraphs.find(graph => 
                graph.title === (parsed.title || 'Untitled Chart') &&
                JSON.stringify(graph.chartConfig) === JSON.stringify(parsed.config)
              );
              chartId = existingGraph?.id || nanoid();
            }
            
            // Check if this chart is already saved (has a real database ID)
            const existingGraphs = localStorageManager.getGraphs();
            const existingGraph = existingGraphs.find(graph => graph.id === chartId);
            
            charts.push({
              id: chartId,
              title: parsed.title || 'Untitled Chart',
              description: parsed.description,
              chartType: parsed.chartType,
              config: parsed.config,
              isLoading: !existingGraph, // Loading if not found in local storage
              isSaved: !!existingGraph  // Saved if found in local storage
            });
          }
        } catch (err) {
          // Invalid JSON, skip
          console.warn('Failed to parse JSON block:', err);
        }
      }
      
      setParsedCharts(charts);
    };

    if (message.role === 'assistant') {
      parseChartsFromContent();
    }
  }, [message.content, message.role]);

  // Poll for chart save status updates
  useEffect(() => {
    const hasLoadingCharts = parsedCharts.some(chart => chart.isLoading);
    if (!hasLoadingCharts) return;

    const checkSaveStatus = () => {
      const existingGraphs = localStorageManager.getGraphs();
      
      setParsedCharts(prev => prev.map(chart => {
        if (chart.isLoading) {
          const savedGraph = existingGraphs.find(graph => 
            graph.title === chart.title &&
            JSON.stringify(graph.chartConfig) === JSON.stringify(chart.config)
          );
          
          if (savedGraph) {
            return {
              ...chart,
              id: savedGraph.id, // Update with actual saved ID
              isLoading: false,
              isSaved: true,
              justSaved: true
            };
          }
        }
        return chart;
      }));
    };

    const interval = setInterval(checkSaveStatus, 500); // Check every 500ms
    
    // Stop polling after 10 seconds to avoid infinite polling
    const timeout = setTimeout(() => {
      clearInterval(interval);
      // Mark any still-loading charts as failed/timeout
      setParsedCharts(prev => prev.map(chart => 
        chart.isLoading ? { ...chart, isLoading: false, isSaved: false } : chart
      ));
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [parsedCharts]);

  // Clear justSaved flag after 3 seconds
  useEffect(() => {
    const justSavedCharts = parsedCharts.filter(chart => chart.justSaved);
    if (justSavedCharts.length === 0) return;

    const timeout = setTimeout(() => {
      setParsedCharts(prev => prev.map(chart => 
        chart.justSaved ? { ...chart, justSaved: false } : chart
      ));
    }, 3000);

    return () => clearTimeout(timeout);
  }, [parsedCharts]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div 
      className={`
        flex items-start space-x-3 p-4 rounded-lg transition-colors cursor-pointer
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
        ${isUser ? 'flex-row-reverse space-x-reverse' : ''}
      `}
      onClick={() => onSelect && onSelect(message)}
    >
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
        ${isUser ? 'bg-blue-500 text-white' : isSystem ? 'bg-gray-500 text-white' : 'bg-green-500 text-white'}
      `}>
        {isUser ? 'U' : isSystem ? 'S' : 'AI'}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className="flex items-center justify-between mb-1">
          <div className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${isUser ? 'order-2' : ''}`}>
            {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
            {message.isEdited && (
              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(edited)</span>
            )}
          </div>
          
          {showActions && (
            <div className={`relative ${isUser ? 'order-1' : ''}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className={`
                  absolute top-full mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10
                  ${isUser ? 'right-0' : 'left-0'}
                `}>
                  {isUser && onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                  
                  {onReply && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReply(message.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Reply className="w-3 h-3" />
                      <span>Reply</span>
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                    }}
                    className="w-full px-3 py-2 text-sm text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  
                  {isUser && onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(message.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center space-x-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Text */}
        <div className={`
          max-w-none prose prose-sm text-gray-900 dark:text-gray-100
          ${isUser ? 'text-right' : ''}
          ${isSystem ? 'text-gray-600 dark:text-gray-400 italic' : ''}
        `}>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 flex items-center space-x-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={isUser ? 'text-right' : ''}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* File Attachments */}
        {message.files && message.files.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                showPreview={true}
              />
            ))}
          </div>
        )}

        {/* Parsed Charts from AI Response */}
        {parsedCharts.length > 0 && (
          <div className="mt-4 space-y-4">
            {parsedCharts.map((chart) => (
              chart.isLoading ? (
                <ChartLoadingState
                  key={chart.id}
                  title={chart.title}
                  description={chart.description}
                />
              ) : (
                <div className="relative">
                  <ChatGraph
                    key={chart.id}
                    graphId={chart.id}
                    config={chart.config}
                    title={chart.title}
                    description={chart.description}
                    compact={false}
                    showActions={true}
                  />
                  {chart.justSaved && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1 shadow-lg animate-pulse">
                      <CheckCircle className="w-3 h-3" />
                      <span>Saved!</span>
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}

        {/* Graphs */}
        {message.graphs && message.graphs.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.graphs.map((graph) => (
              <div
                key={graph.id}
                className="border border-gray-200 rounded-lg p-3 bg-blue-50 cursor-pointer hover:bg-blue-100"
                onClick={() => window.open(`/graph/${graph.id}`, '_blank')}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                  <span className="font-medium text-sm">{graph.title}</span>
                </div>
                {graph.description && (
                  <p className="text-xs text-gray-600 mt-1">{graph.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.createdAt).toLocaleString()}
          {message.editedAt && (
            <span className="ml-1">
              (edited {new Date(message.editedAt).toLocaleString()})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export { MessageBubble };
export type { Message, MessageBubbleProps };