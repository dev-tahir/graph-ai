'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import type { ChartConfig } from '@/lib/chart-generator';
import { validateChartConfig, optimizeChartForDisplay } from '@/lib/chart-generator';
import { Maximize2, Settings, RotateCcw } from 'lucide-react';
import ExportToolbar, { FloatingExportButton } from './ExportToolbar';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

interface ChartRendererProps {
  config: ChartConfig;
  title?: string;
  onConfigUpdate?: (config: ChartConfig) => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  onReset?: () => void;
  showControls?: boolean;
  showExport?: boolean;
  exportStyle?: 'toolbar' | 'floating' | 'none';
  data?: any[];
  className?: string;
}

const ChartRenderer = ({
  config,
  title,
  onConfigUpdate,
  onDownload,
  onFullscreen,
  onReset,
  showControls = true,
  showExport = true,
  exportStyle = 'toolbar',
  data,
  className = ''
}: ChartRendererProps) => {
  const chartRef = useRef<ChartJS<any, any, any> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig>(config);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      // Validate and optimize the chart configuration
      const validation = validateChartConfig(config);
      if (!validation.valid) {
        setError(`Chart validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      const optimizedConfig = optimizeChartForDisplay(config);
      setChartConfig(optimizedConfig);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render chart');
    }
  }, [config]);

  const handleDownload = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${title || 'chart'}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = url;
      link.click();
    }
    onDownload?.();
  };

  const handleDataToggle = (datasetIndex: number, show: boolean) => {
    if (chartRef.current) {
      const chart = chartRef.current;
      chart.setDatasetVisibility(datasetIndex, show);
      chart.update();
    }
  };

  if (error) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <h3 className="font-semibold text-red-800">Chart Error</h3>
        </div>
        <p className="text-red-700 text-sm">{error}</p>
        {onReset && (
          <button
            onClick={onReset}
            className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Chart</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`bg-white border border-gray-200 rounded-lg overflow-hidden relative ${className}`}>
      {/* Floating Export Button */}
      {showExport && exportStyle === 'floating' && (
        <div className="absolute top-4 right-4 z-10">
          <FloatingExportButton
            targetElementRef={containerRef}
            data={data}
            title={title || 'Chart'}
          />
        </div>
      )}

      {/* Header */}
      {(title || showControls) && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
              <div className="text-sm text-gray-500">
                {chartConfig.type} chart • {chartConfig.data.datasets.length} dataset(s)
              </div>
            </div>
            
            {showControls && (
              <div className="flex items-center space-x-2">
                {onFullscreen && (
                  <button
                    onClick={onFullscreen}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="View fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Toolbar */}
      {showExport && exportStyle === 'toolbar' && (
        <div className="px-4 pt-3">
          <ExportToolbar
            targetElementRef={containerRef}
            data={data}
            title={title || 'Chart'}
          />
        </div>
      )}

      {/* Data toggles for multi-dataset charts */}
      {chartConfig.data.datasets.length > 1 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex flex-wrap gap-2">
            {chartConfig.data.datasets.map((dataset, index) => (
              <label key={index} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  onChange={(e) => handleDataToggle(index, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div
                  className="w-3 h-3 rounded-sm border"
                  style={{
                    backgroundColor: Array.isArray(dataset.backgroundColor)
                      ? dataset.backgroundColor[0]
                      : dataset.backgroundColor,
                    borderColor: Array.isArray(dataset.borderColor)
                      ? dataset.borderColor[0]
                      : dataset.borderColor,
                  }}
                ></div>
                <span className="text-gray-700">{dataset.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        <div style={{ position: 'relative', height: '400px', width: '100%' }}>
          <Chart
            ref={chartRef}
            type={chartConfig.type as any}
            data={chartConfig.data}
            options={{
              ...chartConfig.options,
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                ...chartConfig.options.plugins,
                legend: {
                  ...chartConfig.options.plugins?.legend,
                  display: chartConfig.data.datasets.length <= 1 ? false : true,
                },
                tooltip: {
                  ...chartConfig.options.plugins?.tooltip,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: 'white',
                  bodyColor: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                },
              },
              animation: {
                duration: 1000,
                easing: 'easeInOutQuart',
              },
              interaction: {
                intersect: false,
                mode: 'index' as const,
              },
            }}
          />
        </div>
      </div>

      {/* Chart statistics */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Data Points:</span>
            <span className="ml-1 font-medium">
              {chartConfig.type === 'scatter' || chartConfig.type === 'bubble'
                ? chartConfig.data.datasets[0]?.data.length || 0
                : chartConfig.data.labels?.length || 0}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Datasets:</span>
            <span className="ml-1 font-medium">{chartConfig.data.datasets.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Type:</span>
            <span className="ml-1 font-medium capitalize">{chartConfig.type}</span>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>
            <span className="ml-1 font-medium">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartRenderer;
export type { ChartRendererProps };