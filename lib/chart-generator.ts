import type { ProcessedData } from './file-processing';

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'doughnut' 
  | 'scatter' 
  | 'bubble' 
  | 'radar' 
  | 'polarArea' 
  | 'area';

export interface ChartConfig {
  type: ChartType;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
      tension?: number;
      pointRadius?: number;
      pointHoverRadius?: number;
    }>;
  };
  options: {
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: {
      title?: {
        display: boolean;
        text: string;
      };
      legend?: {
        display: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
      tooltip?: {
        enabled: boolean;
      };
    };
    scales?: {
      x?: {
        display: boolean;
        title?: {
          display: boolean;
          text: string;
        };
      };
      y?: {
        display: boolean;
        title?: {
          display: boolean;
          text: string;
        };
        beginAtZero?: boolean;
      };
    };
    elements?: {
      line?: {
        tension: number;
      };
      point?: {
        radius: number;
        hoverRadius: number;
      };
    };
  };
}

// Color palettes for charts
const CHART_COLORS = {
  primary: [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
  ],
  pastel: [
    '#DBEAFE', '#FEE2E2', '#D1FAE5', '#FEF3C7', '#EDE9FE',
    '#CFFAFE', '#FED7AA', '#ECFCCB', '#FCE7F3', '#E0E7FF'
  ],
  gradient: [
    'rgba(59, 130, 246, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(6, 182, 212, 0.8)'
  ]
};

export function suggestChartType(data: ProcessedData): ChartType[] {
  const { headers, rows, type } = data;
  
  if (!headers || !rows || rows.length === 0) {
    return ['bar'];
  }

  const suggestions: ChartType[] = [];
  
  // Analyze data characteristics
  const numericColumns = headers.filter((header, index) => {
    const values = rows.slice(0, 10).map(row => row[index]).filter(val => val !== null && val !== undefined);
    const numericCount = values.filter(val => !isNaN(Number(val))).length;
    return numericCount / values.length > 0.8;
  });

  const categoricalColumns = headers.filter((_, index) => !numericColumns.includes(headers[index]));
  const hasTimeColumn = headers.some(header => 
    header.toLowerCase().includes('date') || 
    header.toLowerCase().includes('time') || 
    header.toLowerCase().includes('month') ||
    header.toLowerCase().includes('year')
  );

  // Basic suggestion logic
  if (numericColumns.length === 1 && categoricalColumns.length >= 1) {
    // One numeric, one categorical - good for bar, pie
    suggestions.push('bar', 'pie', 'doughnut');
  }

  if (numericColumns.length >= 2) {
    // Multiple numeric columns - good for scatter, line, area
    suggestions.push('scatter', 'line', 'area');
  }

  if (hasTimeColumn && numericColumns.length >= 1) {
    // Time series data - line charts work well
    suggestions.push('line', 'area');
  }

  if (categoricalColumns.length === 1 && numericColumns.length === 1) {
    // Simple categorical vs numeric - bar chart is ideal
    suggestions.push('bar');
  }

  if (rows.length <= 10 && numericColumns.length === 1) {
    // Small dataset with one numeric - pie chart might work
    suggestions.push('pie', 'doughnut');
  }

  // Fallback suggestions
  if (suggestions.length === 0) {
    suggestions.push('bar', 'line');
  }

  return [...new Set(suggestions)]; // Remove duplicates
}

export function generateChartConfig(
  data: ProcessedData,
  chartType: ChartType,
  options: {
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    colorScheme?: 'primary' | 'pastel' | 'gradient';
  } = {}
): ChartConfig {
  const { headers, rows } = data;
  const { title, xAxisLabel, yAxisLabel, colorScheme = 'primary' } = options;

  if (!headers || !rows || rows.length === 0) {
    throw new Error('Invalid data for chart generation');
  }

  // Identify numeric and categorical columns
  const columnTypes = headers.map((header, index) => {
    const values = rows.slice(0, 10).map(row => row[index]).filter(val => val !== null && val !== undefined);
    const numericCount = values.filter(val => !isNaN(Number(val))).length;
    return {
      name: header,
      index,
      isNumeric: numericCount / values.length > 0.8,
      values
    };
  });

  const numericColumns = columnTypes.filter(col => col.isNumeric);
  const categoricalColumns = columnTypes.filter(col => !col.isNumeric);

  let labels: string[] = [];
  let datasets: any[] = [];

  switch (chartType) {
    case 'bar':
    case 'line':
    case 'area': {
      // Use first categorical column as labels, first numeric as data
      const labelColumn = categoricalColumns[0] || columnTypes[0];
      const dataColumn = numericColumns[0] || columnTypes[1] || columnTypes[0];

      labels = rows.map(row => String(row[labelColumn.index] || '')).slice(0, 20); // Limit to 20 items
      const values = rows.map(row => Number(row[dataColumn.index]) || 0).slice(0, 20);

      datasets = [{
        label: dataColumn.name,
        data: values,
        backgroundColor: chartType === 'line' ? 'transparent' : CHART_COLORS[colorScheme][0],
        borderColor: CHART_COLORS[colorScheme][0],
        borderWidth: 2,
        fill: chartType === 'area',
        tension: chartType === 'line' || chartType === 'area' ? 0.4 : 0,
      }];

      // Add additional numeric columns if available
      if (numericColumns.length > 1) {
        numericColumns.slice(1, 4).forEach((col, index) => {
          const values = rows.map(row => Number(row[col.index]) || 0).slice(0, 20);
          datasets.push({
            label: col.name,
            data: values,
            backgroundColor: chartType === 'line' ? 'transparent' : CHART_COLORS[colorScheme][index + 1],
            borderColor: CHART_COLORS[colorScheme][index + 1],
            borderWidth: 2,
            fill: chartType === 'area',
            tension: chartType === 'line' || chartType === 'area' ? 0.4 : 0,
          });
        });
      }
      break;
    }

    case 'pie':
    case 'doughnut': {
      // Use first categorical column as labels, aggregate numeric values
      const labelColumn = categoricalColumns[0] || columnTypes[0];
      const dataColumn = numericColumns[0] || columnTypes[1] || columnTypes[0];

      // Aggregate data by category
      const aggregated = new Map<string, number>();
      rows.forEach(row => {
        const label = String(row[labelColumn.index] || 'Unknown');
        const value = Number(row[dataColumn.index]) || 0;
        aggregated.set(label, (aggregated.get(label) || 0) + value);
      });

      // Sort by value and take top 8 to avoid clutter
      const sortedEntries = Array.from(aggregated.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);

      labels = sortedEntries.map(([label]) => label);
      const values = sortedEntries.map(([, value]) => value);

      datasets = [{
        label: dataColumn.name,
        data: values,
        backgroundColor: CHART_COLORS[colorScheme].slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff',
      }];
      break;
    }

    case 'scatter':
    case 'bubble': {
      // Use first two numeric columns for x and y
      if (numericColumns.length < 2) {
        throw new Error('Scatter plot requires at least 2 numeric columns');
      }

      const xColumn = numericColumns[0];
      const yColumn = numericColumns[1];
      const sizeColumn = chartType === 'bubble' && numericColumns[2] ? numericColumns[2] : null;

      labels = []; // Scatter plots don't use labels in the same way

      const scatterData = rows.map(row => {
        const point: any = {
          x: Number(row[xColumn.index]) || 0,
          y: Number(row[yColumn.index]) || 0,
        };
        
        if (sizeColumn) {
          point.r = Math.max(3, Math.min(20, Number(row[sizeColumn.index]) || 5));
        }
        
        return point;
      }).slice(0, 100); // Limit to 100 points

      datasets = [{
        label: `${xColumn.name} vs ${yColumn.name}`,
        data: scatterData,
        backgroundColor: CHART_COLORS[colorScheme][0],
        borderColor: CHART_COLORS[colorScheme][0],
        pointRadius: chartType === 'scatter' ? 4 : undefined,
      }];
      break;
    }

    case 'radar':
    case 'polarArea': {
      // Use multiple numeric columns as radar dimensions
      if (numericColumns.length < 3) {
        throw new Error('Radar chart requires at least 3 numeric columns');
      }

      labels = numericColumns.slice(0, 6).map(col => col.name); // Max 6 dimensions
      
      // Take first row or average values
      const values = numericColumns.slice(0, 6).map(col => {
        const colValues = rows.map(row => Number(row[col.index]) || 0);
        return colValues.reduce((a, b) => a + b, 0) / colValues.length;
      });

      datasets = [{
        label: 'Data',
        data: values,
        backgroundColor: CHART_COLORS.gradient[0],
        borderColor: CHART_COLORS[colorScheme][0],
        borderWidth: 2,
        pointRadius: 4,
      }];
      break;
    }

    default:
      throw new Error(`Unsupported chart type: ${chartType}`);
  }

  // Build chart configuration
  const config: ChartConfig = {
    type: chartType,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: title ? {
          display: true,
          text: title
        } : undefined,
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true
        }
      }
    }
  };

  // Add scales for non-circular charts
  if (!['pie', 'doughnut', 'radar', 'polarArea'].includes(chartType)) {
    config.options.scales = {
      x: {
        display: true,
        title: xAxisLabel ? {
          display: true,
          text: xAxisLabel
        } : undefined
      },
      y: {
        display: true,
        title: yAxisLabel ? {
          display: true,
          text: yAxisLabel
        } : undefined,
        beginAtZero: ['bar', 'area'].includes(chartType)
      }
    };
  }

  // Add elements config for line-based charts
  if (['line', 'area'].includes(chartType)) {
    config.options.elements = {
      line: { tension: 0.4 },
      point: { radius: 3, hoverRadius: 6 }
    };
  }

  return config;
}

export function validateChartConfig(config: ChartConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check basic structure
  if (!config.type) {
    errors.push('Chart type is required');
  }

  if (!config.data) {
    errors.push('Chart data is required');
  } else {
    if (!config.data.datasets || config.data.datasets.length === 0) {
      errors.push('At least one dataset is required');
    }

    // Validate datasets
    config.data.datasets.forEach((dataset, index) => {
      if (!dataset.data || dataset.data.length === 0) {
        errors.push(`Dataset ${index + 1} has no data`);
      }

      if (!dataset.label) {
        errors.push(`Dataset ${index + 1} is missing a label`);
      }
    });

    // Check label consistency for non-scatter charts
    if (!['scatter', 'bubble'].includes(config.type)) {
      if (!config.data.labels || config.data.labels.length === 0) {
        errors.push('Labels are required for this chart type');
      } else {
        const dataLength = config.data.datasets[0]?.data.length || 0;
        if (config.data.labels.length !== dataLength) {
          errors.push('Number of labels must match number of data points');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function optimizeChartForDisplay(config: ChartConfig): ChartConfig {
  const optimized = { ...config };

  // Optimize for different chart types
  switch (config.type) {
    case 'pie':
    case 'doughnut':
      // Limit pie chart slices to prevent clutter
      if (optimized.data.labels.length > 8) {
        const sortedIndices = optimized.data.datasets[0].data
          .map((value, index) => ({ value: Number(value), index }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 7)
          .map(item => item.index);

        // Keep top 7 slices and group others as "Others"
        const keptLabels = sortedIndices.map(i => optimized.data.labels[i]);
        const keptValues = sortedIndices.map(i => optimized.data.datasets[0].data[i]);
        const othersValue = optimized.data.datasets[0].data
          .filter((_, index) => !sortedIndices.includes(index))
          .reduce((sum, val) => sum + Number(val), 0);

        if (othersValue > 0) {
          keptLabels.push('Others');
          keptValues.push(othersValue);
        }

        optimized.data.labels = keptLabels;
        optimized.data.datasets[0].data = keptValues;
        optimized.data.datasets[0].backgroundColor = CHART_COLORS.primary.slice(0, keptLabels.length);
      }
      break;

    case 'bar':
    case 'line':
    case 'area':
      // Limit data points for performance
      if (optimized.data.labels.length > 50) {
        const step = Math.ceil(optimized.data.labels.length / 50);
        optimized.data.labels = optimized.data.labels.filter((_, index) => index % step === 0);
        optimized.data.datasets = optimized.data.datasets.map(dataset => ({
          ...dataset,
          data: dataset.data.filter((_, index) => index % step === 0)
        }));
      }
      break;

    case 'scatter':
    case 'bubble':
      // Limit scatter points for performance
      if (optimized.data.datasets[0].data.length > 200) {
        optimized.data.datasets = optimized.data.datasets.map(dataset => ({
          ...dataset,
          data: dataset.data.slice(0, 200)
        }));
      }
      break;
  }

  return optimized;
}