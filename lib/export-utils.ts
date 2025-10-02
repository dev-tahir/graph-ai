import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Helper function to create CSS overrides for modern color functions
function createCompatibilityCSS(): string {
  return `
    * { 
      color-scheme: none !important; 
    }
    
    /* Ensure white background  } catch (error) {
    console.error('Chart export failed:', error);
    throw error;
  } finally {
    if (restoreBackgrounds) {
      restoreBackgrounds();
    }
  }
}    body, html {
      background-color: rgb(255 255 255) !important;
    }
    
    /* Ensure elements with transparent backgrounds get white */
    div, section, article, main, header, footer, nav, aside {
      background-color: rgb(255 255 255) !important;
    }
    
    /* Override transparent and inherit backgrounds */
    [style*="background: transparent"], 
    [style*="background-color: transparent"],
    [style*="background: inherit"],
    [style*="background-color: inherit"] {
      background-color: rgb(255 255 255) !important;
    }
    
    /* Override Tailwind CSS colors that might use modern color functions */
    .bg-blue-500 { background-color: rgb(59 130 246) !important; }
    .bg-blue-600 { background-color: rgb(37 99 235) !important; }
    .bg-red-500 { background-color: rgb(239 68 68) !important; }
    .bg-green-500 { background-color: rgb(34 197 94) !important; }
    .bg-yellow-500 { background-color: rgb(245 158 11) !important; }
    .bg-purple-500 { background-color: rgb(139 92 246) !important; }
    .bg-indigo-500 { background-color: rgb(99 102 241) !important; }
    .bg-pink-500 { background-color: rgb(236 72 153) !important; }
    .bg-gray-50 { background-color: rgb(249 250 251) !important; }
    .bg-gray-100 { background-color: rgb(243 244 246) !important; }
    .bg-gray-200 { background-color: rgb(229 231 235) !important; }
    .bg-gray-300 { background-color: rgb(209 213 219) !important; }
    .bg-gray-400 { background-color: rgb(156 163 175) !important; }
    .bg-gray-500 { background-color: rgb(107 114 128) !important; }
    .bg-gray-600 { background-color: rgb(75 85 99) !important; }
    .bg-gray-700 { background-color: rgb(55 65 81) !important; }
    .bg-gray-800 { background-color: rgb(31 41 55) !important; }
    .bg-gray-900 { background-color: rgb(17 24 39) !important; }
    .bg-white { background-color: rgb(255 255 255) !important; }
    .text-gray-900 { color: rgb(17 24 39) !important; }
    .text-gray-800 { color: rgb(31 41 55) !important; }
    .text-gray-700 { color: rgb(55 65 81) !important; }
    .text-gray-600 { color: rgb(75 85 99) !important; }
    .text-gray-500 { color: rgb(107 114 128) !important; }
    .text-gray-400 { color: rgb(156 163 175) !important; }
    .text-blue-600 { color: rgb(37 99 235) !important; }
    .text-blue-500 { color: rgb(59 130 246) !important; }
    .text-red-600 { color: rgb(220 38 38) !important; }
    .text-green-600 { color: rgb(22 163 74) !important; }
    .text-white { color: rgb(255 255 255) !important; }
    .border-gray-200 { border-color: rgb(229 231 235) !important; }
    .border-gray-300 { border-color: rgb(209 213 219) !important; }
    .border-blue-500 { border-color: rgb(59 130 246) !important; }
    
    /* Canvas and SVG backgrounds for charts */
    canvas, svg {
      background-color: rgb(255 255 255) !important;
    }
    
    /* Chart container backgrounds */
    .chart-container, [class*="chart"] {
      background-color: rgb(255 255 255) !important;
    }
  `;
}

// Helper function to create onclone callback for html2canvas
function createHtml2CanvasCloneCallback() {
  return (clonedDoc: Document) => {
    const style = clonedDoc.createElement('style');
    style.textContent = createCompatibilityCSS();
    clonedDoc.head.appendChild(style);
  };
}

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
 * Capture a screenshot of a DOM element with improved positioning
 */
export async function captureScreenshot(
  element: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  let restoreStyles: (() => void) | null = null;
  
  let restoreBackgrounds: (() => void) | null = null;
  
  try {
    // Wait for any pending renders (especially important for charts)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Ensure element is visible and properly positioned
    const elementRect = element.getBoundingClientRect();
    const isElementVisible = elementRect.width > 0 && elementRect.height > 0;
    
    if (!isElementVisible) {
      throw new Error('Element is not visible or has no dimensions');
    }

    // Prepare element for screenshot (fix positioning issues)
    restoreStyles = prepareElementForScreenshot(element);
    
    // Ensure white backgrounds for image exports
    restoreBackgrounds = ensureElementWhiteBackground(element);

    // Scroll element into view if needed
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    
    // Wait for scroll to complete and styles to be applied
    await new Promise(resolve => setTimeout(resolve, 100));

    // Recalculate rect after style changes
    const updatedRect = element.getBoundingClientRect();

    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Fix positioning issues
      x: 0,
      y: 0,
      width: Math.ceil(updatedRect.width),
      height: Math.ceil(updatedRect.height),
      // Scroll position handling
      scrollX: 0,
      scrollY: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      // Use foreignObjectRendering to handle modern CSS better
      foreignObjectRendering: true,
      // Add onclone callback to fix modern CSS color function issues
      onclone: (clonedDoc) => {
        // Apply white background to body and html
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.documentElement.style.backgroundColor = '#ffffff';
        
        // Apply our CSS compatibility fixes
        const compatCallback = createHtml2CanvasCloneCallback();
        compatCallback(clonedDoc);
      },
    });

    // Ensure canvas has white background
    ensureCanvasWhiteBackground(canvas);

    if (options.format === 'pdf') {
      try {
        return await canvasToPDF(canvas, options.filename);
      } catch (error) {
        console.error('PDF export failed:', error);
        throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Ensure canvas has white background for image exports
    ensureCanvasWhiteBackground(canvas);
    
    const dataUrl = canvas.toDataURL(
      `image/${options.format}`,
      options.quality || 0.95
    );

    if (options.filename) {
      downloadDataUrl(dataUrl, options.filename);
    }

    return dataUrl;
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  } finally {
    // Restore original styles
    if (restoreStyles) {
      restoreStyles();
    }
  }
}

/**
 * Specialized function for capturing chart elements with better positioning
 */
export async function captureChartScreenshot(
  chartElement: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  let restoreBackgrounds: (() => void) | null = null;
  
  try {
    // Wait for chart animations to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Ensure white backgrounds for the chart area
    restoreBackgrounds = ensureElementWhiteBackground(chartElement);
    
    // Find the actual chart canvas if it exists (for Chart.js charts)
    const canvas = chartElement.querySelector('canvas');
    if (canvas) {
      // If it's a Chart.js canvas, we can export directly
      if (options.format === 'pdf') {
        try {
          return await canvasToPDF(canvas, options.filename);
        } catch (error) {
          console.error('Chart PDF export failed:', error);
          throw new Error(`Chart PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // Ensure canvas has white background for image exports
        ensureCanvasWhiteBackground(canvas);
        
        const dataUrl = canvas.toDataURL(`image/${options.format}`, options.quality || 0.95);
        
        if (options.filename) {
          downloadDataUrl(dataUrl, options.filename);
        }
        
        return dataUrl;
      }
    }

    // For SVG charts or complex HTML charts, use html2canvas with special handling
    const parentElement = chartElement.parentElement;
    if (parentElement) {
      // Temporarily ensure parent has stable positioning and white background
      const originalParentStyle = {
        position: parentElement.style.position,
        transform: parentElement.style.transform,
        overflow: parentElement.style.overflow,
        backgroundColor: parentElement.style.backgroundColor
      };
      
      parentElement.style.position = 'static';
      parentElement.style.transform = 'none';
      parentElement.style.overflow = 'visible';
      parentElement.style.backgroundColor = '#ffffff';
      
      try {
        const result = await captureScreenshot(chartElement, options);
        return result;
      } finally {
        // Restore original parent styles
        parentElement.style.position = originalParentStyle.position;
        parentElement.style.transform = originalParentStyle.transform;
        parentElement.style.overflow = originalParentStyle.overflow;
        parentElement.style.backgroundColor = originalParentStyle.backgroundColor;
      }
    }
    
    return await captureScreenshot(chartElement, options);
  } catch (error) {
    console.error('Chart screenshot capture failed:', error);
    return null;
  } finally {
    if (restoreBackgrounds) {
      restoreBackgrounds();
    }
  }
}

/**
 * Capture multiple elements and create a bulk export
 */
export async function bulkExportGraphs(
  elements: { element: HTMLElement; title: string }[],
  options: BulkExportOptions = { format: 'png' }
): Promise<void> {
  try {
    if (options.format === 'pdf') {
      await bulkExportToPDF(elements, options);
    } else {
      await bulkExportToPNG(elements, options);
    }
  } catch (error) {
    console.error('Bulk export failed:', error);
    throw error;
  }
}

/**
 * Export dashboard as PDF with multiple charts
 */
export async function exportDashboardToPDF(
  dashboardElement: HTMLElement,
  title: string,
  filename?: string
): Promise<void> {
  try {
    // Wait for dashboard to be ready
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Ensure dashboard is positioned correctly
    const dashboardRect = dashboardElement.getBoundingClientRect();
    
    const canvas = await html2canvas(dashboardElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      x: 0,
      y: 0,
      width: Math.ceil(dashboardRect.width),
      height: Math.ceil(dashboardRect.height),
      scrollX: 0,
      scrollY: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
        // Apply white background to body and html
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.documentElement.style.backgroundColor = '#ffffff';
        
        // Apply our CSS compatibility fixes
        const compatCallback = createHtml2CanvasCloneCallback();
        compatCallback(clonedDoc);
      },
    });

    // Ensure canvas has white background
    ensureCanvasWhiteBackground(canvas);

    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add title
    pdf.setFontSize(16);
    pdf.text(title, 20, 20);
    
    // Add timestamp
    pdf.setFontSize(10);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);

    // Add dashboard image
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, 40, imgWidth - 20, imgHeight);

    // Download the PDF
    pdf.save(filename || `${title.replace(/[^a-z0-9]/gi, '_')}_dashboard.pdf`);
  } catch (error) {
    console.error('Dashboard PDF export failed:', error);
    throw error;
  }
}

/**
 * Create ZIP file with multiple images
 */
export async function createImageZip(
  images: { data: string; filename: string }[]
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  images.forEach(({ data, filename }) => {
    // Remove data URL prefix
    const base64Data = data.split(',')[1];
    zip.file(filename, base64Data, { base64: true });
  });

  return zip.generateAsync({ type: 'blob' });
}

// Helper functions
async function canvasToPDF(canvas: HTMLCanvasElement, filename?: string): Promise<string> {
  try {
    console.log('Generating PDF from canvas:', { width: canvas.width, height: canvas.height });
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    if (!imgData || imgData === 'data:,') {
      throw new Error('Failed to generate image data from canvas');
    }
    
    console.log('Canvas image data generated successfully, length:', imgData.length);
    
    // Calculate dimensions for A4 page
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate scaling to fit the image on the page with margins
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);
    
    // Convert canvas dimensions to mm (assuming 96 DPI)
    const mmPerPixel = 25.4 / 96; // 25.4 mm per inch, 96 pixels per inch
    const canvasWidthMm = canvas.width * mmPerPixel;
    const canvasHeightMm = canvas.height * mmPerPixel;
    
    // Calculate scaling ratio to fit within available space
    const scaleWidth = availableWidth / canvasWidthMm;
    const scaleHeight = availableHeight / canvasHeightMm;
    const scale = Math.min(scaleWidth, scaleHeight, 1); // Don't upscale
    
    const finalWidth = canvasWidthMm * scale;
    const finalHeight = canvasHeightMm * scale;
    
    // Center the image on the page
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    console.log('Adding image to PDF:', { x, y, finalWidth, finalHeight });
    
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

    if (filename) {
      console.log('Saving PDF as:', filename);
      pdf.save(filename);
    }

    console.log('PDF generation completed successfully');
    return imgData;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function bulkExportToPDF(
  elements: { element: HTMLElement; title: string }[],
  options: BulkExportOptions
): Promise<void> {
  try {
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

  for (let i = 0; i < elements.length; i++) {
    const { element, title } = elements[i];
    let restoreBackgrounds: (() => void) | null = null;
    
    try {
      if (i > 0) {
        pdf.addPage();
        yPosition = 20;
      }

      // Add title if enabled
      if (options.includeTitle) {
        pdf.setFontSize(14);
        pdf.text(title, 20, yPosition);
        yPosition += 10;
      }

      // Wait for element to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ensure white backgrounds
      restoreBackgrounds = ensureElementWhiteBackground(element);
      
      // Ensure element is positioned correctly
      const elementRect = element.getBoundingClientRect();
    
    // Capture element
    const canvas = await html2canvas(element, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      logging: false,
      x: 0,
      y: 0,
      width: Math.ceil(elementRect.width),
      height: Math.ceil(elementRect.height),
      scrollX: 0,
      scrollY: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
        // Apply white background to body and html
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.documentElement.style.backgroundColor = '#ffffff';
        
        // Apply our CSS compatibility fixes
        const compatCallback = createHtml2CanvasCloneCallback();
        compatCallback(clonedDoc);
      },
    });

    // Ensure canvas has white background
    ensureCanvasWhiteBackground(canvas);

    const imgWidth = pageWidth - 40; // 20mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if image fits on page
    if (yPosition + imgHeight > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
      
      if (options.includeTitle) {
        pdf.setFontSize(14);
        pdf.text(title, 20, yPosition);
        yPosition += 10;
      }
    }

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } finally {
      if (restoreBackgrounds) {
        restoreBackgrounds();
      }
    }
  }

    pdf.save(options.filename || `graphs_export_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error in bulk PDF export:', error);
    throw new Error(`Failed to generate bulk PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function bulkExportToPNG(
  elements: { element: HTMLElement; title: string }[],
  options: BulkExportOptions
): Promise<void> {
  const images: { data: string; filename: string }[] = [];

  for (const { element, title } of elements) {
    let restoreBackgrounds: (() => void) | null = null;
    
    try {
      // Wait for element to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ensure white backgrounds
      restoreBackgrounds = ensureElementWhiteBackground(element);
      
      // Ensure element is positioned correctly
      const elementRect = element.getBoundingClientRect();
    
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      x: 0,
      y: 0,
      width: Math.ceil(elementRect.width),
      height: Math.ceil(elementRect.height),
      scrollX: 0,
      scrollY: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
        // Apply white background to body and html
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.documentElement.style.backgroundColor = '#ffffff';
        
        // Apply our CSS compatibility fixes
        const compatCallback = createHtml2CanvasCloneCallback();
        compatCallback(clonedDoc);
      },
    });

      // Ensure canvas has white background
      ensureCanvasWhiteBackground(canvas);

      const dataUrl = canvas.toDataURL('image/png');
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      
      images.push({ data: dataUrl, filename });
    } finally {
      if (restoreBackgrounds) {
        restoreBackgrounds();
      }
    }
  }

  // Create and download ZIP
  const zipBlob = await createImageZip(images);
  const zipUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = zipUrl;
  link.download = options.filename || `graphs_export_${Date.now()}.zip`;
  link.click();
  URL.revokeObjectURL(zipUrl);
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

// Helper function to ensure canvas has a white background
function ensureCanvasWhiteBackground(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Create a new canvas with the original content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      // Copy the original canvas content to temp canvas
      tempCtx.drawImage(canvas, 0, 0);
      
      // Fill the original canvas with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the original content back on top of white background
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }
}

// Helper function to ensure element has white backgrounds before capture
function ensureElementWhiteBackground(element: HTMLElement): () => void {
  const elementsToRestore: Array<{ element: HTMLElement; originalBackground: string }> = [];
  
  // Find all elements within the target element
  const allElements = [element, ...element.querySelectorAll('*')] as HTMLElement[];
  
  allElements.forEach(el => {
    const computedStyle = window.getComputedStyle(el);
    const currentBg = el.style.backgroundColor;
    
    // If background is transparent, inherit, or not set, make it white
    if (
      !currentBg || 
      currentBg === 'transparent' || 
      currentBg === 'inherit' ||
      computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ||
      computedStyle.backgroundColor === 'transparent'
    ) {
      elementsToRestore.push({ element: el, originalBackground: currentBg });
      el.style.backgroundColor = '#ffffff';
    }
  });
  
  // Return restore function
  return () => {
    elementsToRestore.forEach(({ element, originalBackground }) => {
      element.style.backgroundColor = originalBackground;
    });
  };
}

/**
 * Prepare element for screenshot by fixing common positioning issues
 */
function prepareElementForScreenshot(element: HTMLElement): () => void {
  const originalStyles: Record<string, string> = {};
  const elementsToRestore: Array<{ element: HTMLElement; styles: Record<string, string> }> = [];

  // Helper to save and modify styles
  const saveAndModifyStyle = (el: HTMLElement, styles: Record<string, string>) => {
    const original: Record<string, string> = {};
    Object.keys(styles).forEach(prop => {
      original[prop] = el.style.getPropertyValue(prop);
      el.style.setProperty(prop, styles[prop]);
    });
    elementsToRestore.push({ element: el, styles: original });
  };

  // Fix the target element
  saveAndModifyStyle(element, {
    'position': 'relative',
    'z-index': '1',
    'transform': 'none',
    'filter': 'none'
  });

  // Fix parent containers that might cause issues
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const computed = window.getComputedStyle(parent);
    if (computed.transform !== 'none' || computed.position === 'fixed') {
      saveAndModifyStyle(parent, {
        'transform': 'none',
        'position': 'static'
      });
    }
    parent = parent.parentElement;
  }

  // Return cleanup function
  return () => {
    elementsToRestore.forEach(({ element, styles }) => {
      Object.keys(styles).forEach(prop => {
        if (styles[prop]) {
          element.style.setProperty(prop, styles[prop]);
        } else {
          element.style.removeProperty(prop);
        }
      });
    });
  };
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