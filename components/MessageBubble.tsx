'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Edit2, Check, X, Reply, Copy, Trash2, MoreVertical } from 'lucide-react';
import { FileItem } from './FileUpload';
import ChatGraph from './ChatGraph';
import { nanoid } from 'nanoid';
import type { ChartConfig } from '@/lib/chart-generator';

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
            charts.push({
              id: nanoid(),
              title: parsed.title || 'Untitled Chart',
              description: parsed.description,
              chartType: parsed.chartType,
              config: parsed.config
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
        ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}
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
          <div className={`text-sm font-medium ${isUser ? 'order-2' : ''}`}>
            {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
            {message.isEdited && (
              <span className="ml-1 text-xs text-gray-500">(edited)</span>
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
                  absolute top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-10
                  ${isUser ? 'right-0' : 'left-0'}
                `}>
                  {isUser && onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center space-x-2"
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
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center space-x-2"
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
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center space-x-2"
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
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-red-600 flex items-center space-x-2"
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
          max-w-none prose prose-sm 
          ${isUser ? 'text-right' : ''}
          ${isSystem ? 'text-gray-600 italic' : ''}
        `}>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <ChatGraph
                key={chart.id}
                graphId={chart.id}
                config={chart.config}
                title={chart.title}
                description={chart.description}
                compact={false}
                showActions={true}
              />
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
        <div className={`text-xs text-gray-500 mt-2 ${isUser ? 'text-right' : ''}`}>
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