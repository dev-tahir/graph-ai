import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ProcessedData {
  headers: string[];
  rows: any[][];
  type: 'csv' | 'json' | 'excel';
}

export function validateFile(file: File): boolean {
  const allowedTypes = [
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream' // Added for files with incorrect mime detection
  ];
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  // Check file extension as fallback for mime type detection issues
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['csv', 'json', 'xlsx', 'xls'];
  
  const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(extension || '');
  
  return isValidType && file.size <= maxSize;
}

export async function processCSV(file: File): Promise<ProcessedData> {
  try {
    // Convert File to text first for server-side processing
    const text = await file.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: false,
        complete: (results: any) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            return;
          }
          
          const data = results.data as string[][];
          if (data.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }
          
          const headers = data[0];
          const rows = data.slice(1).filter(row => row.some(cell => cell?.trim()));
          
          resolve({
            headers,
            rows,
            type: 'csv'
          });
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function processJSON(file: File): Promise<ProcessedData> {
  const text = await file.text();
  
  try {
    const json = JSON.parse(text);
    
    // Handle array of objects
    if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object') {
      const headers = Object.keys(json[0]);
      const rows = json.map(obj => headers.map(header => obj[header]));
      
      return {
        headers,
        rows,
        type: 'json'
      };
    }
    
    // Handle simple object (convert to single row)
    if (typeof json === 'object' && !Array.isArray(json)) {
      const headers = Object.keys(json);
      const rows = [headers.map(header => json[header])];
      
      return {
        headers,
        rows,
        type: 'json'
      };
    }
    
    throw new Error('JSON must be an array of objects or a single object');
  } catch (error) {
    throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

export async function processExcel(file: File): Promise<ProcessedData> {
  const buffer = await file.arrayBuffer();
  
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      throw new Error('Excel file has no sheets');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (data.length === 0) {
      throw new Error('Excel sheet is empty');
    }
    
    const headers = data[0].map(cell => String(cell || ''));
    const rows = data.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
    
    return {
      headers,
      rows,
      type: 'excel'
    };
  } catch (error) {
    throw new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Invalid Excel file'}`);
  }
}

export async function processFile(file: File): Promise<ProcessedData> {
  if (!validateFile(file)) {
    throw new Error('Invalid file type or size');
  }
  
  // Get file extension for fallback detection
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Check mime type first, then fall back to extension
  if (file.type === 'text/csv' || extension === 'csv') {
    return processCSV(file);
  }
  
  if (file.type === 'application/json' || extension === 'json') {
    return processJSON(file);
  }
  
  if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.type === 'application/vnd.ms-excel' ||
      extension === 'xlsx' || 
      extension === 'xls') {
    return processExcel(file);
  }
  
  throw new Error(`Unsupported file type: ${file.type} with extension: ${extension}`);
}

export function analyzeData(data: ProcessedData): {
  columnTypes: Record<string, 'number' | 'string' | 'date'>;
  sampleData: any[];
  summary: {
    totalRows: number;
    totalColumns: number;
    numericColumns: string[];
    categoricalColumns: string[];
  };
} {
  const { headers, rows } = data;
  const columnTypes: Record<string, 'number' | 'string' | 'date'> = {};
  const sampleData = rows.slice(0, 10); // First 10 rows for preview
  
  // Analyze column types
  headers.forEach((header, index) => {
    const values = rows.slice(0, 100).map(row => row[index]).filter(val => val !== null && val !== undefined && val !== '');
    
    if (values.length === 0) {
      columnTypes[header] = 'string';
      return;
    }
    
    const numberCount = values.filter(val => !isNaN(Number(val))).length;
    const dateCount = values.filter(val => !isNaN(Date.parse(String(val)))).length;
    
    if (numberCount / values.length > 0.8) {
      columnTypes[header] = 'number';
    } else if (dateCount / values.length > 0.8) {
      columnTypes[header] = 'date';
    } else {
      columnTypes[header] = 'string';
    }
  });
  
  const numericColumns = headers.filter(header => columnTypes[header] === 'number');
  const categoricalColumns = headers.filter(header => columnTypes[header] === 'string');
  
  return {
    columnTypes,
    sampleData,
    summary: {
      totalRows: rows.length,
      totalColumns: headers.length,
      numericColumns,
      categoricalColumns
    }
  };
}