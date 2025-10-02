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
 * Capture a screenshot of a DOM element
 */
export async function captureScreenshot(
  element: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  try {
    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Use foreignObjectRendering to handle modern CSS better
      foreignObjectRendering: true,
      // Add onclone callback to fix modern CSS color function issues
      onclone: createHtml2CanvasCloneCallback(),
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
    const canvas = await html2canvas(dashboardElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      onclone: createHtml2CanvasCloneCallback(),
    });

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

async function bulkExportToPDF(
  elements: { element: HTMLElement; title: string }[],
  options: BulkExportOptions
): Promise<void> {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  for (let i = 0; i < elements.length; i++) {
    const { element, title } = elements[i];
    
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

    // Capture element
    const canvas = await html2canvas(element, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      logging: false,
      foreignObjectRendering: true,
      onclone: createHtml2CanvasCloneCallback(),
    });

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
  }

  pdf.save(options.filename || `graphs_export_${Date.now()}.pdf`);
}

async function bulkExportToPNG(
  elements: { element: HTMLElement; title: string }[],
  options: BulkExportOptions
): Promise<void> {
  const images: { data: string; filename: string }[] = [];

  for (const { element, title } of elements) {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      foreignObjectRendering: true,
      onclone: createHtml2CanvasCloneCallback(),
    });

    const dataUrl = canvas.toDataURL('image/png');
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    
    images.push({ data: dataUrl, filename });
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