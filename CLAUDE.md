# CLAUDE.md - Document Processing System Developer Guide

This file provides comprehensive guidance for developing new document types in the modular ERP system for import/export document management.

## System Architecture Overview

### Core Technologies
- **Framework**: Next.js 15.3.5 (App Router)
- **Language**: TypeScript (relaxed mode - no strict)
- **Auth**: Supabase Auth with SSR
- **Database**: Supabase (PostgreSQL) + NocoDB
- **OCR/AI**: Anthropic Claude API
- **UI**: Radix UI + Tailwind CSS

### Architecture Patterns

1. **Factory Pattern**: Central processor management and discovery
2. **Abstract Base Class**: Common functionality for all processors
3. **Strategy Pattern**: Document-specific processing strategies
4. **Composition Pattern**: Reusable UI components with shared state

## Development Commands

```bash
npm run dev         # Start development server with Turbopack
npm run build       # Build production bundle
npm run start       # Start production server
npm run lint        # Run ESLint
```

## Adding a New Document Type - Step by Step Guide

### Step 1: Create Document Module Structure

Create the following directory structure:
```
src/services/documents/[document-type]/
├── types.ts              # TypeScript interfaces
├── prompts.ts            # Claude AI prompts
├── [DocumentType]Processor.ts    # Processing logic
└── [DocumentType]Validator.ts    # Validation rules
```

### Step 2: Define Types (types.ts)

```typescript
// Define your document structure
export interface [DocumentType]Header {
  // Header fields matching OCR output
}

export interface [DocumentType]Item {
  // Item/line fields if applicable
}

export interface [DocumentType]ProcessingResult {
  header: [DocumentType]Header;
  items?: [DocumentType]Item[];
  // Add other sections as needed
}
```

### Step 3: Create Prompts (prompts.ts)

For simple documents:
```typescript
export const [documentType]Prompt = `
Extract the following information from this [document type]:

1. Field Name: description
2. Another Field: description

Return as JSON:
{
  "field_name": "value",
  "another_field": "value"
}
`;
```

For complex multi-step documents:
```typescript
export const documentSteps: PromptStep[] = [
  {
    step: 1,
    name: "Header",
    prompt: "Extract header information...",
    expectsInput: false
  },
  {
    step: 2,
    name: "Items",
    prompt: "Extract items based on this header data:",
    expectsInput: true
  }
];
```

### Step 4: Implement Processor

```typescript
import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingResult } from '../base/types';
import { [documentType]Prompt } from './prompts';
import { [DocumentType]ProcessingResult } from './types';

export class [DocumentType]Processor extends BaseDocumentProcessor<[DocumentType]ProcessingResult> {
  protected documentType = DocumentType.[DOCUMENT_TYPE];
  
  protected async extractData(text: string): Promise<ProcessingResult<[DocumentType]ProcessingResult>> {
    try {
      // For simple documents
      const result = await this.callClaude(text, [documentType]Prompt);
      return {
        success: true,
        data: this.parseJSON(result),
        documentType: this.documentType
      };
      
      // For multi-step documents
      // return this.processMultiStep(text, documentSteps);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

### Step 5: Implement Validator

```typescript
import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError } from '../base/types';
import { [DocumentType]ProcessingResult } from './types';

export class [DocumentType]Validator extends DocumentValidator {
  validate(data: [DocumentType]ProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Required field validations
    if (!data.header?.required_field) {
      errors.push({
        field: 'required_field',
        message: 'Campo obrigatório não encontrado',
        severity: 'error'
      });
    }
    
    // Business rule validations
    if (data.header?.amount && data.header.amount < 0) {
      errors.push({
        field: 'amount',
        message: 'Valor não pode ser negativo',
        severity: 'error'
      });
    }
    
    // Optional validations that generate warnings
    if (!data.header?.optional_field) {
      warnings.push({
        field: 'optional_field',
        message: 'Campo opcional não preenchido',
        severity: 'warning'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

### Step 6: Register Document Type

1. Add to enum in `src/services/documents/base/types.ts`:
```typescript
export enum DocumentType {
  // ... existing types
  [DOCUMENT_TYPE] = '[document_type]'
}
```

2. Register in `src/services/documents/index.ts`:
```typescript
import { [DocumentType]Processor } from './[document-type]/[DocumentType]Processor';

// In registerProcessors function
factory.registerProcessor(new [DocumentType]Processor());
```

### Step 7: Add Database Mappings

In `src/config/nocodb-tables.ts`:

1. Add table configuration:
```typescript
export const NOCODB_TABLES = {
  // ... existing tables
  [DOCUMENT_TYPE]: '[NocoDB_Table_ID]'
};
```

2. Add field mappings (Database field → OCR field):
```typescript
export const TABLE_FIELD_MAPPINGS = {
  // ... existing mappings
  [DOCUMENT_TYPE]: {
    banco_field_name: 'ocr_field_name',
    // Map all fields from Portuguese (DB) to English (OCR)
  }
};
```

### Step 8: Create Viewer Component

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BaseViewerProps, useViewerState } from '../components/BaseViewer';
import { FieldSection } from '../components/FieldSection';

export function [DocumentType]Viewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    className
  } = props;
  
  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    setEditedData
  } = useViewerState(props.data || {}, props);
  
  // Define fields to display
  const headerFields = [
    {
      key: 'field_name',
      label: 'Field Label',
      type: 'text',
      icon: <IconComponent className="h-5 w-5" />
    }
    // Add all fields
  ];
  
  if (variant === 'summary') {
    // Return compact summary view
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        {/* Header with title and action buttons */}
      </CardHeader>
      <CardContent>
        <FieldSection
          title="Section Title"
          fields={headerFields}
          data={editedData}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              [field]: value
            }));
          }}
        />
      </CardContent>
    </Card>
  );
}
```

### Step 9: Add Save/Update Methods

In `src/services/documents/DocumentSaveService.ts`:

1. Add save method:
```typescript
async save[DocumentType](
  data: [DocumentType]ProcessingResult,
  options: SaveOptions = {}
): Promise<SaveResult> {
  try {
    const timestamp = new Date().toISOString();
    const userId = options.userId || 'sistema';
    
    // Prepare data
    const prepared = this.prepare[DocumentType]Data(data);
    
    // Transform to DB format
    const transformed = transformToNocoDBFormat(
      prepared,
      TABLE_FIELD_MAPPINGS.[DOCUMENT_TYPE]
    );
    
    // Save to database
    const saved = await this.nocodb.create(
      NOCODB_TABLES.[DOCUMENT_TYPE],
      transformed
    );
    
    return {
      success: true,
      documentId: saved.Id,
      details: { saved }
    };
  } catch (error) {
    return this.handleSaveError(error);
  }
}
```

2. Add to generic save method switch case:
```typescript
case '[documenttype]':
  return this.save[DocumentType](data as [DocumentType]ProcessingResult, options);
```

### Step 10: Wire Everything Together

1. Export viewer from `src/components/ocr/results/viewers/index.ts`
2. Add case in `OCRResultsViewer.tsx` to render your viewer
3. Add save/update cases in `src/app/(authenticated)/ocr/page.tsx`
4. Add to `useDocumentSave` hook if needed

## Data Flow

```
1. PDF Upload → 2. OCR Processing → 3. Data Extraction → 4. Validation
                                                              ↓
8. Database ← 7. Transform ← 6. Save/Update ← 5. UI Display
```

## Best Practices

### 1. Type Safety
- Define comprehensive TypeScript interfaces
- Use enums for constants
- Leverage generic types from base classes

### 2. Error Handling
- Use base class error handling methods
- Provide meaningful error messages in Portuguese
- Distinguish between errors and warnings

### 3. Validation
- Validate required fields
- Check data formats (dates, numbers, CNPJ/CPF)
- Apply business rules specific to document type

### 4. UI/UX
- Provide both summary and detailed views
- Use consistent icons and layouts
- Support edit/save/cancel workflows
- Show field labels in Portuguese

### 5. Field Mapping
- OCR returns English field names
- Database uses Portuguese field names
- Mappings handle bidirectional conversion
- Use accessor functions for flexibility

## Testing New Document Types

1. **Unit Tests**
   - Test processor data extraction
   - Test validator rules
   - Test field mappings

2. **Integration Tests**
   - Test full OCR → Save flow
   - Test update operations
   - Test data reconstruction from DB

3. **Manual Testing**
   - Upload sample documents
   - Verify data extraction accuracy
   - Test edit/save functionality
   - Confirm database storage

## Common Patterns

### Multi-Step Processing
Use for documents with dependent data:
```typescript
const steps: PromptStep[] = [
  { step: 1, name: "Header", prompt: "...", expectsInput: false },
  { step: 2, name: "Items", prompt: "...", expectsInput: true }
];
```

### Field Accessors
Handle multiple data formats:
```typescript
const accessor = (data: any) => 
  data.english_field || data.portuguese_field || data.nested?.field;
```

### Data Preparation
Transform OCR output for database:
```typescript
private prepare[DocumentType]Data(data: any): Record<string, any> {
  return {
    ...data.header,
    items: JSON.stringify(data.items || []),
    hash_arquivo_origem: data.fileHash,
    criado_por: 'sistema'
  };
}
```

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NOCODB_API_KEY=
NOCODB_API_URL=
```

## Troubleshooting

### OCR Not Extracting Data
- Check prompt clarity and examples
- Verify PDF text is extractable (not image)
- Test with Claude API directly

### Validation Failures
- Review validator logic
- Check field mappings
- Verify data types match schema

### Save Failures
- Confirm NocoDB table exists
- Check field mappings match table columns
- Verify authentication and permissions

### UI Not Updating
- Check state management in viewer
- Verify field accessors are correct
- Confirm onChange handlers are wired

## File Reference Guide

### Essential Files for New Development

**Base Infrastructure** (Read these first):
- `src/services/documents/base/types.ts` - Core interfaces
- `src/services/documents/base/DocumentProcessor.ts` - Base processor
- `src/services/documents/base/DocumentValidator.ts` - Base validator
- `src/components/ocr/results/components/BaseViewer.tsx` - Base UI logic

**Configuration**:
- `src/config/nocodb-tables.ts` - Database mappings
- `src/services/documents/index.ts` - Processor registration

**Reference Implementations** (Use as templates):
- Swift (simple): `src/services/documents/swift/*`
- DI (complex multi-step): `src/services/documents/di/*`

**UI Components**:
- `src/components/ocr/results/components/FieldSection.tsx` - Field display
- `src/components/ocr/results/utils/fieldMapping.ts` - Mapping utilities

### Files to Ignore

**Legacy/Deprecated**:
- `src/services/ocr/documentPrompts.ts` - Old prompt system
- Individual prompt files outside document modules

**Internal/System**:
- `src/services/ocr/pdfChunker.ts` - Internal PDF processing
- `src/services/ocr/claudePDF.ts` - Internal Claude integration

This guide provides everything needed to add new document types to the system while maintaining consistency with existing patterns and best practices.