# Testing Guide - Document Processing System

## Overview

This guide provides step-by-step testing procedures to validate all features of the Document Processing System. Follow these procedures to ensure the system functions correctly in all scenarios.

## Prerequisites

### Environment Setup
1. Ensure all environment variables are configured:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ANTHROPIC_API_KEY=your_anthropic_key
   NOCODB_API_KEY=your_nocodb_key
   NOCODB_API_URL=your_nocodb_url
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Ensure database connections are active:
   - Supabase dashboard accessible
   - NocoDB instance running
   - Test user account created

### Test Data Preparation
- Sample PDF documents for each type
- Valid test user credentials
- Clean database state (or known state)

## Testing Procedures

### 1. Authentication Flow Testing

#### Test Case 1.1: User Registration
**Steps:**
1. Navigate to `/auth/register`
2. Fill in registration form:
   - Email: test@example.com
   - Password: TestPass123!
   - Confirm password: TestPass123!
3. Click "Register"

**Expected Result:**
- User created in Supabase
- Automatic login
- Redirect to dashboard
- Welcome toast notification

#### Test Case 1.2: User Login
**Steps:**
1. Navigate to `/auth/login`
2. Enter credentials:
   - Email: test@example.com
   - Password: TestPass123!
3. Click "Login"

**Expected Result:**
- Successful authentication
- Redirect to last visited page or dashboard
- User menu shows email
- Session persists on refresh

#### Test Case 1.3: Session Persistence
**Steps:**
1. Login successfully
2. Close browser
3. Reopen and navigate to app

**Expected Result:**
- User remains logged in
- No redirect to login page
- Session valid for configured duration

#### Test Case 1.4: Logout
**Steps:**
1. Click user menu
2. Select "Logout"

**Expected Result:**
- Session cleared
- Redirect to login page
- Protected routes inaccessible

### 2. Document Upload Testing

#### Test Case 2.1: Valid PDF Upload
**Steps:**
1. Navigate to `/ocr`
2. Select document type (e.g., "Packing List")
3. Click "Choose File"
4. Select valid PDF (< 10MB)
5. Click "Process Document"

**Expected Result:**
- File uploads successfully
- Progress bar shows upload status
- Processing begins automatically
- Hash generated for deduplication

#### Test Case 2.2: Invalid File Type
**Steps:**
1. Navigate to `/ocr`
2. Select any document type
3. Try to upload non-PDF file

**Expected Result:**
- Error message: "Only PDF files are allowed"
- Upload blocked
- No processing initiated

#### Test Case 2.3: Large File Handling
**Steps:**
1. Upload PDF > 50 pages
2. Monitor processing

**Expected Result:**
- File chunks processed sequentially
- Progress updates show page numbers
- No timeout errors
- Complete processing within reasonable time

#### Test Case 2.4: Duplicate Upload Detection
**Steps:**
1. Upload a PDF and process it
2. Try uploading the same PDF again

**Expected Result:**
- System detects duplicate via hash
- Option to view existing results
- No reprocessing unless forced

### 3. Document Processing Testing

#### Test Case 3.1: Packing List Processing
**Steps:**
1. Upload packing list PDF
2. Select "Packing List" type
3. Process document

**Expected Result:**
- Extracts header information:
  - Invoice number
  - Consignee
  - Load port
  - Destination
- Extracts container details
- Extracts item information
- Shows summary and detailed views

#### Test Case 3.2: Commercial Invoice Processing
**Steps:**
1. Upload commercial invoice PDF
2. Select "Commercial Invoice" type
3. Process document

**Expected Result:**
- Extracts supplier information
- Extracts buyer information
- Lists all items with prices
- Calculates totals correctly
- Currency identified

#### Test Case 3.3: DI Multi-Step Processing
**Steps:**
1. Upload DI document
2. Select "DI" type
3. Monitor multi-step processing

**Expected Result:**
- Step 1: Header extraction
- Step 2: Items extraction (using header context)
- Step 3: Tax information extraction
- Progress shown for each step
- All data properly linked

#### Test Case 3.4: Error Recovery
**Steps:**
1. Upload corrupted or partial PDF
2. Attempt processing

**Expected Result:**
- Graceful error handling
- Clear error message
- Option to retry
- No system crash

### 4. Data Validation Testing

#### Test Case 4.1: Required Field Validation
**Steps:**
1. Process any document
2. In edit mode, clear required fields
3. Try to save

**Expected Result:**
- Validation errors shown
- Required fields highlighted in red
- Save blocked until corrected
- Clear error messages in Portuguese

#### Test Case 4.2: Format Validation
**Steps:**
1. Edit processed document
2. Enter invalid formats:
   - Date: "32/13/2024"
   - CNPJ: "12345"
   - Number: "abc"
3. Try to save

**Expected Result:**
- Format errors displayed
- Suggested correct format shown
- Fields highlighted
- Save blocked

#### Test Case 4.3: Business Rule Validation
**Steps:**
1. Edit DI document
2. Make total value negative
3. Try to save

**Expected Result:**
- Business rule error: "Value cannot be negative"
- Save blocked
- Clear guidance provided

### 5. Save Operations Testing

#### Test Case 5.1: Save New Document
**Steps:**
1. Process new document
2. Review extracted data
3. Click "Save to Database"

**Expected Result:**
- Save progress indicator
- Success notification
- Document ID generated
- Data visible in NocoDB
- Status updated to "saved"

#### Test Case 5.2: Update Existing Document
**Steps:**
1. Load saved document
2. Edit fields
3. Save changes

**Expected Result:**
- Update confirmation
- Changes persisted
- Update timestamp recorded
- Previous data overwritten

#### Test Case 5.3: Concurrent Save Prevention
**Steps:**
1. Open same document in two tabs
2. Edit in both tabs
3. Save from both tabs

**Expected Result:**
- First save succeeds
- Second save shows conflict warning
- Option to reload latest data
- No data corruption

### 6. Process Management Testing

#### Test Case 6.1: Create Import Process
**Steps:**
1. Navigate to `/processo-importacao`
2. Click "New Process"
3. Fill form:
   - Process number
   - Company
   - Responsible person
   - Dates
4. Create process

**Expected Result:**
- Process created successfully
- Appears in process list
- Empty document pipeline shown
- Status: "pending"

#### Test Case 6.2: Link Document to Process
**Steps:**
1. Process a document
2. In save dialog, select existing process
3. Save document

**Expected Result:**
- Document linked to process
- Pipeline status updated
- Document appears in process details
- Relationship stored in database

#### Test Case 6.3: Process Pipeline Visualization
**Steps:**
1. Open process with multiple documents
2. View pipeline status

**Expected Result:**
- All document types shown
- Completed documents marked
- In-progress documents indicated
- Missing documents highlighted
- Timeline visible

### 7. Reporting Testing

#### Test Case 7.1: Document Comparison Report
**Steps:**
1. Navigate to process with multiple documents
2. Select "Compare Documents"
3. Choose comparison type
4. Generate report

**Expected Result:**
- Field-by-field comparison shown
- Matching fields in green
- Discrepancies in red
- Match percentage calculated
- AI analysis provided

#### Test Case 7.2: CSV Export
**Steps:**
1. Generate comparison report
2. Click "Export to CSV"

**Expected Result:**
- CSV file downloads
- All data included
- Proper formatting
- Can open in Excel

#### Test Case 7.3: Full Process Report
**Steps:**
1. Select process with all documents
2. Generate "Full Process Comparison"

**Expected Result:**
- All documents compared
- Cross-document validation
- Comprehensive discrepancy list
- Recommendations provided

### 8. Error Scenarios Testing

#### Test Case 8.1: Network Failure
**Steps:**
1. Start document processing
2. Disconnect network
3. Observe behavior

**Expected Result:**
- Error message displayed
- Option to retry when connected
- No data loss
- Graceful degradation

#### Test Case 8.2: API Limit Exceeded
**Steps:**
1. Process many documents rapidly
2. Exceed API rate limit

**Expected Result:**
- Rate limit message
- Queue system activates
- Automatic retry with backoff
- User informed of delay

#### Test Case 8.3: Invalid Document Content
**Steps:**
1. Upload PDF with no relevant content
2. Process as specific type

**Expected Result:**
- Processing completes
- Empty or minimal results
- Warning message displayed
- Option to try different type

### 9. UI/UX Testing

#### Test Case 9.1: Responsive Design
**Steps:**
1. Access app on mobile device
2. Navigate all pages
3. Test all functions

**Expected Result:**
- All pages mobile-friendly
- Touch targets adequate
- No horizontal scroll
- Features accessible

#### Test Case 9.2: Dark Mode
**Steps:**
1. Toggle dark mode
2. Navigate all pages
3. Check all components

**Expected Result:**
- Consistent dark theme
- Readable contrast
- No broken styles
- Preference persisted

#### Test Case 9.3: Loading States
**Steps:**
1. Trigger slow operations
2. Observe loading indicators

**Expected Result:**
- Skeleton screens shown
- Progress bars accurate
- No UI freezing
- Cancel options available

### 10. Integration Testing

#### Test Case 10.1: End-to-End Import Process
**Steps:**
1. Create new import process
2. Upload and process all document types
3. Link to process
4. Generate reports
5. Complete process

**Expected Result:**
- All documents processed correctly
- Proper linking maintained
- Reports accurate
- Process status updated
- Full audit trail

#### Test Case 10.2: Cross-Document Validation
**Steps:**
1. Process related documents
2. Ensure invoice numbers match
3. Validate totals align
4. Check date consistency

**Expected Result:**
- System identifies relationships
- Highlights discrepancies
- Suggests corrections
- Maintains data integrity

## Performance Testing

### Load Testing
1. Upload 10 documents simultaneously
2. Monitor system response
3. Check processing times
4. Verify no data corruption

**Expected Metrics:**
- Page load: < 3 seconds
- OCR processing: < 30 seconds/page
- Save operations: < 2 seconds
- Search results: < 1 second

### Stress Testing
1. Process 50-page documents
2. Multiple concurrent users
3. Large data queries
4. Extended usage sessions

**Expected Behavior:**
- System remains stable
- Graceful degradation
- No memory leaks
- Error recovery works

## Security Testing

### Authentication Security
1. Try accessing protected routes without login
2. Attempt SQL injection in forms
3. Test XSS in text fields
4. Verify password requirements

**Expected Results:**
- All attacks prevented
- Proper input sanitization
- Strong password enforcement
- Session security maintained

### Data Security
1. Verify HTTPS in production
2. Check API key exposure
3. Test file upload restrictions
4. Verify data encryption

**Expected Results:**
- All communication encrypted
- No sensitive data in logs
- File type validation works
- Data properly protected

## Accessibility Testing

### Keyboard Navigation
1. Navigate entire app with keyboard
2. Test all interactive elements
3. Verify focus indicators
4. Check skip links

**Expected Results:**
- Full keyboard accessibility
- Clear focus indicators
- Logical tab order
- Skip to content works

### Screen Reader Testing
1. Use NVDA/JAWS
2. Navigate all pages
3. Test form interactions
4. Verify announcements

**Expected Results:**
- All content readable
- Form labels clear
- Status updates announced
- No accessibility errors

## Test Result Documentation

### Recording Results
For each test:
1. Test ID and name
2. Date and tester
3. Pass/Fail status
4. Screenshots if failed
5. Steps to reproduce
6. Environment details

### Issue Reporting
When issues found:
1. Clear description
2. Reproduction steps
3. Expected vs actual
4. Severity level
5. Screenshots/videos
6. Browser/OS info

## Regression Testing

### Critical Path Tests
Run these after any changes:
1. User login/logout
2. Document upload
3. OCR processing
4. Data save
5. Report generation

### Automated Test Suite
Consider implementing:
1. Unit tests for processors
2. Integration tests for APIs
3. E2E tests with Playwright
4. Performance benchmarks
5. Security scans

## Conclusion

This testing guide covers all major functionality of the Document Processing System. Regular execution of these tests ensures system reliability and helps identify issues before they reach production. Update this guide as new features are added or requirements change.