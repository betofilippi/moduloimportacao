-- Storage Policies for OCR Documents Bucket
-- Execute this in your Supabase SQL Editor

-- Enable RLS for storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload OCR documents" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'ocr-documents');

-- Policy: Authenticated users can view all OCR documents
CREATE POLICY "Authenticated users can view OCR documents" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ocr-documents');

-- Note: No UPDATE or DELETE policies - users cannot modify or delete files

-- Create a table to track OCR processing results
CREATE TABLE IF NOT EXISTS public.ocr_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  extracted_text TEXT,
  extracted_data JSONB,
  confidence_score NUMERIC(3,2),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on ocr_documents table
ALTER TABLE public.ocr_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert OCR document records
CREATE POLICY "Authenticated users can insert OCR documents" ON public.ocr_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can view all OCR document records
CREATE POLICY "Authenticated users can view OCR documents" ON public.ocr_documents
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can update only their own OCR document records
CREATE POLICY "Users can update own OCR documents" ON public.ocr_documents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: No DELETE policy - records cannot be deleted

-- Create indexes for better performance
CREATE INDEX idx_ocr_documents_user_id ON public.ocr_documents(user_id);
CREATE INDEX idx_ocr_documents_document_type ON public.ocr_documents(document_type);
CREATE INDEX idx_ocr_documents_processing_status ON public.ocr_documents(processing_status);
CREATE INDEX idx_ocr_documents_created_at ON public.ocr_documents(created_at DESC);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER update_ocr_documents_updated_at BEFORE UPDATE ON public.ocr_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();