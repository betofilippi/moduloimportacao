import { PDFDocument } from 'pdf-lib';

export interface PDFChunk {
  chunkNumber: number;
  buffer: Buffer;
  startPage: number;
  endPage: number;
  totalPages: number;
}

/**
 * Split a PDF into chunks of specified size
 * @param pdfBuffer The PDF buffer to split
 * @param chunkSize Number of pages per chunk (default: 5)
 * @returns Array of PDF chunks
 */
export async function splitPDFIntoChunks(
  pdfBuffer: Buffer, 
  chunkSize: number = 5
): Promise<PDFChunk[]> {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    
    console.log(`PDF has ${totalPages} pages. Splitting into chunks of ${chunkSize} pages.`);
    
    // If PDF has less pages than chunk size, return as single chunk
    if (totalPages <= chunkSize) {
      return [{
        chunkNumber: 1,
        buffer: pdfBuffer,
        startPage: 1,
        endPage: totalPages,
        totalPages
      }];
    }
    
    const chunks: PDFChunk[] = [];
    const totalChunks = Math.ceil(totalPages / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const startPage = i * chunkSize;
      const endPage = Math.min(startPage + chunkSize, totalPages);
      
      // Create a new PDF for this chunk
      const chunkPdf = await PDFDocument.create();
      
      // Copy pages to the chunk
      const pagesToCopy = [];
      for (let pageNum = startPage; pageNum < endPage; pageNum++) {
        pagesToCopy.push(pageNum);
      }
      
      const copiedPages = await chunkPdf.copyPages(pdfDoc, pagesToCopy);
      copiedPages.forEach(page => chunkPdf.addPage(page));
      
      // Save the chunk as buffer
      const chunkBuffer = await chunkPdf.save();
      
      chunks.push({
        chunkNumber: i + 1,
        buffer: Buffer.from(chunkBuffer),
        startPage: startPage + 1, // Convert to 1-based indexing
        endPage: endPage,
        totalPages
      });
      
      console.log(`Created chunk ${i + 1}: pages ${startPage + 1}-${endPage}`);
    }
    
    return chunks;
  } catch (error) {
    console.error('Error splitting PDF:', error);
    throw new Error(`Failed to split PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get PDF page count without splitting
 */
export async function getPDFPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw new Error(`Failed to get PDF page count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}