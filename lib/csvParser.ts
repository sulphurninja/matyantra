// Field mappings for Indian election CSV format
// Matches the mobile app's csvImport.ts field mappings
const fieldMappings: Record<string, string[]> = {
  // Assembly/Ward number
  serialNo: ['ac_no', 'slnoinpart', 'serial_no', 'serial number', 'sno'],
  partNo: ['part_no', 'part', 'part number', 'part_number', 'partno', 'ac_part_no'],
  sectionNo: ['section_no', 'section', 'section number', 'section_number', 'sectionno', 'ac_part_sno'],

  // House/Address
  houseNo: ['c_house_no', 'house_no', 'house number', 'house_number', 'house no'],

  // Name fields - NEW: Support for VOTER NAME_ENG column
  nameEnglish: ['voter name_eng', 'voter_name_eng', 'name_eng', 'name_english', 'english name'],
  fullName: ['voter name', 'voter_name', 'name'],

  // Name fields - English (separate first and last) - PRIORITY: exact matches first
  firstName: ['fm_name_en', 'first name', 'firstname', 'first_name', 'fm_nm_en', 'firstname_en', 'voter firstname'],
  lastName: ['lastname_en', 'last name', 'lastname', 'last_name', 'l_nm_en', 'voter lastname'],

  // Name fields - Regional (Marathi/Hindi)
  firstNameMarathi: ['fm_name_v1', 'firstname_marathi', 'first_name_marathi', 'fm_nm_v1'],
  lastNameMarathi: ['lastname_v1', 'lastname_marathi', 'last_name_marathi', 'l_nm_v1'],

  // Relation fields
  relation: ['rln_type', 'relation', 'relationship'],
  relativeFullName: ['relative name_eng', 'relative_name_eng'],
  relativeFirstName: ['rln_fm_nm_en', 'relative_first_name', 'relative first name'],
  relativeLastName: ['rln_l_nm_en', 'relative_last_name', 'relative last name'],
  relativeFirstNameMarathi: ['rln_fm_nm_v1', 'relative_first_name_marathi'],
  relativeLastNameMarathi: ['rln_l_nm_v1', 'relative_last_name_marathi'],

  // Voter ID
  voterId: ['epic_no', 'voter_id', 'epic number', 'voterid', 'epic no'],

  // Status
  status: ['status_type', 'status'],

  // Demographics
  gender: ['gender', 'लिंग', 'sex'],
  age: ['age', 'उम्र', 'वय', 'age_years'],
  mobileNo: ['mobile_no', 'mobile', 'मोबाइल', 'mobile number', 'mobile_number', 'phone', 'contact', 'mobile no'],

  // Address fields (optional)
  address: ['address', 'पता', 'पत्ता', 'full address', 'voter address'],
  area: ['area', 'क्षेत्र', 'ward', 'assembly'],
};

const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
};

const findFieldMapping = (header: string): string | null => {
  const normalized = normalizeHeader(header);

  // Try exact match first (most specific)
  for (const [field, variations] of Object.entries(fieldMappings)) {
    for (const variation of variations) {
      const normalizedVariation = normalizeHeader(variation);
      if (normalized === normalizedVariation) {
        return field;
      }
    }
  }

  // Then try contains match
  for (const [field, variations] of Object.entries(fieldMappings)) {
    for (const variation of variations) {
      const normalizedVariation = normalizeHeader(variation);
      if (normalized.includes(normalizedVariation) || normalizedVariation.includes(normalized)) {
        return field;
      }
    }
  }

  return null;
};

const parseAge = (value: any): number | undefined => {
  if (!value) return undefined;
  const num = parseInt(String(value).replace(/[^\d]/g, ''));
  return isNaN(num) ? undefined : num;
};

const parseGender = (value: any): string | undefined => {
  if (!value) return undefined;

  const str = String(value).trim().toUpperCase();

  // Keep raw values M/F as-is for consistency with CSV
  if (str === 'M' || str === 'MALE' || str.includes('पुरुष')) {
    return 'M';
  }
  if (str === 'F' || str === 'FEMALE' || str.includes('महिला') || str.includes('स्त्री')) {
    return 'F';
  }
  if (str === 'O' || str.includes('OTHER') || str.includes('इतर')) {
    return 'O';
  }

  return String(value).trim();
};

export interface ParsedVoter {
  userId: any;
  name: string;
  nameEnglish?: string;
  nameMarathi?: string;
  age?: number;
  gender?: string;
  address?: string;
  area?: string;
  booth?: string;
  partNo?: string;
  sectionNo?: string;
  serialNo?: number;
  houseNo?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  voterId?: string;
  relation?: string;
  status?: string;
  relativeName?: string;
}

// Helper to check if a value is valid (not empty, dash, comma, etc.)
const isValidValue = (val: any): boolean => {
  if (!val) return false;
  const str = String(val).trim();
  return str !== '' &&
    str !== '-' &&
    str !== '--' &&
    str !== '_' &&
    str !== ',' &&
    str !== 'null' &&
    str !== 'undefined' &&
    str.length > 0;
};

export function parseCSVRows(data: any[], userId: any): ParsedVoter[] {
  if (!data || data.length === 0) {
    return [];
  }

  // Get headers from first row
  const firstRow = data[0];
  const headers = Object.keys(firstRow);

  console.log('CSV Headers found:', headers);

  // Create header mapping
  const headerMapping: Record<string, string> = {};
  headers.forEach(header => {
    const field = findFieldMapping(header);
    if (field) {
      headerMapping[header] = field;
      console.log(`Mapped: "${header}" -> ${field}`);
    }
  });

  const voters: ParsedVoter[] = [];

  data.forEach((row: any, index: number) => {
    const voter: any = { userId };
    let firstName = '';
    let lastName = '';
    let firstNameMarathi = '';
    let lastNameMarathi = '';
    let relFirstName = '';
    let relLastName = '';

    // Map fields using header mapping
    Object.entries(row).forEach(([header, value]) => {
      if (!isValidValue(value)) return;

      const field = headerMapping[header];
      if (!field) return;

      const stringValue = String(value).trim();

      // Handle special fields
      if (field === 'age') {
        voter.age = parseAge(value);
      } else if (field === 'gender') {
        voter.gender = parseGender(value);
      } else if (field === 'serialNo') {
        const num = parseAge(value);
        if (num !== undefined) {
          voter.serialNo = num;
        }
      } else if (field === 'partNo') {
        const num = parseAge(value);
        voter.part = num !== undefined ? String(num) : stringValue;
      } else if (field === 'sectionNo') {
        const num = parseAge(value);
        voter.section = num !== undefined ? String(num) : stringValue;
      } else if (field === 'nameEnglish') {
        // Store English name directly
        voter.nameEnglish = stringValue;
      } else if (field === 'fullName') {
        // Store full name (Marathi) directly
        firstNameMarathi = stringValue;
      } else if (field === 'firstName') {
        firstName = stringValue;
      } else if (field === 'lastName') {
        lastName = stringValue;
      } else if (field === 'firstNameMarathi') {
        firstNameMarathi = stringValue;
      } else if (field === 'lastNameMarathi') {
        lastNameMarathi = stringValue;
      } else if (field === 'relativeFullName') {
        voter.relativeName = stringValue;
      } else if (field === 'relativeFirstName') {
        relFirstName = stringValue;
      } else if (field === 'relativeLastName') {
        relLastName = stringValue;
      } else if (field === 'mobileNo') {
        const cleaned = stringValue.replace(/[^\d]/g, '');
        if (cleaned.length >= 10) {
          voter.mobile = cleaned;
        }
      } else if (field === 'voterId') {
        voter.voterId = stringValue;
      } else if (field === 'relation') {
        voter.relation = stringValue;
      } else if (field === 'status') {
        voter.status = stringValue;
      } else if (field === 'houseNo') {
        voter.houseNo = stringValue;
      } else if (field === 'address') {
        voter.address = stringValue;
      } else if (field === 'area') {
        voter.area = stringValue;
      } else if (field === 'booth') {
        voter.booth = stringValue;
      } else if (field === 'email') {
        voter.email = stringValue;
      } else if (field === 'whatsapp') {
        const cleaned = stringValue.replace(/[^\d]/g, '');
        if (cleaned.length >= 10) {
          voter.whatsapp = cleaned;
        }
      } else {
        // For any other unmapped fields, try to set them directly
        // but only if they exist in our schema
        const allowedFields = ['address', 'area', 'booth', 'email', 'whatsapp'];
        if (allowedFields.includes(field)) {
          voter[field] = stringValue;
        }
      }
    });

    // Combine first and last names, filtering out empty values (exactly like mobile app)
    const fullName = [firstName, lastName].filter(n => n && n !== '-').join(' ').trim();
    voter.name = fullName || `Unknown_${index + 1}`;

    // Combine Marathi names
    const fullNameMarathi = [firstNameMarathi, lastNameMarathi].filter(n => n && n !== '-').join(' ').trim();
    if (fullNameMarathi) {
      voter.nameMarathi = fullNameMarathi;
    }

    // Combine relative names
    const relFullName = [relFirstName, relLastName].filter(n => n && n !== '-').join(' ').trim();
    if (relFullName) {
      voter.relativeName = relFullName;
    }

    // Clean up house number if it's just a dash
    if (voter.houseNo === '-' || voter.houseNo === '--') {
      delete voter.houseNo;
    }

    // Only add if has a valid name (not just the fallback)
    if (voter.name && voter.name !== `Unknown_${index + 1}`) {
      // Log first voter for debugging
      if (voters.length === 0) {
        console.log('Sample parsed voter:', JSON.stringify(voter, null, 2));
      }
      voters.push(voter);
    } else {
      console.log(`Skipping row ${index + 1}: Invalid name "${voter.name}"`);
    }
  });

  console.log(`Parsed ${voters.length} valid voters from ${data.length} rows`);
  if (voters.length > 0) {
    console.log('Sample voter fields:', Object.keys(voters[0]));
  }
  return voters;
}

