'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { localStorageManager, type StoredGraph } from '@/lib/local-storage';
import ChatGraph from '@/components/ChatGraph';
import type { ChartConfig } from '@/lib/chart-generator';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Download, 
  Trash2, 
  MoreVertical,
  Calendar,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  AreaChart,
  Plus,
  ArrowLeft
} from 'lucide-react';

const CHART_TYPE_ICONS = {
  line: LineChart,
  bar: BarChart,
  pie: PieChart,
  scatter: ScatterChart,
  area: AreaChart,
  default: BarChart
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'type', label: 'Chart Type' }
];

export default function GraphLibraryPage() {
  const router = useRouter();
  const [graphs, setGraphs] = useState<StoredGraph[]>([]);
  const [filteredGraphs, setFilteredGraphs] = useState<StoredGraph[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGraphs();
  }, []);

  useEffect(() => {
    filterAndSortGraphs();
  }, [graphs, searchTerm, selectedType, sortBy]);

  const loadGraphs = () => {
    setIsLoading(true);
    try {
      const allGraphs = localStorageManager.getGraphs();
      setGraphs(allGraphs);
    } catch (err) {
      console.error('Failed to load graphs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortGraphs = () => {
    let filtered = [...graphs];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(graph =>
        graph.title.toLowerCase().includes(term) ||
        graph.description?.toLowerCase().includes(term) ||
        graph.chartType.toLowerCase().includes(term)
      );
    }

    // Filter by chart type
    if (selectedType !== 'all') {
      filtered = filtered.filter(graph => graph.chartType === selectedType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'type':
          return a.chartType.localeCompare(b.chartType);
        default:
          return 0;
      }
    });

    setFilteredGraphs(filtered);
  };

  const deleteGraph = (graphId: string) => {
    if (confirm('Are you sure you want to delete this graph?')) {
      localStorageManager.deleteGraph(graphId);
      loadGraphs();
    }
  };

  const exportGraph = (graph: StoredGraph) => {
    const dataStr = JSON.stringify(graph, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${graph.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getUniqueChartTypes = () => {
    const types = [...new Set(graphs.map(g => g.chartType))];
    return types.sort();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your graph library...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Graph Library</h1>
                <p className="text-gray-600">{graphs.length} graphs saved</p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Graph
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search graphs by title, description, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 border rounded-lg ${
                  showFilters ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-700'
                } hover:border-blue-500`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    {getUniqueChartTypes().map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {filteredGraphs.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 p-6 rounded-lg mb-4">
                <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {graphs.length === 0 ? 'No graphs yet' : 'No graphs found'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {graphs.length === 0 
                    ? 'Start creating amazing visualizations by uploading data files in the chat.'
                    : 'Try adjusting your search terms or filters.'
                  }
                </p>
                {graphs.length === 0 && (
                  <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Graph
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredGraphs.map((graph) => {
              const IconComponent = CHART_TYPE_ICONS[graph.chartType as keyof typeof CHART_TYPE_ICONS] || CHART_TYPE_ICONS.default;
              
              if (viewMode === 'list') {
                return (
                  <div key={graph.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="p-2 bg-gray-100 rounded">
                          <IconComponent className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {graph.title}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <span className="capitalize">{graph.chartType}</span>
                            <span className="mx-2">•</span>
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>{new Date(graph.createdAt).toLocaleDateString()}</span>
                          </div>
                          {graph.description && (
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {graph.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/graph/${graph.id}`}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => exportGraph(graph)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Export"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteGraph(graph.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={graph.id} className="relative group">
                  <ChatGraph
                    graphId={graph.id}
                    config={graph.chartConfig as ChartConfig}
                    title={graph.title}
                    description={graph.description}
                    compact={false}
                    showActions={true}
                  />
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => exportGraph(graph)}
                        className="p-1.5 bg-white/90 text-gray-600 hover:text-gray-900 rounded shadow-sm"
                        title="Export graph"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteGraph(graph.id)}
                        className="p-1.5 bg-white/90 text-gray-600 hover:text-red-600 rounded shadow-sm"
                        title="Delete graph"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}