'use client';

import React, { useRef } from 'react';
import { useState } from 'react';
import ChartRenderer from '@/components/ChartRenderer';
import ExportToolbar, { FloatingExportButton } from '@/components/ExportToolbar';
import BulkExportComponent from '@/components/BulkExport';
import type { ChartConfig } from '@/lib/chart-generator';

export default function ExportDemoPage() {
  const [demoData] = useState([
    { month: 'Jan', sales: 1000, revenue: 50000 },
    { month: 'Feb', sales: 1200, revenue: 60000 },
    { month: 'Mar', sales: 900, revenue: 45000 },
    { month: 'Apr', sales: 1500, revenue: 75000 },
    { month: 'May', sales: 1800, revenue: 90000 },
    { month: 'Jun', sales: 2000, revenue: 100000 },
  ]);

  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);

  const chart1Config: ChartConfig = {
    type: 'line',
    data: {
      labels: demoData.map(d => d.month),
      datasets: [
        {
          label: 'Sales',
          data: demoData.map(d => d.sales),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Monthly Sales Trend',
        },
      },
      scales: {
        y: {
          display: true,
          beginAtZero: true,
        },
      },
    },
  };

  const chart2Config: ChartConfig = {
    type: 'bar',
    data: {
      labels: demoData.map(d => d.month),
      datasets: [
        {
          label: 'Revenue ($)',
          data: demoData.map(d => d.revenue),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Monthly Revenue',
        },
      },
      scales: {
        y: {
          display: true,
          beginAtZero: true,
        },
      },
    },
  };

  const chart3Config: ChartConfig = {
    type: 'doughnut',
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Quarterly Data',
          data: [300, 450, 320, 280],
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Quarterly Distribution',
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Export Functionality Demo</h1>
          <p className="text-gray-600 mt-2">Test the screenshot and export features</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Export Tools Demo */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Export Tools</h2>
          <div className="grid gap-6">
            {/* Export Toolbar */}
            <div>
              <h3 className="text-lg font-medium mb-2">Export Toolbar</h3>
              <div ref={chartRef1}>
                <ChartRenderer
                  config={chart1Config}
                  title="Sales Trend Chart"
                  showExport={true}
                  exportStyle="toolbar"
                  data={demoData}
                />
              </div>
            </div>

            {/* Floating Export Button */}
            <div>
              <h3 className="text-lg font-medium mb-2">Floating Export Button</h3>
              <div ref={chartRef2} className="relative">
                <ChartRenderer
                  config={chart2Config}
                  title="Revenue Chart"
                  showExport={true}
                  exportStyle="floating"
                  data={demoData}
                />
              </div>
            </div>

            {/* Standard Chart without Export */}
            <div>
              <h3 className="text-lg font-medium mb-2">Standard Chart</h3>
              <div ref={chartRef3}>
                <ChartRenderer
                  config={chart3Config}
                  title="Distribution Chart"
                  showExport={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Export Demo */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Bulk Export</h2>
          <BulkExportComponent
            graphRefs={[chartRef1, chartRef2, chartRef3]}
            graphTitles={['Sales Trend Chart', 'Revenue Chart', 'Distribution Chart']}
            dashboardTitle="Demo Dashboard"
          />
        </div>

        {/* Individual Export Tools */}
        <div className="bg-white rounded-lg border p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Individual Export Tools</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <ExportToolbar
              targetElementRef={chartRef1}
              data={demoData}
              title="Sales Chart"
            />
            <ExportToolbar
              targetElementRef={chartRef2}
              data={demoData}
              title="Revenue Chart"
            />
            <ExportToolbar
              targetElementRef={chartRef3}
              title="Distribution Chart"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Test</h3>
          <ul className="text-blue-800 space-y-2">
            <li>• Use the export buttons on each chart to download as PNG, JPG, or PDF</li>
            <li>• Try the data export buttons to download chart data as CSV or Excel</li>
            <li>• Use the bulk export section to download multiple charts at once</li>
            <li>• Test the floating export button (hover over the blue camera icon)</li>
            <li>• Export formats: PNG (high quality), JPG (compressed), PDF (document format)</li>
            <li>• Data formats: CSV (spreadsheet compatible), Excel (XLSX format)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}