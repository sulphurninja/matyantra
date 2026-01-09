import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Marathi to English number conversion
const marathiToEnglishNum: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

// Convert Marathi numbers to English
function convertMarathiNumbers(text: string): string {
  let result = text;
  for (const [marathi, english] of Object.entries(marathiToEnglishNum)) {
    result = result.replace(new RegExp(marathi, 'g'), english);
  }
  return result;
}

// Parse gender from Marathi
function parseGenderMarathi(text: string): string {
  const cleaned = text.trim().toLowerCase();
  if (cleaned.includes('पु') || cleaned.includes('पुरुष') || cleaned === 'm') {
    return 'M';
  }
  if (cleaned.includes('स्त्री') || cleaned.includes('महिला') || cleaned === 'f' || cleaned === 'स्री' || cleaned === 'स्रो') {
    return 'F';
  }
  return '';
}

// Parse section code (228/340/1 format)
function parseSectionCode(code: string): { acNo: string; partNo: string; sectionNo: string } {
  const parts = code.split('/').map(p => p.trim());
  return {
    acNo: parts[0] || '',
    partNo: parts[1] || '',
    sectionNo: parts[2] || '',
  };
}

// Clean text
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[:\s]+$/, '')
    .replace(/^[:\s]+/, '')
    .replace(/Photo\s*Available/gi, '')
    .replace(/फोटो\s*उपलब्ध/gi, '')
    .trim();
}

// Parse PASTED text (copy-pasted from PDF viewer) - this works correctly!
function parsePastedText(text: string): ParsedVoter[] {
  const voters: ParsedVoter[] = [];
  
  // Clean and convert Marathi numbers
  let cleanedText = convertMarathiNumbers(text);
  cleanedText = cleanedText.replace(/Photo\s*Available/gi, '').replace(/फोटो\s*उपलब्ध/gi, '');
  
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l);
  
  let currentVoter: Partial<ParsedVoter> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip standalone labels
    if (line === 'नांव' || line === 'नाव') {
      continue;
    }
    
    // Check for header line (serial, voter ID, section code)
    // Pattern: "29,094       MZB1824747    230/8/378" or "29094 MZB1824747 230/8/378"
    const headerMatch = line.match(/^(\d{1,3}(?:,\d{3})*|\d{4,6})\s+([A-Z0-9\/]+)\s+(\d+\/\d+\/\d+)/i);
    
    if (headerMatch) {
      // Save previous voter if exists
      if (currentVoter && (currentVoter.fullName || currentVoter.voterId)) {
        voters.push(currentVoter as ParsedVoter);
      }
      
      // Start new voter
      currentVoter = {
        serialNo: parseInt(headerMatch[1].replace(/,/g, ''), 10),
        voterId: headerMatch[2].trim(),
        sectionCode: headerMatch[3].trim(),
        fullName: '',
        relativeName: '',
        relation: 'F',
        houseNo: '',
        age: '',
        gender: '',
      };
      continue;
    }
    
    if (!currentVoter) continue;
    
    // Check for full name (मतदाराचे पूर्ण नाव or मतदाराचे पूर्ण:)
    const nameMatch = line.match(/मतदाराचे\s*पूर्ण\s*(?:नाव)?[:\s]*(.+)?/i);
    if (nameMatch) {
      if (nameMatch[1]) {
        currentVoter.fullName = cleanText(nameMatch[1]);
      }
      continue;
    }
    
    // Check for relative name (father)
    const fatherMatch = line.match(/वडिलांचे\s*नाव\s*[:\s]*(.+)?/i);
    if (fatherMatch) {
      if (fatherMatch[1]) {
        currentVoter.relativeName = cleanText(fatherMatch[1]);
      }
      currentVoter.relation = 'F';
      continue;
    }
    
    // Check for relative name (husband)
    const husbandMatch = line.match(/पतीचे\s*नाव\s*[:\s]*(.+)?/i);
    if (husbandMatch) {
      if (husbandMatch[1]) {
        currentVoter.relativeName = cleanText(husbandMatch[1]);
      }
      currentVoter.relation = 'H';
      continue;
    }
    
    // Check for house number
    const houseMatch = line.match(/घर\s*क्रमांक\s*[:\s]*(.+)?/i);
    if (houseMatch && houseMatch[1]) {
      const houseNo = cleanText(houseMatch[1]);
      if (houseNo.toUpperCase() !== 'NA' && houseNo !== '-') {
        currentVoter.houseNo = houseNo;
      }
      continue;
    }
    
    // Check for age and gender on same line
    const ageGenderMatch = line.match(/वय\s*[:\s]*(\d+).*?लिंग\s*[:\s]*(\S+)/i);
    if (ageGenderMatch) {
      currentVoter.age = ageGenderMatch[1];
      currentVoter.gender = parseGenderMarathi(ageGenderMatch[2]);
      continue;
    }
    
    // Check for just age
    const ageMatch = line.match(/वय\s*[:\s]*(\d+)/i);
    if (ageMatch) {
      currentVoter.age = ageMatch[1];
    }
    
    // Check for just gender
    const genderMatch = line.match(/लिंग\s*[:\s]*(\S+)/i);
    if (genderMatch) {
      currentVoter.gender = parseGenderMarathi(genderMatch[1]);
    }
  }
  
  // Don't forget the last voter
  if (currentVoter && (currentVoter.fullName || currentVoter.voterId)) {
    voters.push(currentVoter as ParsedVoter);
  }
  
  return voters;
}

interface ParsedVoter {
  serialNo: number | string;
  voterId: string;
  sectionCode: string;
  fullName: string;
  relativeName: string;
  relation: string;
  houseNo: string;
  age: string;
  gender: string;
}

// Parse the PDF text into voter records - handles the block-based extraction format
function parsePDFText(text: string): ParsedVoter[] {
  const voters: ParsedVoter[] = [];
  const seenVoterIds = new Set<string>(); // To deduplicate (PDF has duplicate columns)
  
  // Clean and convert numbers
  let cleanedText = convertMarathiNumbers(text);
  
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l);
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Look for voter ID + section code pattern: "TQT6279368   228/340/1"
    const voterIdMatch = line.match(/^([A-Z]{2,3}\d{6,10}|[A-Z]+\/\d+\/\d+)\s+(\d+\/\d+\/\d+)$/i) ||
                         line.match(/^([A-Z0-9]{10,15})\s+(\d+\/\d+\/\d+)$/i);
    
    if (voterIdMatch) {
      const voterId = voterIdMatch[1];
      const sectionCode = voterIdMatch[2];
      
      // Skip if we've already seen this voter (duplicate from 2-column layout)
      if (seenVoterIds.has(voterId)) {
        i++;
        continue;
      }
      seenVoterIds.add(voterId);
      
      // Now look backwards to find the voter data
      // The pattern before voter ID line is:
      // : Full Name (line with : prefix)
      // Relative Name
      // Then before that: Age value, and Serial number
      
      let fullName = '';
      let relativeName = '';
      let relation = 'F';
      let age = '';
      let serialNo = 0;
      let houseNo = '';
      let gender = '';
      
      // Look backwards for the data
      for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
        const prevLine = lines[j];
        
        // Full name starts with ":"
        if (prevLine.startsWith(':') && !fullName) {
          fullName = prevLine.substring(1).trim();
          // The line before this should be the relative name
          if (j > 0 && !lines[j-1].startsWith(':') && !lines[j-1].match(/^\d+$/) && 
              !lines[j-1].includes('नभव') && !lines[j-1].includes('कमभदक')) {
            // Actually, relative name comes AFTER full name in this format
          }
        }
        
        // Check for relation type labels
        if (prevLine.includes('वनडलभदरच') || prevLine.includes('वडिलांचे')) {
          relation = 'F';
        }
        if (prevLine.includes('पतदरच') || prevLine.includes('पतीचे')) {
          relation = 'H';
        }
      }
      
      // Look forward for gender (पम or सद) and house number
      for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
        const nextLine = lines[j];
        
        // Gender
        if (nextLine === 'पम' || nextLine === 'पु') {
          gender = 'M';
        } else if (nextLine === 'सद' || nextLine === 'स्त्री' || nextLine === 'स्री') {
          gender = 'F';
        }
        
        // House number (NA or a number)
        if (nextLine === 'NA') {
          houseNo = '';
        } else if (nextLine.match(/^\d+$/) && !gender) {
          // Could be house number if it's after ललग
        }
        
        // Stop at next voter block
        if (nextLine.match(/^[A-Z]{2,3}\d{6,10}\s+\d+\/\d+\/\d+/i)) {
          break;
        }
      }
      
      // Look backwards more carefully for name and relative name
      // Pattern: the line right before voter ID that's not a label should be relative name
      // And the line starting with : is the full name
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        const prevLine = lines[j];
        
        if (prevLine.startsWith(':') && prevLine.length > 2) {
          fullName = prevLine.substring(1).trim();
        } else if (fullName && !relativeName && 
                   !prevLine.includes('नभव') && !prevLine.includes('कमभदक') &&
                   !prevLine.includes('पपणर') && !prevLine.includes('वय') &&
                   !prevLine.match(/^:+$/) && !prevLine.match(/^\d+$/) &&
                   prevLine.length > 2 && !prevLine.includes('Photo')) {
          relativeName = prevLine.trim();
          break;
        }
      }
      
      // Find serial number (standalone number before all the labels)
      for (let j = i - 1; j >= Math.max(0, i - 25); j--) {
        const prevLine = lines[j];
        if (prevLine.match(/^\d{1,5}$/) && parseInt(prevLine) < 50000) {
          serialNo = parseInt(prevLine);
          break;
        }
      }
      
      // Find age (number between 18-120 that appears after वय)
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        const prevLine = lines[j];
        const ageNum = parseInt(prevLine);
        if (prevLine.match(/^\d{2,3}$/) && ageNum >= 18 && ageNum <= 120) {
          age = prevLine;
          break;
        }
      }
      
      if (fullName || voterId) {
        voters.push({
          serialNo,
          voterId,
          sectionCode,
          fullName: fullName || '',
          relativeName: relativeName || '',
          relation,
          houseNo,
          age,
          gender,
        });
      }
    }
    
    i++;
  }
  
  return voters;
}

// Convert voters to CSV
function votersToCSV(voters: ParsedVoter[]): string {
  const headers = [
    'AC_NO',
    'PART_NO',
    'SECTION_NO',
    'SLNOINPART',
    'C_HOUSE_NO',
    'FM_NAME_V1',
    'LASTNAME_V1',
    'RLN_TYPE',
    'RLN_FM_NM_V1',
    'RLN_L_NM_V1',
    'EPIC_NO',
    'STATUS_TYPE',
    'GENDER',
    'AGE',
  ];
  
  const rows = voters.map(voter => {
    const sectionInfo = parseSectionCode(voter.sectionCode || '');
    
    // Split name into first and last
    const nameParts = (voter.fullName || '').split(' ');
    const lastName = nameParts.pop() || '';
    const firstName = nameParts.join(' ');
    
    // Split relative name
    const relNameParts = (voter.relativeName || '').split(' ');
    const relLastName = relNameParts.pop() || '';
    const relFirstName = relNameParts.join(' ');
    
    return [
      sectionInfo.acNo,
      sectionInfo.partNo,
      sectionInfo.sectionNo,
      voter.serialNo || '',
      voter.houseNo || '',
      firstName,
      lastName,
      voter.relation || 'F',
      relFirstName,
      relLastName,
      voter.voterId || '',
      'N',
      voter.gender || '',
      voter.age || '',
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

// Verify admin auth
async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;
  
  if (!token) return false;
  
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return true;
  } catch {
    return false;
  }
}

// Extract text from PDF using unpdf with page range filtering
async function extractPDFText(buffer: Buffer, fromPage: number = 1, toPage: number = 999): Promise<{ text: string; totalPages: number }> {
  try {
    console.log('extractPDFText - Importing unpdf...');
    const { getDocumentProxy } = await import('unpdf');
    
    console.log('extractPDFText - Getting document proxy...');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const totalPages = pdf.numPages;
    console.log(`extractPDFText - PDF has ${totalPages} pages`);
    
    // Calculate actual page range
    const startPage = Math.max(1, fromPage);
    const endPage = Math.min(totalPages, toPage);
    console.log(`extractPDFText - Extracting pages ${startPage} to ${endPage}`);
    
    // Extract text page by page for the selected range only
    let fullText = '';
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      console.log(`extractPDFText - Processing page ${pageNum}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group text items by their Y position to preserve line structure
      let lastY: number | null = null;
      let pageText = '';
      
      for (const item of textContent.items) {
        const textItem = item as { str?: string; transform?: number[] };
        if (!textItem.str) continue;
        
        // Get Y position from transform matrix (index 5)
        const y = textItem.transform?.[5] ?? 0;
        
        // If Y position changed significantly, it's a new line
        if (lastY !== null && Math.abs(lastY - y) > 5) {
          pageText += '\n';
        } else if (lastY !== null) {
          pageText += ' ';
        }
        
        pageText += textItem.str;
        lastY = y;
      }
      
      fullText += pageText + '\n\n--- PAGE BREAK ---\n\n';
    }
    
    console.log(`extractPDFText - Done! Extracted ${fullText.length} characters`);
    
    return {
      text: fullText,
      totalPages,
    };
  } catch (error) {
    console.error('unpdf extraction error:', error);
    throw new Error('Failed to extract text from PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Simple PDF page count from buffer
function countPDFPages(buffer: Buffer): number {
  const content = buffer.toString('latin1');
  const pageMatches = content.match(/\/Type\s*\/Page[^s]/g);
  return pageMatches ? pageMatches.length : 0;
}

export async function POST(request: NextRequest) {
  console.log('POST /api/admin/pdf-to-csv - Starting...');
  
  if (!await verifyAuth()) {
    console.log('POST - Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Handle pasted text (JSON body)
    if (contentType.includes('application/json')) {
      console.log('POST - Processing pasted text...');
      const body = await request.json();
      const pastedText = body.text;
      
      if (!pastedText || !pastedText.trim()) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }
      
      console.log(`POST - Pasted text length: ${pastedText.length} chars`);
      
      // Parse using the working parser for copy-pasted text
      const voters = parsePastedText(pastedText);
      console.log(`POST - Found ${voters.length} voters from pasted text`);
      
      if (voters.length === 0) {
        return NextResponse.json({
          error: 'No voters found. Make sure the text includes voter entries with format like: "29,094 MZB1824747 230/8/378"',
          textSample: pastedText.substring(0, 500),
        }, { status: 400 });
      }
      
      const csv = votersToCSV(voters);
      
      return NextResponse.json({
        success: true,
        votersFound: voters.length,
        csv,
        sample: voters.slice(0, 3),
      });
    }
    
    // Handle file upload (FormData)
    console.log('POST - Reading form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fromPage = parseInt(formData.get('fromPage') as string) || 1;
    const toPage = parseInt(formData.get('toPage') as string) || 999;
    
    console.log(`POST - File: ${file?.name}, Pages: ${fromPage}-${toPage}`);
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    console.log('POST - Converting to buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`POST - Buffer size: ${buffer.length} bytes`);
    
    // Extract text from PDF (with page range filtering)
    console.log('POST - Starting PDF extraction...');
    const startTime = Date.now();
    const { text: extractedText, totalPages } = await extractPDFText(buffer, fromPage, toPage);
    console.log(`POST - Extraction complete in ${Date.now() - startTime}ms, got ${extractedText.length} chars`);
    
    // Log a sample of extracted text for debugging
    console.log('POST - Sample of extracted text:');
    console.log(extractedText.substring(0, 2000));
    console.log('--- END SAMPLE ---');
    
    // Parse the text to get voters
    const voters = parsePDFText(extractedText);
    console.log(`POST - Found ${voters.length} voters`);
    
    if (voters.length === 0) {
      return NextResponse.json({
        error: 'No voters found in the PDF. Make sure it\'s in the correct Marathi voter list format.',
        totalPages,
        extractedSample: extractedText.substring(0, 3000),
      }, { status: 400 });
    }
    
    // Convert to CSV
    const csv = votersToCSV(voters);
    
    return NextResponse.json({
      success: true,
      totalPages,
      pagesProcessed: `${fromPage} to ${Math.min(toPage, totalPages)}`,
      votersFound: voters.length,
      csv,
      sample: voters.slice(0, 3),
    });
    
  } catch (error) {
    console.error('PDF processing error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process PDF',
    }, { status: 500 });
  }
}

// PUT endpoint to get PDF info (just page count, fast)
export async function PUT(request: NextRequest) {
  if (!await verifyAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Try to get page count using unpdf (fast, doesn't extract text)
    try {
      const { getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      
      return NextResponse.json({
        totalPages: pdf.numPages,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch {
      // Fallback: estimate from binary
      const estimatedPages = countPDFPages(buffer);
      return NextResponse.json({
        totalPages: estimatedPages || 50,
        fileName: file.name,
        fileSize: file.size,
      });
    }
    
  } catch (error) {
    console.error('PDF info error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to read PDF info',
    }, { status: 500 });
  }
}
