#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from .env
const DATABASE_URL = "postgresql://farooqkamal:@localhost:5432/farooqkamal";

// Graph ID from the URL
const GRAPH_ID = "93626485-a770-466c-b9f7-7ce7c3efd733";

async function testPDFGeneration() {
  console.log('🔍 Starting PDF generation test...\n');
  
  // Connect to database
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Fetch the graph data
    const query = `
      SELECT id, title, "chartType", data, "chartConfig", "createdAt"
      FROM graphs 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [GRAPH_ID]);
    
    if (result.rows.length === 0) {
      console.log('❌ Graph not found with ID:', GRAPH_ID);
      return;
    }

    const graph = result.rows[0];
    console.log('✅ Graph found:');
    console.log('  - Title:', graph.title);
    console.log('  - Type:', graph.chartType);
    console.log('  - Created:', graph.createdAt);
    console.log('  - Data rows:', Array.isArray(graph.data) ? graph.data.length : 'N/A');
    console.log('  - Chart config:', graph.chartConfig ? 'Present' : 'Missing');

    // Write graph data to files for inspection
    const testDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }

    // Save raw data
    fs.writeFileSync(
      path.join(testDir, 'graph-data.json'), 
      JSON.stringify(graph, null, 2)
    );
    console.log('📁 Graph data saved to test-output/graph-data.json');

    // Generate HTML for the chart
    const htmlContent = generateChartHTML(graph);
    fs.writeFileSync(
      path.join(testDir, 'graph-test.html'), 
      htmlContent
    );
    console.log('📁 Test HTML saved to test-output/graph-test.html');

    // Test data structure
    console.log('\n🔍 Data Analysis:');
    if (graph.data && Array.isArray(graph.data)) {
      console.log('  - Data type: Array');
      console.log('  - Rows count:', graph.data.length);
      if (graph.data.length > 0) {
        console.log('  - Sample row:', JSON.stringify(graph.data[0], null, 2));
        console.log('  - Column names:', Object.keys(graph.data[0]));
      }
    } else {
      console.log('  - Data type:', typeof graph.data);
      console.log('  - Data content:', graph.data);
    }

    console.log('\n📊 Chart Config Analysis:');
    if (graph.chartConfig) {
      const config = typeof graph.chartConfig === 'string' 
        ? JSON.parse(graph.chartConfig) 
        : graph.chartConfig;
      console.log('  - Config keys:', Object.keys(config));
      if (config.type) console.log('  - Chart type:', config.type);
      if (config.options) console.log('  - Has options:', !!config.options);
    }

    // Generate simple test instructions
    console.log('\n🧪 Manual Test Instructions:');
    console.log('1. Open test-output/graph-test.html in your browser');
    console.log('2. Open browser developer tools');
    console.log('3. Run this in console to test PDF generation:');
    console.log(`
// Test PDF generation
const element = document.getElementById('chart-container');
if (element) {
  console.log('Element found:', element);
  console.log('Element dimensions:', element.getBoundingClientRect());
  
  // Test with html2canvas
  html2canvas(element).then(canvas => {
    console.log('Canvas generated:', canvas.width, 'x', canvas.height);
    
    // Test PDF creation
    const pdf = new jsPDF();
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 100);
    pdf.save('test-graph.pdf');
    console.log('PDF should be downloaded');
  }).catch(error => {
    console.error('html2canvas failed:', error);
  });
} else {
  console.error('Chart element not found');
}
`);

    console.log('\n✅ Test setup complete!');
    console.log(`🌐 Also test the live page: http://localhost:3000/graph/${GRAPH_ID}`);
    console.log('\n📝 Test files preserved in test-output/ directory:');
    console.log('  - graph-data.json (raw database data)');
    console.log('  - graph-test.html (interactive test page)');
    console.log('\n🔄 Test files will persist for future debugging');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('📤 Database connection closed');
  }
}

function generateChartHTML(graph) {
  const data = Array.isArray(graph.data) ? graph.data : [];
  const config = graph.chartConfig ? 
    (typeof graph.chartConfig === 'string' ? JSON.parse(graph.chartConfig) : graph.chartConfig) 
    : { type: 'bar' };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Graph PDF Test - ${graph.title}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        #chart-container { 
            width: 800px; 
            height: 400px; 
            margin: 20px auto; 
            padding: 20px;
            border: 1px solid #ccc;
            background: white;
        }
        .info { margin: 10px 0; padding: 10px; background: #f0f0f0; }
        button { padding: 10px 20px; margin: 5px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Graph PDF Test: ${graph.title}</h1>
    
    <div class="info">
        <h3>Graph Info:</h3>
        <p><strong>ID:</strong> ${graph.id}</p>
        <p><strong>Type:</strong> ${graph.chartType}</p>
        <p><strong>Data Rows:</strong> ${data.length}</p>
        <p><strong>Created:</strong> ${graph.createdAt}</p>
    </div>

    <div class="info">
        <h3>Test Controls:</h3>
        <button onclick="testPDFGeneration()">🔧 Test PDF Generation</button>
        <button onclick="debugElement()">🔍 Debug Element</button>
        <button onclick="testCanvasOnly()">🎨 Test Canvas Only</button>
    </div>

    <div id="chart-container">
        <canvas id="chart"></canvas>
    </div>

    <script>
        const { jsPDF } = window.jspdf;
        
        // Graph data
        const graphData = ${JSON.stringify(data)};
        const chartConfig = ${JSON.stringify(config)};
        
        console.log('Graph data loaded:', graphData.length, 'rows');
        console.log('Chart config:', chartConfig);

        // Create chart
        const ctx = document.getElementById('chart').getContext('2d');
        
        // Use the actual chart data and config from the database
        let chartData;
        let chartOptions;
        
        if (chartConfig.data) {
            // Use the complete chart config from database
            chartData = chartConfig.data;
            chartOptions = chartConfig.options || {};
        } else {
            // Fallback: use graphData directly
            chartData = graphData;
            chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '${graph.title}'
                    }
                }
            };
        }

        try {
            console.log('📊 Creating chart with type:', chartConfig.type || 'line');
            console.log('📊 Chart data:', chartData);
            
            const chart = new Chart(ctx, {
                type: chartConfig.type || 'line',
                data: chartData,
                options: {
                    ...chartOptions,
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        onComplete: function() {
                            console.log('✅ Chart animation completed');
                            document.body.setAttribute('data-chart-ready', 'true');
                        }
                    }
                }
            });
            
            console.log('✅ Chart created successfully');
        } catch (error) {
            console.error('❌ Chart creation failed:', error);
            document.body.setAttribute('data-chart-error', error.message);
        }

        // Test functions
        function debugElement() {
            const element = document.getElementById('chart-container');
            console.log('=== Element Debug ===');
            console.log('Element:', element);
            console.log('Dimensions:', element.getBoundingClientRect());
            console.log('Computed style:', window.getComputedStyle(element));
            console.log('Canvas:', document.getElementById('chart'));
        }

        function testCanvasOnly() {
            const element = document.getElementById('chart-container');
            console.log('=== Canvas Test ===');
            
            html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: true,
                useCORS: true
            }).then(canvas => {
                console.log('✅ Canvas generated successfully');
                console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
                
                // Create download link for canvas
                const link = document.createElement('a');
                link.download = 'test-canvas.png';
                link.href = canvas.toDataURL();
                link.click();
                console.log('📥 Canvas PNG downloaded');
            }).catch(error => {
                console.error('❌ Canvas generation failed:', error);
            });
        }

        async function testPDFGeneration() {
            const element = document.getElementById('chart-container');
            console.log('=== PDF Generation Test ===');
            
            try {
                debugElement();
                
                console.log('🎨 Generating canvas...');
                const canvas = await html2canvas(element, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: true,
                    useCORS: true,
                    allowTaint: true
                });
                
                console.log('✅ Canvas ready:', canvas.width, 'x', canvas.height);
                
                if (canvas.width === 0 || canvas.height === 0) {
                    throw new Error('Canvas has zero dimensions');
                }
                
                console.log('📄 Creating PDF...');
                const pdf = new jsPDF({
                    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });
                
                const imgData = canvas.toDataURL('image/png', 0.95);
                console.log('🖼️ Image data generated, length:', imgData.length);
                
                if (!imgData.startsWith('data:image/png')) {
                    throw new Error('Invalid image data format');
                }
                
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                
                console.log('💾 Saving PDF...');
                pdf.save('test-graph-${GRAPH_ID}.pdf');
                
                console.log('✅ PDF generation completed successfully!');
                
                // Also log PDF info
                const pdfBlob = pdf.output('blob');
                console.log('📊 PDF file size:', pdfBlob.size, 'bytes');
                
            } catch (error) {
                console.error('❌ PDF generation failed:', error);
                console.error('Error stack:', error.stack);
                alert('PDF generation failed: ' + error.message);
            }
        }

        // Auto-run debug on load
        setTimeout(() => {
            console.log('=== Auto Debug Info ===');
            debugElement();
        }, 1000);
    </script>
</body>
</html>`;
}

// Run the test
testPDFGeneration().catch(console.error);