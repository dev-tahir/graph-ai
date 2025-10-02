import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// -------------------------------------------------------------
// Color Function Normalization
// -------------------------------------------------------------

const LAB_REGEX = /lab\(([^)]+)\)/gi;
const LCH_REGEX = /lch\(([^)]+)\)/gi;
const OKLCH_REGEX = /oklch\(([^)]+)\)/gi;
const COLOR_FUNC_REGEX = /color\(([^)]+)\)/gi;

interface RGB { r: number; g: number; b: number }

function clamp(v: number, min = 0, max = 255): number { 
  return Math.min(max, Math.max(min, v)); 
}

function labToSRGB(l: number, a: number, b: number): RGB {
  const y = (l + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;

  const xyz = [x, y, z].map(v => {
    const v3 = v ** 3;
    return v3 > 0.008856 ? v3 : (v - 16 / 116) / 7.787;
  });

  const X = xyz[0] * 95.047;
  const Y = xyz[1] * 100.0;
  const Z = xyz[2] * 108.883;

  let r = X * 0.032406 + Y * (-0.015372) + Z * (-0.004986);
  let g = X * (-0.009689) + Y * 0.018758 + Z * 0.000415;
  let b2 = X * 0.000557 + Y * (-0.002040) + Z * 0.010570;

  const rgbLin = [r, g, b2].map(v => {
    v /= 100;
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  });

  return {
    r: clamp(Math.round(rgbLin[0] * 255)),
    g: clamp(Math.round(rgbLin[1] * 255)),
    b: clamp(Math.round(rgbLin[2] * 255))
  };
}

function lchToSRGB(l: number, c: number, h: number): RGB {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  return labToSRGB(l, a, b);
}

function oklchToSRGB(l: number, c: number, h: number): RGB {
  const labL = l * 100;
  return lchToSRGB(labL, c * 100, h);
}

function parseNumberList(str: string): number[] {
  return str.split(/[\s,/]+/).filter(Boolean).map(v => parseFloat(v));
}

function normalizeModernColors(styleValue: string): string {
  if (!styleValue) return styleValue;

  styleValue = styleValue.replace(LAB_REGEX, (_, inner) => {
    const nums = parseNumberList(inner);
    if (nums.length >= 3) {
      const { r, g, b } = labToSRGB(nums[0], nums[1], nums[2]);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return 'rgb(0, 0, 0)';
  });

  styleValue = styleValue.replace(LCH_REGEX, (_, inner) => {
    const nums = parseNumberList(inner);
    if (nums.length >= 3) {
      const { r, g, b } = lchToSRGB(nums[0], nums[1], nums[2]);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return 'rgb(0, 0, 0)';
  });

  styleValue = styleValue.replace(OKLCH_REGEX, (_, inner) => {
    const nums = parseNumberList(inner);
    if (nums.length >= 3) {
      const { r, g, b } = oklchToSRGB(nums[0], nums[1], nums[2]);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return 'rgb(0, 0, 0)';
  });

  styleValue = styleValue.replace(COLOR_FUNC_REGEX, () => 'rgb(31, 41, 55)');

  return styleValue;
}

/**
 * Create a completely isolated clone with all styles inlined and normalized
 * Enhanced to handle canvas elements properly
 */
function createIsolatedClone(element: HTMLElement): HTMLElement {
  console.log('🔧 Creating isolated clone...');
  
  // Deep clone the element
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Get all elements in both trees
  const originals = [element, ...Array.from(element.querySelectorAll('*'))];
  const clones = [clone, ...Array.from(clone.querySelectorAll('*'))];
  
  // Process each element
  for (let i = 0; i < originals.length; i++) {
    const original = originals[i];
    const cloned = clones[i];
    
    if (!original || !cloned) continue;
    
    // **FIX: Handle canvas elements - copy their content**
    if (original instanceof HTMLCanvasElement && cloned instanceof HTMLCanvasElement) {
      const ctx = cloned.getContext('2d');
      if (ctx) {
        cloned.width = original.width;
        cloned.height = original.height;
        ctx.drawImage(original, 0, 0);
      }
    }
    
    // Get computed styles from original
    const computed = window.getComputedStyle(original);
    
    // Critical properties to copy
    const props = [
      'color', 'background-color', 'background', 'background-image',
      'border-color', 'border', 'border-top-color', 'border-right-color', 
      'border-bottom-color', 'border-left-color',
      'fill', 'stroke', 'stop-color',
      'font-family', 'font-size', 'font-weight', 'line-height',
      'width', 'height', 'padding', 'margin',
      'display', 'position', 'top', 'left', 'right', 'bottom',
      'opacity', 'transform'
    ];
    
    // Build inline style string
    let inlineStyle = '';
    props.forEach(prop => {
      let value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
        // Normalize colors
        value = normalizeModernColors(value);
        inlineStyle += `${prop}: ${value} !important; `;
      }
    });
    
    // Force no animations
    inlineStyle += 'animation: none !important; transition: none !important;';
    
    if (cloned instanceof HTMLElement) {
      cloned.setAttribute('style', inlineStyle);
    }
    
    // Handle SVG attributes
    if (original instanceof SVGElement && cloned instanceof SVGElement) {
      const svgAttrs = ['fill', 'stroke', 'stop-color', 'flood-color'];
      svgAttrs.forEach(attr => {
        let value = original.getAttribute(attr);
        if (value) {
          value = normalizeModernColors(value);
          cloned.setAttribute(attr, value);
        }
      });
    }
  }
  
  console.log('✅ Isolated clone created');
  return clone;
}

/**
 * Create an isolated container for rendering
 */
function createIsolatedContainer(element: HTMLElement): { container: HTMLElement; cleanup: () => void } {
  console.log('📦 Creating isolated container...');
  
  // Create container with clean styles
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: -10000px;
    left: -10000px;
    width: ${element.offsetWidth}px;
    height: ${element.offsetHeight}px;
    background: rgb(255, 255, 255) !important;
    z-index: -1;
    isolation: isolate;
  `;
  
  // Add clean stylesheet to container
  const style = document.createElement('style');
  style.textContent = `
    * {
      color: rgb(31, 41, 55) !important;
      border-color: rgb(229, 231, 235) !important;
    }
    svg, path, circle, rect, line, polyline, polygon {
      fill: rgb(59, 130, 246) !important;
      stroke: rgb(59, 130, 246) !important;
    }
  `;
  container.appendChild(style);
  
  // Clone the element with all styles inlined
  const clone = createIsolatedClone(element);
  container.appendChild(clone);
  
  // Append to body
  document.body.appendChild(container);
  
  console.log('✅ Container created and appended');
  
  // Return cleanup function
  return {
    container: clone,
    cleanup: () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
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
 * Find the actual chart element within a container
 * This excludes titles, buttons, and other UI elements
 */
function findChartElement(container: HTMLElement): HTMLElement | null {
  // Try to find canvas (Chart.js, etc.)
  let chart: Element | null = container.querySelector('canvas');
  if (chart) return chart as HTMLElement;
  
  // Try to find SVG (Recharts, D3, etc.)
  chart = container.querySelector('svg');
  if (chart) return chart as HTMLElement;
  
  // Try to find a div with common chart class names
  const chartSelectors = [
    '[class*="chart-container"]',
    '[class*="chart-wrapper"]',
    '[class*="recharts-wrapper"]',
    '[class*="plotly"]',
    '[class*="recharts"]',
    '.recharts-surface',
    '.plotly-graph-div',
    '.highcharts-container',
    '[data-testid*="chart"]',
    '[id*="chart"]'
  ];
  
  for (const selector of chartSelectors) {
    chart = container.querySelector(selector);
    if (chart) return chart as HTMLElement;
  }
  
  return null;
}

/**
 * Main capture function using isolated rendering
 * **IMPORTANT: Pass ONLY the chart element, not the container with buttons!**
 * **TIP: Use captureChartOnly() to automatically find and capture just the chart**
 */
export async function captureScreenshot(
  element: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  let cleanup: (() => void) | null = null;
  
  try {
    console.log('🎯 Starting screenshot capture with isolated rendering...');
    
    // Verify element is visible
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      throw new Error('Element has zero dimensions');
    }
    
    console.log('Element size:', rect.width, 'x', rect.height);
    
    // **REMOVED: Don't wait before cloning - we need to clone immediately**
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create isolated clone
    const { container, cleanup: cleanupFn } = createIsolatedContainer(element);
    cleanup = cleanupFn;
    
    // **INCREASED: Give more time for charts to settle**
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📸 Capturing isolated container...');
    
    // Capture with minimal options
    const canvas = await html2canvas(container, {
      scale: options.scale || 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: false,
    });
    
    console.log('✅ Canvas created:', canvas.width, 'x', canvas.height);
    
    // Cleanup immediately
    cleanup();
    cleanup = null;
    
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas has zero dimensions');
    }

    // Handle PDF
    if (options.format === 'pdf') {
      console.log('📄 Creating PDF...');
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      const imgData = canvas.toDataURL('image/png', options.quality || 0.95);
      
      if (!imgData || !imgData.startsWith('data:image/png')) {
        throw new Error('Invalid image data');
      }
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      if (options.filename) {
        pdf.save(options.filename);
        console.log('✅ PDF saved:', options.filename);
      }
      
      return imgData;
    }

    // Handle image
    const mimeType = options.format === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, options.quality || 0.95);

    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('Invalid data URL');
    }

    if (options.filename) {
      downloadDataUrl(dataUrl, options.filename);
      console.log('✅ Image saved:', options.filename);
    }

    return dataUrl;
    
  } catch (error) {
    console.error('❌ Screenshot failed:', error);
    
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    
    return null;
    
  } finally {
    // Ensure cleanup always runs
    if (cleanup) {
      try {
        cleanup();
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
    }
  }
}

/**
 * Enhanced capture that automatically finds the chart within a container
 */
export async function captureChartOnly(
  containerOrChart: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  // Try to find the chart element
  let chartElement = findChartElement(containerOrChart);
  
  // If not found, assume the passed element IS the chart
  if (!chartElement) {
    chartElement = containerOrChart;
  }
  
  console.log('📊 Chart element found:', chartElement.tagName, chartElement.className);
  
  // Use the existing captureScreenshot function
  return await captureScreenshot(chartElement, options);
}

/**
 * Chart-specific capture (backwards compatibility)
 */
export async function captureChartScreenshot(
  chartElement: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string | null> {
  console.log('📊 Capturing chart...');
  return await captureChartOnly(chartElement, options);
}

/**
 * Bulk export
 */
export async function bulkExportGraphs(
  elements: { element: HTMLElement; title: string }[],
  options: BulkExportOptions
): Promise<void> {
  if (elements.length === 0) {
    throw new Error('No elements to export');
  }

  console.log(`📦 Bulk exporting ${elements.length} graphs...`);

  if (options.format === 'pdf') {
    let pdf: jsPDF | null = null;

    for (let i = 0; i < elements.length; i++) {
      const { element, title } = elements[i];
      
      try {
        console.log(`Processing ${i + 1}/${elements.length}: ${title}`);
        
        // Use chart-only capture to avoid extra UI elements
        const dataUrl = await captureChartOnly(element, { format: 'png' });
        
        if (!dataUrl) {
          console.warn(`Skipping "${title}" - capture failed`);
          continue;
        }

        if (!pdf) {
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });
        } else {
          pdf.addPage();
        }

        if (options.includeTitle) {
          pdf.setFontSize(16);
          pdf.text(title, 20, 20);
        }

        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataUrl;
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const titleHeight = options.includeTitle ? 30 : 20;
        const availableHeight = pageHeight - titleHeight - 20;
        
        const maxWidth = pageWidth - 40;
        const aspectRatio = img.width / img.height;
        
        let finalWidth = maxWidth;
        let finalHeight = maxWidth / aspectRatio;
        
        if (finalHeight > availableHeight) {
          finalHeight = availableHeight;
          finalWidth = finalHeight * aspectRatio;
        }
        
        if (finalWidth > 0 && finalHeight > 0) {
          pdf.addImage(dataUrl, 'PNG', 20, titleHeight, finalWidth, finalHeight);
        }
        
        console.log(`✅ Added "${title}"`);
      } catch (error) {
        console.error(`❌ Failed "${title}":`, error);
      }
    }

    if (pdf && options.filename) {
      pdf.save(options.filename);
      console.log('✅ PDF saved!');
    } else if (!pdf) {
      throw new Error('No valid elements exported');
    }
  } else {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const { element, title } of elements) {
      try {
        // Use chart-only capture for ZIP exports too
        const dataUrl = await captureChartOnly(element, { format: 'png' });
        
        if (dataUrl) {
          const base64Data = dataUrl.split(',')[1];
          const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          zip.file(`${sanitizedTitle}.png`, base64Data, { base64: true });
          console.log(`✅ Added "${title}"`);
        }
      } catch (error) {
        console.error(`❌ Failed "${title}":`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename || 'graphs.zip';
    link.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ ZIP downloaded!');
  }
}

/**
 * Dashboard export
 */
export async function exportDashboardToPDF(
  dashboardElement: HTMLElement,
  title: string,
  filename: string
): Promise<void> {
  try {
    console.log('📄 Exporting dashboard...');
    
    const dataUrl = await captureScreenshot(dashboardElement, {
      format: 'png',
      scale: 1.5
    });
    
    if (!dataUrl) {
      throw new Error('Failed to capture dashboard');
    }

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width + 100, img.height + 100]
    });

    pdf.setFontSize(24);
    pdf.text(title, 50, 40);
    
    pdf.setFontSize(12);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, 50, 60);

    pdf.addImage(dataUrl, 'PNG', 50, 80, img.width, img.height);
    
    pdf.save(filename);
    console.log('✅ Dashboard saved!');
    
  } catch (error) {
    console.error('❌ Dashboard export failed:', error);
    throw error;
  }
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getOptimalExportSettings(element: HTMLElement): ExportOptions {
  const rect = element.getBoundingClientRect();
  const isLarge = rect.width > 1200 || rect.height > 800;
  
  return {
    format: 'png',
    scale: isLarge ? 1.5 : 2,
    quality: 0.95,
  };
}

export function exportDataAsCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
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
 * Debug helper to analyze chart elements in a container
 */
export function debugChartElements(container: HTMLElement): void {
  console.group('🔍 Chart Elements Analysis');
  
  const rect = container.getBoundingClientRect();
  console.log('Container dimensions:', rect.width, 'x', rect.height);
  
  // Find all potential chart elements
  const canvases = container.querySelectorAll('canvas');
  const svgs = container.querySelectorAll('svg');
  const chartDivs = container.querySelectorAll('[class*="chart"], [class*="recharts"], [class*="plotly"]');
  
  console.log('Found elements:', {
    canvases: canvases.length,
    svgs: svgs.length,
    chartDivs: chartDivs.length
  });
  
  // Check what would be selected
  const detected = findChartElement(container);
  if (detected) {
    const detectedRect = detected.getBoundingClientRect();
    console.log('Detected chart:', {
      tag: detected.tagName,
      className: detected.className,
      dimensions: `${detectedRect.width}x${detectedRect.height}`
    });
  } else {
    console.log('⚠️ No chart element detected');
  }
  
  console.groupEnd();
}

export function debugPDFExport(element: HTMLElement): void {
  console.group('📊 Debug');
  
  const rect = element.getBoundingClientRect();
  console.log('Dimensions:', rect.width, 'x', rect.height);
  
  const styles = window.getComputedStyle(element);
  const hasModern = (s: string) => /lab\(|lch\(|oklch\(|color\(/.test(s);
  
  console.log('Modern colors:', {
    bg: hasModern(styles.backgroundColor),
    color: hasModern(styles.color)
  });
  
  console.groupEnd();
}

export async function testExportWithLogging(element: HTMLElement, title: string = 'test'): Promise<void> {
  console.group('🧪 Test Export');
  debugChartElements(element);
  debugPDFExport(element);
  
  try {
    // Test both regular capture and chart-only capture
    console.log('Testing chart-only capture...');
    const chartResult = await captureChartOnly(element, {
      format: 'png',
      filename: `${title}_chart_only_test.png`
    });
    
    console.log('Chart-only result:', chartResult ? '✅ Success' : '❌ Failed');
    
    console.log('Testing full element capture...');
    const fullResult = await captureScreenshot(element, {
      format: 'png',
      filename: `${title}_full_test.png`
    });
    
    console.log('Full element result:', fullResult ? '✅ Success' : '❌ Failed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.groupEnd();
}