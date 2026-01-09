#!/usr/bin/env node

/**
 * PDF to CSV using OpenAI Vision API
 * 
 * This script converts voter list PDFs to CSV by using OpenAI's Vision API
 * to read the rendered text (bypassing font encoding issues).
 * 
 * Usage:
 *   node scripts/pdf-to-csv-openai.js <pdf_path> <from_page> <to_page>
 * 
 * Environment:
 *   OPENAI_API_KEY - Your OpenAI API key
 * 
 * Example:
 *   set OPENAI_API_KEY=sk-xxx
 *   node scripts/pdf-to-csv-openai.js "C:\Users\...\beedzp.pdf" 6 10
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Check for API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is required');
  console.log('\nSet it with:');
  console.log('  Windows: set OPENAI_API_KEY=sk-your-key-here');
  console.log('  Mac/Linux: export OPENAI_API_KEY=sk-your-key-here');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log(`
PDF to CSV using OpenAI Vision API
===================================

Usage:
  node scripts/pdf-to-csv-openai.js <pdf_path> <from_page> <to_page>

Example:
  node scripts/pdf-to-csv-openai.js "C:\\Users\\Desktop\\beedzp.pdf" 6 20

Make sure OPENAI_API_KEY is set in environment variables.
`);
  process.exit(1);
}

const pdfPath = args[0];
const fromPage = parseInt(args[1]) || 6;
const toPage = parseInt(args[2]) || 10;

if (!fs.existsSync(pdfPath)) {
  console.error(`Error: PDF file not found: ${pdfPath}`);
  process.exit(1);
}

// Prompt for GPT-4 Vision to extract voter data
const EXTRACTION_PROMPT = `You are extracting voter data from an Indian electoral roll PDF image (Marathi language).

Extract ALL voters visible in this image. For each voter, extract:
- serialNo: The serial number (like 1, 2, 3, or 29,094)
- voterId: The EPIC/Voter ID (like TQT6279368, MZB1824747)
- sectionCode: The section code (like 228/340/1, 230/8/378)
- fullName: Full name in Marathi (मतदाराचे पूर्ण नाव)
- relativeName: Father's or Husband's name (वडिलांचे नाव / पतीचे नाव)
- relation: "F" for Father, "H" for Husband
- houseNo: House number (घर क्रमांक) - use empty string if NA
- age: Age (वय)
- gender: "M" for Male (पुरुष/पु), "F" for Female (स्त्री/महिला)

Return ONLY a JSON array of voter objects, no other text. Example:
[
  {"serialNo": 1, "voterId": "TQT6279368", "sectionCode": "228/340/1", "fullName": "बांगर शिवाजी जनार्धन", "relativeName": "बांगर जनार्धन", "relation": "F", "houseNo": "", "age": "35", "gender": "M"},
  {"serialNo": 2, "voterId": "TQT6942320", "sectionCode": "228/340/2", "fullName": "भडके राणी रविलत", "relativeName": "भडके रविलत", "relation": "H", "houseNo": "", "age": "28", "gender": "F"}
]

Extract ALL voters visible. If you cannot read a field, use empty string. Return valid JSON array only.`;

async function convertPdfPageToBase64(pdfPath, pageNum) {
  try {
    // Dynamic import for pdf2pic
    const { fromPath } = await import('pdf2pic');
    
    const options = {
      density: 150,
      saveFilename: `page_${pageNum}`,
      savePath: path.join(process.cwd(), 'temp'),
      format: 'png',
      width: 1200,
      height: 1600,
    };
    
    // Create temp directory
    if (!fs.existsSync(options.savePath)) {
      fs.mkdirSync(options.savePath, { recursive: true });
    }
    
    const convert = fromPath(pdfPath, options);
    const result = await convert(pageNum, { responseType: 'base64' });
    
    return result.base64;
  } catch (error) {
    console.error(`Error converting page ${pageNum}:`, error.message);
    return null;
  }
}

async function extractVotersFromImage(base64Image, pageNum) {
  try {
    console.log(`  Sending page ${pageNum} to OpenAI Vision...`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });
    
    const content = response.choices[0]?.message?.content || '[]';
    
    // Parse JSON from response
    try {
      // Extract JSON array from response (in case there's extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const voters = JSON.parse(jsonMatch[0]);
        console.log(`  Found ${voters.length} voters on page ${pageNum}`);
        return voters;
      }
    } catch (parseError) {
      console.error(`  Error parsing response for page ${pageNum}:`, parseError.message);
      console.log('  Raw response:', content.substring(0, 500));
    }
    
    return [];
  } catch (error) {
    console.error(`  Error calling OpenAI for page ${pageNum}:`, error.message);
    return [];
  }
}

function votersToCSV(voters) {
  const headers = [
    'AC_NO', 'PART_NO', 'SECTION_NO', 'SLNOINPART', 'C_HOUSE_NO',
    'FM_NAME_V1', 'LASTNAME_V1', 'RLN_TYPE', 'RLN_FM_NM_V1', 'RLN_L_NM_V1',
    'EPIC_NO', 'STATUS_TYPE', 'GENDER', 'AGE'
  ];
  
  const rows = voters.map(voter => {
    // Parse section code
    const sectionParts = (voter.sectionCode || '').split('/');
    const acNo = sectionParts[0] || '';
    const partNo = sectionParts[1] || '';
    const sectionNo = sectionParts[2] || '';
    
    // Split names
    const nameParts = (voter.fullName || '').split(' ');
    const lastName = nameParts.pop() || '';
    const firstName = nameParts.join(' ');
    
    const relNameParts = (voter.relativeName || '').split(' ');
    const relLastName = relNameParts.pop() || '';
    const relFirstName = relNameParts.join(' ');
    
    return [
      acNo, partNo, sectionNo,
      voter.serialNo || '',
      voter.houseNo || '',
      firstName, lastName,
      voter.relation || 'F',
      relFirstName, relLastName,
      voter.voterId || '',
      'N',
      voter.gender || '',
      voter.age || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

async function main() {
  console.log('\n🔄 PDF to CSV using OpenAI Vision');
  console.log('==================================\n');
  console.log(`PDF: ${pdfPath}`);
  console.log(`Pages: ${fromPage} to ${toPage}`);
  console.log('');
  
  const allVoters = [];
  
  for (let pageNum = fromPage; pageNum <= toPage; pageNum++) {
    console.log(`\n📄 Processing page ${pageNum}...`);
    
    // Convert PDF page to image
    const base64Image = await convertPdfPageToBase64(pdfPath, pageNum);
    
    if (!base64Image) {
      console.log(`  Skipping page ${pageNum} (conversion failed)`);
      continue;
    }
    
    // Extract voters using OpenAI Vision
    const voters = await extractVotersFromImage(base64Image, pageNum);
    allVoters.push(...voters);
    
    console.log(`  Total voters so far: ${allVoters.length}`);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Clean up temp directory
  const tempDir = path.join(process.cwd(), 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  if (allVoters.length === 0) {
    console.log('\n❌ No voters found!');
    process.exit(1);
  }
  
  // Generate CSV
  const csv = votersToCSV(allVoters);
  
  // Save to file
  const outputPath = path.join(
    path.dirname(pdfPath),
    `voters_${path.basename(pdfPath, '.pdf')}_pages_${fromPage}-${toPage}.csv`
  );
  
  fs.writeFileSync(outputPath, csv, 'utf-8');
  
  console.log(`\n✅ Success!`);
  console.log(`   Total voters extracted: ${allVoters.length}`);
  console.log(`   Output file: ${outputPath}`);
  
  // Show sample
  console.log('\n📋 Sample (first 3 voters):');
  allVoters.slice(0, 3).forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.fullName} (${v.voterId}) - Age: ${v.age}, Gender: ${v.gender}`);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});




