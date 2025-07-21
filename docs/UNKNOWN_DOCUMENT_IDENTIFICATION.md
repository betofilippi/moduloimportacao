# Unknown Document Identification Feature

## Overview

The Unknown Document Identification feature uses AI (Claude) to automatically identify document types and find related import processes. This helps users who receive documents without knowing their exact type or which process they belong to.

## How It Works

### 1. Document Upload and Analysis
- User uploads a PDF document
- AI analyzes the document structure and content
- Identifies the document type with confidence score
- Extracts key information like invoice numbers

### 2. Process Matching
- AI searches for existing processes that might be related
- Uses three search modes:
  - **Strict**: Exact invoice number match
  - **Fuzzy**: Similar invoice numbers (considers variations)
  - **AI**: Intelligent matching based on context

### 3. User Flow

#### From Processes Page
1. Click the prominent "Identificar Documento com IA" button
2. Upload the unknown document
3. AI identifies type and shows matching processes
4. Select a process to link the document
5. Navigate to OCR page with pre-selected type and process

#### API Endpoints

- **POST /api/documents/identify**: Main identification endpoint
- **POST /api/analysis/find-process**: AI-powered process matching
- **POST /api/documents/connect-process**: Links document to process

## Technical Implementation

### Document Processor
```typescript
// UnknownDocumentProcessor handles the identification
class UnknownDocumentProcessor extends BaseDocumentProcessor {
  async processWithAutoRoute(file: File, options?: UnknownDocumentProcessingOptions)
}
```

### Key Features
1. **Multi-step Analysis**: First identifies type, then extracts data
2. **Confidence Scoring**: Provides confidence levels for identification
3. **Automatic Routing**: Can auto-process if confidence is high
4. **Process Integration**: Seamlessly connects to existing processes

### UI Components
- **UnknownDocumentModal**: Main interface for document identification
- **Process Selection**: Interactive list of matching processes
- **Visual Feedback**: Confidence badges and AI explanations

## Benefits

1. **Time Saving**: No need to manually identify document types
2. **Error Reduction**: AI helps avoid misclassification
3. **Process Connection**: Automatically links documents to correct processes
4. **User Friendly**: Clear visual feedback and explanations

## Usage Tips

1. **Best Results**: Upload clear, complete PDF documents
2. **Invoice Numbers**: Documents with clear invoice numbers get better matches
3. **Manual Override**: Users can always choose different types if needed
4. **Process Creation**: Can create new process if no matches found

## Future Enhancements

1. Support for more document formats (images, etc.)
2. Batch processing of multiple documents
3. Learning from user corrections
4. Integration with email attachments