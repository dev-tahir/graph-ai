import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Helper function to create CSS overrides for modern color functions
function createCompatibilityCSS(): string {
  return `
    * { 
      color-scheme: none !important; 
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
 * Prepare element for screenshot by fixing common positioning issues
 */
function prepareElementForScreenshot(element: HTMLElement): () => void {
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
 * Capture a screenshot of a DOM element with improved positioning
 */
export async function captureScreenshot(
  element: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  let restoreStyles: (() => void) | null = null;
  
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

    // Scroll element into view if needed
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    
    // Wait for scroll to complete and styles to be applied
    await new Promise(resolve => setTimeout(resolve, 100));

    // Recalculate rect after style changes
    const updatedRect = element.getBoundingClientRect();

    // Store current scroll positions
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Fix positioning issues - use absolute positioning
      x: Math.max(0, updatedRect.left + scrollX),
      y: Math.max(0, updatedRect.top + scrollY),
      width: Math.ceil(updatedRect.width),
      height: Math.ceil(updatedRect.height),
      // Scroll position handling
      scrollX: scrollX,
      scrollY: scrollY,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      // Use foreignObjectRendering to handle modern CSS better
      foreignObjectRendering: true,
      // Ignore elements that might cause issues
      ignoreElements: (element) => {
        const htmlEl = element as HTMLElement;
        return element.tagName === 'IFRAME' || 
               element.classList?.contains('ignore-export') ||
               htmlEl.style?.position === 'fixed';
      },
      // Add onclone callback to fix modern CSS color function issues
      onclone: (clonedDoc: Document) => {
        const style = clonedDoc.createElement('style');
        style.textContent = createCompatibilityCSS();
        clonedDoc.head.appendChild(style);
        
        // Fix positioning in cloned document
        const clonedElement = clonedDoc.documentElement;
        clonedElement.style.transform = 'none';
        clonedElement.style.transformOrigin = 'top left';
        
        // Ensure all child elements have proper positioning
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style) {
            // Remove transforms that might interfere
            if (htmlEl.style.transform && htmlEl.style.transform !== 'none') {
              htmlEl.style.transform = 'none';
            }
            // Fix sticky/fixed positioning
            if (htmlEl.style.position === 'sticky' || htmlEl.style.position === 'fixed') {
              htmlEl.style.position = 'relative';
            }
          }
        });
      },
    });

    if (options.format === 'pdf') {
      return canvasToPDF(canvas, options.filename);
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
  try {
    // Wait for chart animations to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Find the actual chart canvas if it exists (for Chart.js charts)
    const canvas = chartElement.querySelector('canvas');
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      // If it's a Chart.js canvas, we can export directly
      const dataUrl = canvas.toDataURL(`image/${options.format}`, options.quality || 0.95);
      
      if (options.filename) {
        downloadDataUrl(dataUrl, options.filename);
      }
      
      return dataUrl;
    }

    // For SVG charts or complex HTML charts, use html2canvas with special handling
    return await captureScreenshot(chartElement, {
      ...options,
      scale: options.scale || 1.5 // Slightly lower scale for better performance on charts
    });
  } catch (error) {
    console.error('Chart screenshot capture failed:', error);
    return null;
  }
}

// Helper functions
async function canvasToPDF(canvas: HTMLCanvasElement, filename?: string): Promise<string> {
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

  if (filename) {
    pdf.save(filename);
  }

  return imgData;
}

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