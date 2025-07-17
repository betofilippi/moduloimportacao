# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev         # Start development server with Turbopack
npm run build       # Build production bundle
npm run start       # Start production server
npm run lint        # Run ESLint
```

## Architecture Overview

This is a modular ERP system for import/export document management with OCR capabilities, built on Next.js 15.3.5 with TypeScript.

### Core Technologies
- **Framework**: Next.js 15.3.5 (App Router)
- **Language**: TypeScript (relaxed mode - no strict)
- **Auth**: Supabase Auth with SSR
- **Database**: Supabase (PostgreSQL) + NocoDB
- **OCR/AI**: Anthropic Claude API, Google Cloud Vision
- **UI**: Radix UI + Tailwind CSS

### Document Processing Architecture

The system uses a **Factory Pattern** for extensible document processing:

1. **Base Classes** (`src/services/documents/base/`)
   - `DocumentProcessor.ts` - Abstract base for all processors
   - `DocumentValidator.ts` - Common validation logic
   - `types.ts` - Shared interfaces and enums

2. **Document Modules** (`src/services/documents/[type]/`)
   Each document type contains:
   - `types.ts` - Type-specific interfaces
   - `prompts.ts` - Claude prompts (single or multi-step)
   - `[Type]Processor.ts` - Processing logic
   - `[Type]Validator.ts` - Validation rules

3. **Factory Registration** (`src/services/documents/DocumentProcessorFactory.ts`)
   - Auto-discovery of processors
   - Dynamic registration
   - Central processor management

### API Structure

Dynamic routes handle all document types:
```
/api/documents/[type]/process   # Process document
/api/documents/[type]/validate  # Validate extracted data
/api/documents/[type]/prompts   # Get type prompts
/api/documents/types            # List supported types
```

### Adding New Document Types

1. Create module structure:
   ```
   src/services/documents/new-type/
   ├── types.ts
   ├── prompts.ts
   ├── NewTypeProcessor.ts
   └── NewTypeValidator.ts
   ```

2. Extend `BaseDocumentProcessor` in your processor

3. Add to `DocumentType` enum in `base/types.ts`

4. Register in `src/services/documents/index.ts`

### Component Architecture

**OCR Results** (`src/components/ocr/results/`)
- `BaseViewer` provides shared state management hook
- Layouts handle table viewing/editing
- Document-specific viewers extend base functionality
- Field mapping handles OCR (English) to DB (Portuguese) conversion

**Authentication Flow**
- Middleware protects routes at `/middleware.ts`
- Protected routes under `app/(authenticated)/`
- Session refresh every 10 minutes
- Role-based access (admin/user)

### Multi-Step Processing

For complex documents:
```typescript
export const documentSteps: PromptStep[] = [
  { step: 1, name: "Header", prompt: "...", expectsInput: false },
  { step: 2, name: "Items", prompt: "...", expectsInput: true }
];
```

### Database Schema

- **Supabase**: Authentication, core data
- **NocoDB**: Business data, document storage
- Tables configured in `src/config/nocodb-tables.ts`

### Key Services

- `DocumentService` - High-level document operations
- `NocoDBService` - Database operations
- `StorageService` - File storage management
- `DocumentCacheService` - Processing cache

### Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NOCODB_API_KEY`
- `NOCODB_API_URL`

### Development Notes

- TypeScript strict mode is disabled
- Build errors are ignored (`ignoreBuildErrors: true`)
- External packages for canvas/sharp configured
- Hot reload via Turbopack in development