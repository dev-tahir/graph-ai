import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf';
  quality?: number;
  scale?: number;
  filename?: string;
}

export interface BulkExportOptions {
  format: 'png' | 'pdf';
  filename?: string;
  includeTitle?: boolean;
}

/**
 * Simple, direct screenshot capture that matches the working HTML test
 */
export async function captureScreenshot(
  element: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  try {
    console.log('🎯 Starting capture with HTML file approach...');
    
    // Simple 2-second wait like the working HTML test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Use EXACT same html2canvas config that worked in HTML test
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: true, // Enable logging like in HTML test
      useCORS: true,
      allowTaint: true
    });
    
    console.log('✅ Canvas generated:', canvas.width, 'x', canvas.height);
    
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas has zero dimensions');
    }

    if (options.format === 'pdf') {
      // Use EXACT same PDF approach as HTML test
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      const imgData = canvas.toDataURL('image/png', 0.95);
      
      if (!imgData.startsWith('data:image/png')) {
        throw new Error('Invalid image data format');
      }
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      if (options.filename) {
        pdf.save(options.filename);
      }
      
      console.log('✅ PDF generated successfully!');
      return imgData;
    }

    const dataUrl = canvas.toDataURL(
      `image/${options.format}`,
      options.quality || 0.95
    );

    if (options.filename) {
      downloadDataUrl(dataUrl, options.filename);
    }

    return dataUrl;
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    return null;
  }
}

/**
 * Chart screenshot using the same simple approach
 */
export async function captureChartScreenshot(
  chartElement: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  console.log('📊 Capturing chart with HTML file method...');
  
  // Use same approach as main capture function
  return await captureScreenshot(chartElement, options);
}

/**
 * Bulk export multiple graphs using the simple approach
 */
export async function bulkExportGraphs(
  elements: { element: HTMLElement; title: string }[],
  options: BulkExportOptions
): Promise<void> {
  if (elements.length === 0) {
    throw new Error('No elements to export');
  }

  if (options.format === 'pdf') {
    let pdf: jsPDF | null = null;

    for (let i = 0; i < elements.length; i++) {
      const { element, title } = elements[i];
      
      try {
        console.log(`📊 Processing chart: ${title}`);
        
        // Simple 2-second wait like HTML test
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: true,
          useCORS: true,
          allowTaint: true
        });

        console.log(`✅ Canvas for "${title}":`, canvas.width, 'x', canvas.height);

        if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
          console.warn(`Skipping "${title}" - invalid canvas`);
          continue;
        }

        // Create PDF on first valid canvas
        if (!pdf) {
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });
        } else {
          pdf.addPage();
        }

        // Add title if requested
        if (options.includeTitle) {
          pdf.setFontSize(16);
          pdf.text(title, 20, 20);
        }

        const imgData = canvas.toDataURL('image/png', 0.95);
        
        // Calculate dimensions to fit on page
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const titleHeight = options.includeTitle ? 30 : 20;
        const availableHeight = pageHeight - titleHeight - 20;
        
        // Calculate scaled dimensions
        const maxWidth = pageWidth - 40;
        const aspectRatio = canvas.width / canvas.height;
        
        let finalWidth = maxWidth;
        let finalHeight = maxWidth / aspectRatio;
        
        // Scale down if too tall
        if (finalHeight > availableHeight) {
          finalHeight = availableHeight;
          finalWidth = finalHeight * aspectRatio;
        }
        
        // Ensure minimum dimensions
        if (finalWidth > 0 && finalHeight > 0) {
          pdf.addImage(imgData, 'PNG', 20, titleHeight, finalWidth, finalHeight);
        }
      } catch (error) {
        console.error(`Failed to export graph "${title}":`, error);
      }
    }

    // Save PDF if we created one
    if (pdf && options.filename) {
      pdf.save(options.filename);
      console.log('✅ PDF saved successfully!');
    } else if (!pdf) {
      throw new Error('No valid elements could be exported to PDF');
    }
  } else {
    // Export as ZIP of PNG images
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const { element, title } of elements) {
      try {
        // Simple wait like HTML test
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: true,
          useCORS: true,
          allowTaint: true
        });

        const dataUrl = canvas.toDataURL('image/png', 0.95);
        const base64Data = dataUrl.split(',')[1];
        
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        zip.file(`${sanitizedTitle}.png`, base64Data, { base64: true });
      } catch (error) {
        console.error(`Failed to export graph "${title}":`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename || 'graphs.zip';
    link.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Export dashboard as PDF using simple approach
 */
export async function exportDashboardToPDF(
  dashboardElement: HTMLElement,
  title: string,
  filename: string
): Promise<void> {
  try {
    console.log('📄 Exporting dashboard with HTML file method...');
    
    // Simple 3-second wait for dashboard
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const canvas = await html2canvas(dashboardElement, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      logging: true,
      useCORS: true,
      allowTaint: true
    });

    console.log('✅ Dashboard canvas generated:', canvas.width, 'x', canvas.height);

    if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
      throw new Error('Failed to generate valid canvas from dashboard');
    }

    // Simple PDF creation like HTML test
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width + 100, canvas.height + 100] // Add margin for title
    });

    // Add title
    pdf.setFontSize(24);
    pdf.text(title, 50, 40);
    
    // Add timestamp
    pdf.setFontSize(12);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, 50, 60);

    // Add the main image
    const imgData = canvas.toDataURL('image/png', 0.95);
    pdf.addImage(imgData, 'PNG', 50, 80, canvas.width, canvas.height);
    
    pdf.save(filename);
    console.log('✅ Dashboard PDF saved successfully!');
    
  } catch (error) {
    console.error('Dashboard export failed:', error);
    throw new Error(`Failed to export dashboard: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper functions
function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/**
 * Get optimal export settings based on content
 */
export function getOptimalExportSettings(element: HTMLElement): ExportOptions {
  const rect = element.getBoundingClientRect();
  const isLarge = rect.width > 1200 || rect.height > 800;
  
  return {
    format: 'png',
    scale: isLarge ? 1.5 : 2,
    quality: 0.95,
  };
}

/**
 * Export data as CSV
 */
export function exportDataAsCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export data as Excel
 */
export async function exportDataAsExcel(
  data: any[], 
  filename: string,
  sheetName: string = 'Data'
): Promise<void> {
  const XLSX = await import('xlsx');
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  XLSX.writeFile(workbook, filename);
}

/**
 * Debug helper for PDF export issues
 */
export function debugPDFExport(element: HTMLElement): void {
  console.group('📊 PDF Export Debug Info');
  
  const rect = element.getBoundingClientRect();
  console.log('Element dimensions:', {
    width: rect.width,
    height: rect.height,
    visible: rect.width > 0 && rect.height > 0
  });
  
  const styles = window.getComputedStyle(element);
  console.log('Element styles:', {
    display: styles.display,
    visibility: styles.visibility,
    opacity: styles.opacity,
    transform: styles.transform
  });
  
  // Check for Chart.js canvas
  const canvas = element.querySelector('canvas');
  if (canvas) {
    console.log('Chart canvas found:', {
      width: canvas.width,
      height: canvas.height,
      offsetWidth: canvas.offsetWidth,
      offsetHeight: canvas.offsetHeight,
      style: canvas.style.cssText
    });
  } else {
    console.warn('No canvas found in element - this might be the issue!');
  }
  
  console.groupEnd();
}

/**
 * Test export functionality with detailed logging
 */
export async function testExportWithLogging(element: HTMLElement, title: string = 'test'): Promise<void> {
  console.group('🧪 Testing Export with Logging');
  
  try {
    debugPDFExport(element);
    
    console.log('⏳ Starting export test...');
    const result = await captureScreenshot(element, {
      format: 'png',
      filename: `${title}_test.png`
    });
    
    if (result) {
      console.log('✅ Export successful! Data URL length:', result.length);
    } else {
      console.error('❌ Export failed - no result returned');
    }
  } catch (error) {
    console.error('❌ Export test failed:', error);
  } finally {
    console.groupEnd();
  }
}