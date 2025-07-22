import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';
import Anthropic from '@anthropic-ai/sdk';

/**
 * API Route to find matching processes using Claude AI
 * Analyzes document data against existing processes
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ProcessMatchRequest {
  documentData: {
    invoiceNumber?: string;
    references?: string[];
    companyName?: string;
    date?: string;
    amount?: number;
    currency?: string;
    extractedText?: string;
  };
  searchMode?: 'strict' | 'fuzzy' | 'ai';
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ProcessMatchRequest = await request.json();
    const { documentData, searchMode = 'ai' } = body;

    // Get NocoDB service
    const nocodb = getNocoDBService();

    // Fetch all active processes
    const processesResult = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      where: "(status,eq,active)",
      limit: 1000,
      sort: ['-data_inicio']
    });

    if (!processesResult.list || processesResult.list.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        message: 'Nenhum processo ativo encontrado'
      });
    }

    // Prepare matches based on search mode
    let matches = [];

    if (searchMode === 'strict') {
      // Exact invoice number match
      if (documentData.invoiceNumber) {
        matches = processesResult.list.filter(p => 
          p.invoiceNumber === documentData.invoiceNumber
        );
      }
    } else if (searchMode === 'fuzzy') {
      // Fuzzy matching on multiple fields
      matches = processesResult.list.filter(p => {
        let score = 0;
        
        // Invoice number similarity
        if (documentData.invoiceNumber && p.invoiceNumber) {
          if (p.invoiceNumber.includes(documentData.invoiceNumber) || 
              documentData.invoiceNumber.includes(p.invoiceNumber)) {
            score += 5;
          }
        }
        
        // Company name similarity
        if (documentData.companyName && p.empresa) {
          const companyLower = documentData.companyName.toLowerCase();
          const empresaLower = p.empresa.toLowerCase();
          if (companyLower.includes(empresaLower) || empresaLower.includes(companyLower)) {
            score += 3;
          }
        }
        
        // Amount similarity (within 10%)
        if (documentData.amount && p.valor_total_estimado) {
          const diff = Math.abs(documentData.amount - p.valor_total_estimado);
          const percent = diff / p.valor_total_estimado;
          if (percent < 0.1) {
            score += 2;
          }
        }
        
        return score >= 3; // Minimum score to consider a match
      });
    } else {
      // AI-based matching using Claude
      const prompt = `
Analyze the following document data and find matching import processes.

Document Data:
${JSON.stringify(documentData, null, 2)}

Existing Processes:
${JSON.stringify(processesResult.list.map(p => ({
  numero_processo: p.numero_processo,
  invoiceNumber: p.invoiceNumber,
  empresa: p.empresa,
  valor_total_estimado: p.valor_total_estimado,
  moeda: p.moeda,
  data_inicio: p.data_inicio,
  porto_embarque: p.porto_embarque,
  porto_destino: p.porto_destino
})), null, 2)}

Find processes that match based on:
1. Invoice numbers (exact or partial matches)
2. Company names (consider variations and abbreviations)
3. Amounts (consider currency and small variations)
4. Dates (consider proximity)
5. Any other relevant information in the extracted text

Return a JSON array of matches with confidence scores:
[
  {
    "processo_numero": "IMP-XXX-MM-YYYY",
    "confidence": 0.95,
    "matching_criteria": ["invoice_number", "company_name"],
    "explanation": "Exact invoice number match and company name match"
  }
]

If no good matches are found, return an empty array.
`;

      try {
        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          temperature: 0,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        const aiResponse = message.content[0].type === 'text' ? message.content[0].text : '';
        
        // Extract JSON from response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const aiMatches = JSON.parse(jsonMatch[0]);
          
          // Map AI matches back to full process objects
          matches = aiMatches.map((match: any) => {
            const process = processesResult.list.find(
              p => p.numero_processo === match.processo_numero
            );
            return {
              ...process,
              ai_confidence: match.confidence,
              ai_matching_criteria: match.matching_criteria,
              ai_explanation: match.explanation
            };
          }).filter(Boolean);
        }
      } catch (error) {
        console.error('Error in AI matching:', error);
        // Fallback to fuzzy matching
        return NextResponse.json({
          success: true,
          matches: [],
          message: 'AI matching failed, please try fuzzy mode',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Sort matches by confidence/relevance
    matches.sort((a, b) => {
      if (a.ai_confidence && b.ai_confidence) {
        return b.ai_confidence - a.ai_confidence;
      }
      return 0;
    });

    return NextResponse.json({
      success: true,
      matches: matches.slice(0, 10), // Return top 10 matches
      totalProcesses: processesResult.list.length,
      searchMode
    });

  } catch (error) {
    console.error('Error in find-process API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET method to check if invoice already exists
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const invoiceNumber = searchParams.get('invoiceNumber');

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      );
    }

    const nocodb = getNocoDBService();
    
    // Check for exact match
    const result = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      where: `(invoiceNumber,eq,${invoiceNumber})`,
      limit: 1
    });

    const exists = result.list && result.list.length > 0;

    return NextResponse.json({
      exists,
      process: exists ? result.list[0] : null
    });

  } catch (error) {
    console.error('Error checking invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}