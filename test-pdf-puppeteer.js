#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPDFGeneration() {
  console.log('🚀 Starting Puppeteer PDF test...\n');

  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      devtools: true
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1200, height: 800 });
    
    // Navigate to our test file
    const testFile = path.join(__dirname, 'test-output', 'graph-test.html');
    const fileUrl = `file://${testFile}`;
    
    console.log('📄 Loading test page:', fileUrl);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    // Wait for chart to render
    console.log('⏳ Waiting for Chart.js to load...');
    await page.waitForFunction(() => window.Chart, { timeout: 10000 });
    
    console.log('⏳ Waiting for chart creation...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Give time for chart creation
    
    // Check if canvas exists
    const hasCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('#chart');
      return {
        exists: !!canvas,
        width: canvas?.width || 0,
        height: canvas?.height || 0
      };
    });
    
    console.log('📊 Canvas status:', hasCanvas);
    
    if (!hasCanvas.exists) {
      throw new Error('Chart canvas was not created');
    }
    
    // Wait for chart animation to complete
    console.log('⏳ Waiting for chart animation to complete...');
    await page.waitForFunction(() => 
      document.body.getAttribute('data-chart-ready') === 'true' ||
      document.body.getAttribute('data-chart-error'), 
      { timeout: 10000 }
    );
    
    // Check for chart errors
    const chartError = await page.evaluate(() => 
      document.body.getAttribute('data-chart-error')
    );
    
    if (chartError) {
      throw new Error(`Chart creation failed: ${chartError}`);
    }
    
    console.log('✅ Chart is ready!');
    
    // Get chart element info
    const chartInfo = await page.evaluate(() => {
      const container = document.getElementById('chart-container');
      const canvas = document.getElementById('chart');
      
      return {
        containerRect: container ? container.getBoundingClientRect() : null,
        canvasRect: canvas ? canvas.getBoundingClientRect() : null,
        canvasExists: !!canvas
      };
    });
    
    console.log('📊 Chart info:', chartInfo);
    
    // Test PDF generation in the browser
    console.log('🧪 Testing PDF generation...');
    
    const pdfResult = await page.evaluate(async () => {
      try {
        const element = document.getElementById('chart-container');
        
        if (!element) {
          return { success: false, error: 'Chart container not found' };
        }
        
        // Test html2canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: true,
          useCORS: true,
          allowTaint: true
        });
        
        console.log('Canvas generated:', canvas.width, 'x', canvas.height);
        
        if (canvas.width === 0 || canvas.height === 0) {
          return { success: false, error: 'Canvas has zero dimensions' };
        }
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        const imgData = canvas.toDataURL('image/png', 0.95);
        
        if (!imgData.startsWith('data:image/png')) {
          return { success: false, error: 'Invalid image data format' };
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        
        // Get PDF as blob
        const pdfBlob = pdf.output('blob');
        
        return {
          success: true,
          canvasSize: { width: canvas.width, height: canvas.height },
          imageDataLength: imgData.length,
          pdfSize: pdfBlob.size,
          pdfOutput: pdf.output('datauristring') // Get PDF as data URI
        };
        
      } catch (error) {
        return { 
          success: false, 
          error: error.message,
          stack: error.stack 
        };
      }
    });
    
    if (pdfResult.success) {
      console.log('✅ PDF generation successful!');
      console.log('  📐 Canvas size:', pdfResult.canvasSize);
      console.log('  📏 Image data length:', pdfResult.imageDataLength);
      console.log('  📦 PDF size:', pdfResult.pdfSize, 'bytes');
      
      // Save the PDF data
      const pdfData = pdfResult.pdfOutput.split(',')[1]; // Remove data URI prefix
      const pdfBuffer = Buffer.from(pdfData, 'base64');
      
      const outputPath = path.join(__dirname, 'test-output', 'generated-test.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
      
      console.log('💾 PDF saved to:', outputPath);
      
      // Try to validate the PDF file
      if (pdfBuffer.length > 1000 && pdfBuffer.toString('ascii', 0, 4) === '%PDF') {
        console.log('✅ PDF file appears valid (starts with %PDF header)');
      } else {
        console.log('❌ PDF file may be corrupted (invalid header or too small)');
      }
      
    } else {
      console.log('❌ PDF generation failed:', pdfResult.error);
      if (pdfResult.stack) {
        console.log('Stack trace:', pdfResult.stack);
      }
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser is open for manual inspection...');
    console.log('📋 You can manually test the PDF generation by clicking the "Test PDF Generation" button');
    console.log('⌨️  Press Ctrl+C to close the browser and exit');
    
    // Wait indefinitely (until user presses Ctrl+C)
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Closing browser and exiting...');
  process.exit(0);
});

// Run the test
testPDFGeneration().catch(console.error);