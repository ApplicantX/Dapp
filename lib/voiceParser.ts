import { MetalType, ParsedCustomerVoice, ParsedLoanVoice, BulkCustomerLoanRecord } from './types';

// Helper to convert spoken number words into integers
export function parseSpokenNumber(text: string): number | null {
  const clean = text.toLowerCase().replace(/,/g, '').trim();

  // Direct digits like "50000", "50000.50", "142", "2026"
  const directMatch = clean.match(/(\d+(\.\d+)?)/);
  if (directMatch) {
    let num = parseFloat(directMatch[1]);
    if (clean.includes('lakh') || clean.includes('lac') || clean.includes('લાખ') || clean.includes('લાખ')) {
      num *= 100000;
    } else if (clean.includes('thousand') || clean.includes('k') || clean.includes('હજાર') || clean.includes('हज़ार')) {
      num *= 1000;
    }
    return Math.round(num * 100) / 100;
  }

  // Word-based numbers
  const wordsMap: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'lac': 100000,
    'પચાસ': 50, 'સાઠ': 60, 'સિત્તેર': 70, 'એંસી': 80, 'નેવું': 90, 'સો': 100, 'હજાર': 1000, 'લાખ': 100000,
    'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90, 'सौ': 100, 'हज़ार': 1000, 'लाख': 100000,
  };

  for (const [w, val] of Object.entries(wordsMap)) {
    if (clean.includes(w)) {
      if (clean.includes('thousand') || clean.includes('હજાર') || clean.includes('हज़ार')) {
        return val < 1000 ? val * 1000 : val;
      }
      if (clean.includes('lakh') || clean.includes('લાખ') || clean.includes('લાખ')) {
        return val < 100000 ? val * 100000 : val;
      }
      return val;
    }
  }

  return null;
}

// 1. Single Customer Voice Parsing
export function parseSingleCustomerVoice(rawText: string, knownVillages: string[] = []): ParsedCustomerVoice {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  let name = '';
  let village = '';
  let diary = 'Diary 2026';
  let pageNumber = '';
  let mobile: string | undefined = undefined;

  // Extract Mobile number
  const mobileMatch = text.match(/(?:\+91|0)?[6-9]\d{9}/);
  if (mobileMatch) {
    mobile = mobileMatch[0];
  }

  // Extract Diary: e.g. "Diary 2026", "Diary 2025", "Diary Red 1", "ચોપડો 2026"
  const diaryMatch = text.match(/(?:diary|ચોપડો|ડાયરી|book)\s*([A-Za-z0-9\-_]+(?:\s+[A-Za-z0-9]+)?)/i);
  if (diaryMatch) {
    const dVal = diaryMatch[1].trim();
    diary = dVal.toLowerCase().startsWith('diary') ? dVal : `Diary ${dVal}`;
  } else {
    const yearMatch = text.match(/\b(202[4-9])\b/);
    if (yearMatch) {
      diary = `Diary ${yearMatch[1]}`;
    }
  }

  // Extract Page Number: e.g. "Page 142", "Page number 142", "પાના નંબર 142", "પાનું 142"
  const pageMatch = text.match(/(?:page|page number|p\.|પાના નંબર|પાનું|પેજ|પાનુ|पृष्ठ|पन्ना)\s*(?:no\.?|number)?\s*(\d+)/i);
  if (pageMatch) {
    pageNumber = pageMatch[1];
  } else {
    const numMatches = text.match(/\b\d{1,4}\b/g);
    if (numMatches) {
      const candidates = numMatches.filter((n) => !diary.includes(n) && (!mobile || !mobile.includes(n)));
      if (candidates.length > 0) {
        pageNumber = candidates[candidates.length - 1];
      }
    }
  }

  // Extract Village
  const villagePatterns = [
    /(?:from|resident of|village|at|ગામ|રહેવાસી|વાળા|ગાંવ)\s+([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+(?:\s+[A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)?)/i,
    /([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)\s+(?:village|gaam|ગામ|ગાંવ)/i,
  ];

  for (const pat of villagePatterns) {
    const vMatch = text.match(pat);
    if (vMatch && vMatch[1]) {
      const candidate = vMatch[1].trim();
      const ignoredWords = ['diary', 'page', 'mobile', 'phone', 'customer', 'new', 'add', 'no', 'number', 'loan', 'rupees', 'gold', 'silver'];
      if (!ignoredWords.includes(candidate.toLowerCase())) {
        village = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        break;
      }
    }
  }

  if (!village && knownVillages.length > 0) {
    for (const v of knownVillages) {
      if (lower.includes(v.toLowerCase())) {
        village = v;
        break;
      }
    }
  }

  // Extract Customer Name
  let nameText = text;
  if (village) {
    const vIdx = nameText.toLowerCase().indexOf(village.toLowerCase());
    if (vIdx > 0) {
      nameText = nameText.substring(0, vIdx);
    }
  }
  const markers = ['from', 'village', 'diary', 'page', 'mobile', 'ગામ', 'ચોપડો', 'પાના', 'ડાયરી', 'loan', 'rupees', 'રૂપિયા', 'gold', 'silver', 'સોનું', 'ચાંદી'];
  for (const m of markers) {
    const mIdx = nameText.toLowerCase().indexOf(m);
    if (mIdx > 0) {
      nameText = nameText.substring(0, mIdx);
    }
  }

  name = nameText
    .replace(/(?:customer|new customer|add customer|name is|શ્રી|નામ|\b\d+[\.\)]|\bno\.?\s*\d+)/gi, '')
    .replace(/[^A-Za-z\u0A80-\u0AFF\u0900-\u097F\s]/g, '')
    .trim();

  if (name) {
    name = name
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return {
    name: name || 'Customer',
    village: village || 'Dahod',
    diary: diary || 'Diary 2026',
    pageNumber: pageNumber || '1',
    mobile,
    rawText,
  };
}

// 2. Bulk Customer Voice Parsing
export function parseBulkCustomersVoice(rawText: string, knownVillages: string[] = []): ParsedCustomerVoice[] {
  const text = rawText.trim();

  let segments = text.split(/(?:\b\d+[\.\)]|\bCustomer\s*\d+:?|\bનંબર\s*\d+:?|\bnumber\s*\d+:?|\bnext\s*customer:?|\band\s+next:?)/i);

  if (segments.length <= 1) {
    const newline = String.fromCharCode(10);
    segments = text.split(new RegExp('(?:;|' + newline + '|\band\s+then\b|\band\s+also\b)', 'i'));
  }

  const cleanedSegments = segments
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (cleanedSegments.length === 0) {
    return [parseSingleCustomerVoice(rawText, knownVillages)];
  }

  return cleanedSegments.map((seg) => parseSingleCustomerVoice(seg, knownVillages));
}

// 3. High-Throughput Bulk Voice to Excel Parser
export function parseBulkVoiceToExcelRecords(
  rawText: string,
  knownVillages: string[] = [],
  knownCategories: string[] = []
): BulkCustomerLoanRecord[] {
  if (!rawText.trim()) return [];

  const text = rawText.trim();

  // Split by numbered items, commas between full names, semicolons, newlines, or "next"
  const splitPattern = /(?:\b\d+[\.\)]|\bCustomer\s*\d+:?|\bનંબર\s*\d+:?|\bnumber\s*\d+:?|\bnext\s*customer:?|\bnext:|\band\s+next:?|\bપછી:?|\bબીજો\s*ગ્રાહક:?)/i;
  
  let rawSegments = text.split(splitPattern);

  if (rawSegments.length <= 1) {
    const newline = String.fromCharCode(10);
    // Also support splitting by comma or period if multiple names exist
    rawSegments = text.split(new RegExp('(?:;|' + newline + '|\band\s+then\b|,)', 'i'));
  }

  const validSegments = rawSegments
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  if (validSegments.length === 0) {
    validSegments.push(text);
  }

  const records: BulkCustomerLoanRecord[] = [];

  const categoryKeywords: Record<string, string> = {
    'kandora': 'Kandora',
    'kandoro': 'Kandora',
    'કંદોરો': 'Kandora',
    'કંદોરા': 'Kandora',
    'kada': 'Kada',
    'kadas': 'Kada',
    'કડા': 'Kada',
    'કડો': 'Kada',
    'chain': 'Chain',
    'ચેઇન': 'Chain',
    'દોરો': 'Chain',
    'ring': 'Ring',
    'viti': 'Ring',
    'વીંટી': 'Ring',
    'necklace': 'Necklace',
    'haar': 'Necklace',
    'હાર': 'Necklace',
    'mangalsutra': 'Mangalsutra',
    'મંગળસૂત્ર': 'Mangalsutra',
    'earring': 'Earrings',
    'earrings': 'Earrings',
    'jhumki': 'Earrings',
    'butti': 'Earrings',
    'ઝૂમખી': 'Earrings',
    'bangle': 'Bangle',
    'bangles': 'Bangle',
    'બંગડી': 'Bangle',
    'anklet': 'Anklet / Payal',
    'payal': 'Anklet / Payal',
    'toda': 'Anklet / Payal',
    'ઝાઝર': 'Anklet / Payal',
    'utensils': 'Utensils',
    'thali': 'Utensils',
    'વાસણ': 'Utensils',
    'coin': 'Coin / Bar',
    'lagdi': 'Coin / Bar',
    'સિક્કો': 'Coin / Bar',
  };

  validSegments.forEach((seg, index) => {
    const sLower = seg.toLowerCase();

    // 1. Customer Details
    const cust = parseSingleCustomerVoice(seg, knownVillages);

    // 2. Loan Amount
    let loanAmount = 0;
    const amountMatches = [
      /(?:loan amount|total loan|loan of|amount of|loan|રૂપિયા|રકમ)\s*(?:is|of|for)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|thousand|k|lac|rupees|rs|રૂપિયા)?/i,
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|thousand|k|rupees|rs|રૂપિયા)\s*(?:loan|total|amount)/i,
      /(?:fifty|forty|thirty|twenty|ten|sixty|seventy|eighty|ninety|hundred|thousand|lakh|પચાસ|સાઠ|લાખ|હજાર)\s*(?:thousand|lakh|rupees|rs|રૂપિયા)?/i,
    ];

    for (const pat of amountMatches) {
      const m = seg.match(pat);
      if (m) {
        const parsed = parseSpokenNumber(m[0]);
        if (parsed && parsed >= 500) {
          loanAmount = parsed;
          break;
        }
      }
    }

    if (!loanAmount) {
      const nums = seg.match(/\b\d{4,7}\b/g);
      if (nums && nums.length > 0) {
        const cand = nums.find((n) => (!cust.mobile || !cust.mobile.includes(n)) && n !== cust.pageNumber && !cust.diary.includes(n));
        if (cand) loanAmount = parseInt(cand, 10);
      }
    }
    if (!loanAmount) loanAmount = 50000;

    // 3. Ornament & Metal
    const wtMatch = seg.match(/(\d+(\.\d+)?)\s*(gram|grams|gm|gms|g|tola|tole|ગ્રામ|તોલા|gram|tola)/i);
    let weight = 0;
    if (wtMatch) {
      weight = parseFloat(wtMatch[1]);
      if (wtMatch[3].toLowerCase().includes('tola') || wtMatch[3].includes('તોલા')) {
        weight = weight * 11.664;
      }
      weight = Math.round(weight * 10) / 10;
    }

    let metal: MetalType = 'Silver';
    if (sLower.includes('gold') || sLower.includes('sona') || sLower.includes('સોનું') || sLower.includes('સોના') || sLower.includes('સોનુ')) {
      metal = 'Gold';
    } else if (sLower.includes('silver') || sLower.includes('chandi') || sLower.includes('ચાંદી')) {
      metal = 'Silver';
    } else {
      metal = weight >= 50 ? 'Silver' : 'Gold';
    }

    let category = 'Kandora';
    for (const [kw, catName] of Object.entries(categoryKeywords)) {
      if (sLower.includes(kw)) {
        category = catName;
        break;
      }
    }

    let quantity = 1;
    if (sLower.includes('pair') || sLower.includes('બે') || sLower.includes('2')) {
      quantity = 2;
    }

    if (!weight) {
      weight = metal === 'Silver' ? (category === 'Kandora' ? 500 : 200) : (category === 'Chain' ? 20 : 10);
    }

    let status: 'VALID' | 'WARNING' = 'VALID';
    let warningMessage = '';

    if (!cust.name || cust.name === 'Customer') {
      status = 'WARNING';
      warningMessage = 'Check name';
    }

    records.push({
      id: `bulk-${Date.now()}-${index + 1}-${Math.random().toString(36).substring(2, 5)}`,
      name: cust.name || `Customer ${index + 1}`,
      village: cust.village || 'Dahod',
      diary: cust.diary || 'Diary 2026',
      pageNumber: cust.pageNumber || `${index + 1}`,
      mobile: cust.mobile,
      loanAmount,
      metal,
      category,
      weight,
      quantity,
      rawSpeech: seg,
      status,
      warningMessage: warningMessage || undefined,
    });
  });

  return records;
}

// 4. Loan Voice Parsing
export function parseLoanVoice(rawText: string, knownCategories: string[] = []): ParsedLoanVoice {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  let loanAmount = 0;
  const amountMatches = [
    /(?:loan amount|total loan|loan of|amount of|total|રૂપિયા|રકમ|loan)\s*(?:is|of|for)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|thousand|k|lac|rupees|rs|રૂપિયા)?/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|thousand|k|rupees|rs|રૂપિયા)\s*(?:loan|total|amount)/i,
    /(?:fifty|forty|thirty|twenty|ten|sixty|seventy|eighty|ninety|hundred|thousand|lakh|પચાસ|સાઠ|લાખ|હજાર)\s*(?:thousand|lakh|rupees|rs|રૂપિયા)?/i,
  ];

  for (const pat of amountMatches) {
    const m = text.match(pat);
    if (m) {
      const parsed = parseSpokenNumber(m[0]);
      if (parsed && parsed >= 500) {
        loanAmount = parsed;
        break;
      }
    }
  }

  if (!loanAmount) {
    const nums = text.match(/\b\d{4,7}\b/g);
    if (nums && nums.length > 0) {
      loanAmount = parseInt(nums[0], 10);
    } else {
      loanAmount = 50000;
    }
  }

  let loanDate = new Date().toISOString().split('T')[0];
  const dateMatch = text.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const monthStr = dateMatch[2].toLowerCase();
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = months.findIndex((m) => monthStr.startsWith(m));
    if (monthIndex >= 0) {
      const mNum = (monthIndex + 1).toString().padStart(2, '0');
      const year = new Date().getFullYear();
      loanDate = `${year}-${mNum}-${day}`;
    }
  }

  const ornamentSegments = text.split(/(?:\band\b|\bplus\b|\balso\b|,|અને|તથા|સાથે|और)/i);
  const ornaments: { metal: MetalType; category: string; weight: number; quantity: number }[] = [];

  const categoryKeywords: Record<string, string> = {
    'kandora': 'Kandora',
    'kandoro': 'Kandora',
    'કંદોરો': 'Kandora',
    'કંદોરા': 'Kandora',
    'kada': 'Kada',
    'kadas': 'Kada',
    'કડા': 'Kada',
    'chain': 'Chain',
    'ચેઇન': 'Chain',
    'દોરો': 'Chain',
    'ring': 'Ring',
    'viti': 'Ring',
    'વીંટી': 'Ring',
    'necklace': 'Necklace',
    'haar': 'Necklace',
    'હાર': 'Necklace',
    'mangalsutra': 'Mangalsutra',
    'મંગળસૂત્ર': 'Mangalsutra',
    'earring': 'Earrings',
    'jhumki': 'Earrings',
    'ઝૂમખી': 'Earrings',
    'bangle': 'Bangle',
    'બંગડી': 'Bangle',
    'anklet': 'Anklet / Payal',
    'payal': 'Anklet / Payal',
    'ઝાઝર': 'Anklet / Payal',
    'utensils': 'Utensils',
    'thali': 'Utensils',
    'વાસણ': 'Utensils',
    'coin': 'Coin / Bar',
    'સિક્કો': 'Coin / Bar',
  };

  for (const seg of ornamentSegments) {
    const sLower = seg.toLowerCase();

    const wtMatch = seg.match(/(\d+(\.\d+)?)\s*(gram|grams|gm|gms|g|tola|tole|ગ્રામ|તોલા)/i);
    let weight = 0;
    if (wtMatch) {
      weight = parseFloat(wtMatch[1]);
      if (wtMatch[3].toLowerCase().includes('tola') || wtMatch[3].includes('તોલા')) {
        weight = weight * 11.664;
      }
      weight = Math.round(weight * 10) / 10;
    }

    let metal: MetalType = 'Silver';
    if (sLower.includes('gold') || sLower.includes('sona') || sLower.includes('સોનું') || sLower.includes('સોના')) {
      metal = 'Gold';
    } else if (sLower.includes('silver') || sLower.includes('chandi') || sLower.includes('ચાંદી')) {
      metal = 'Silver';
    } else {
      metal = weight >= 50 ? 'Silver' : 'Gold';
    }

    let category = 'Other';
    for (const [kw, catName] of Object.entries(categoryKeywords)) {
      if (sLower.includes(kw)) {
        category = catName;
        break;
      }
    }

    let quantity = 1;
    if (sLower.includes('pair') || sLower.includes('બે') || sLower.includes('2')) {
      quantity = 2;
    }

    if (weight > 0 || category !== 'Other') {
      ornaments.push({
        metal,
        category: category !== 'Other' ? category : (metal === 'Silver' ? 'Kandora' : 'Chain'),
        weight: weight || (metal === 'Silver' ? 250 : 15),
        quantity,
      });
    }
  }

  if (ornaments.length === 0) {
    ornaments.push({
      metal: lower.includes('gold') || lower.includes('સોના') ? 'Gold' : 'Silver',
      category: 'Kandora',
      weight: 500,
      quantity: 1,
    });
  }

  return {
    loanAmount,
    loanDate,
    ornaments,
    rawText,
  };
}
