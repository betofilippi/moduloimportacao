'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface BaseViewerProps {
  data: any;
  results?: any;
  onSave?: (data: any) => void;
  onSaveToDatabase?: (data: any) => void;
  variant?: 'summary' | 'detailed';
  readonly?: boolean;
  className?: string;
}

export interface ExtractedData {
  header?: any;
  items?: any[];
  taxInfo?: any[];
  diInfo?: any;
  [key: string]: any;
}

/**
 * Base hook for managing viewer state and data extraction
 */
export function useViewerState<T extends ExtractedData>(
  initialData: T,
  props: BaseViewerProps
) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<T>(initialData);
  const [originalData, setOriginalData] = useState<T>(initialData);

  // Extract data from various possible structures
  useEffect(() => {
    // Only update if we're not editing
    if (isEditing) return;
    
    let extractedData = { ...initialData };

    const { data, results } = props;
    
    console.log('🔍 BaseViewer useEffect - props:', { data, results });
    console.log('🔍 BaseViewer useEffect - initialData:', initialData);

    // Try different data structures
    if (data?.structuredResult) {
      Object.keys(initialData).forEach(key => {
        if (data.structuredResult[key]?.data) {
          extractedData[key as keyof T] = data.structuredResult[key].data;
        } else if (data.structuredResult[key]) {
          extractedData[key as keyof T] = data.structuredResult[key];
        }
      });
    } else if (results?.ocr?.data?.structuredResult) {
      const structured = results.ocr.data.structuredResult;
      Object.keys(initialData).forEach(key => {
        if (structured[key]?.data) {
          extractedData[key as keyof T] = structured[key].data;
        } else if (structured[key]) {
          extractedData[key as keyof T] = structured[key];
        }
      });
    } else if (data?.multiPrompt?.steps) {
      // Handle multi-prompt format
      const steps = data.multiPrompt.steps;
      
      // Usually step 1 is header, step 2 is items
      const step1Result = steps.find((s: any) => s.step === 1)?.result;
      const step2Result = steps.find((s: any) => s.step === 2)?.result;
      
      if (step1Result && 'header' in initialData) {
        extractedData.header = typeof step1Result === 'string' ? 
          JSON.parse(step1Result) : step1Result;
      }
      
      if (step2Result && 'items' in initialData) {
        extractedData.items = typeof step2Result === 'string' ? 
          JSON.parse(step2Result) : step2Result;
      }
    } else if (results?.ocr?.data) {
      // Check if data is directly in results.ocr.data
      const ocrData = results.ocr.data;
      console.log('🔍 Checking results.ocr.data:', ocrData);
      
      Object.keys(initialData).forEach(key => {
        if (ocrData[key] !== undefined) {
          extractedData[key as keyof T] = ocrData[key];
        }
      });
      
      // Special handling for containers -> items mapping in ocr data
      if ('items' in initialData && !ocrData.items && ocrData.containers) {
        console.log('🔄 Mapping containers to items in OCR data');
        extractedData.items = ocrData.containers;
      }
    } else if (data) {
      // Direct data structure
      Object.keys(initialData).forEach(key => {
        if (data[key] !== undefined) {
          extractedData[key as keyof T] = data[key];
        }
      });
      
      // Special handling for containers -> items mapping
      if ('items' in initialData && !data.items && data.containers) {
        console.log('🔄 Mapping containers to items in BaseViewer');
        extractedData.items = data.containers;
      }
    }

    console.log('🔍 BaseViewer - extractedData final:', extractedData);
    setEditedData(extractedData);
    setOriginalData(extractedData);
  }, [props.data, props.results, isEditing]); // Added isEditing to dependencies

  const handleEdit = () => setIsEditing(true);

  const handleSave = () => {
    console.log('🔍 BaseViewer handleSave - editedData:', editedData);
    if (props.onSave) {
      props.onSave(editedData);
    }
    setIsEditing(false);
    setOriginalData(editedData);
  };

  const handleCancel = () => {
    setEditedData(originalData);
    setIsEditing(false);
  };

  const updateData = (updates: Partial<T>) => {
    console.log('🔍 BaseViewer updateData - updates:', updates);
    setEditedData(prev => {
      const newData = { ...prev, ...updates };
      console.log('🔍 BaseViewer updateData - newData:', newData);
      return newData;
    });
  };

  const updateField = (section: keyof T, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    if (!('items' in editedData)) return;
    
    setEditedData(prev => ({
      ...prev,
      items: (prev.items as any[]).map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateSection = (section: keyof T, value: any) => {
    setEditedData(prev => ({ ...prev, [section]: value }));
  };

  return {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    updateData,
    updateField,
    updateItem,
    updateSection,
    setEditedData
  };
}

/**
 * Utility functions commonly used in viewers
 */
export const viewerUtils = {
  formatCurrency: (value: number | string, currency: string = 'USD'): string => {
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue || 0);
  },
  
  safeReplace: (value: any, find: string, replace: string): string => {
    if (!value) return '';
    return value.toString().replace(new RegExp(find, 'g'), replace);
  },
  
  parseNumber: (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
};