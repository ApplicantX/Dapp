import { MetalType, ParsedCustomerVoice, ParsedLoanVoice } from './types';

// Helper to convert spoken number words into integers
export function parseSpokenNumber(text: string): number | null {
  const clean = text.toLowerCase().replace(/,/g, '').trim();

  // Direct digits like "50000", "50000.50", "142", "2026"
  const directMatch = clean.match(/(\d+(\.\d+)?)/);
  if (directMatch) {
    let num = parseFloat(directMatch[1]);
    if (clean.includes('lakh') || clean.includes('lac') || clean.includes('લાખ') || clean.includes('लाख')) {
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
// Example input: "Ramesh Mishra from Vova village, Diary 2026, Page 142, mobile 9825123456"
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
    // Check if a 4-digit year like 2024, 2025, 2026 is mentioned
    const yearMatch = text.match(/\b(202[4-9])\b/);
    if (yearMatch) {
      diary = `Diary ${yearMatch[1]}`;
    }
  }

  // Extract Page Number: e.g. "Page 142", "Page number 142", "પાના નંબર 142", "પાનું 142"
  const pageMatch = text.match(/(?:page|page number|p\.|પાના નંબર|પાનું|પેજ|पृष्ठ|पन्ना)\s*(?:no\.?|number)?\s*(\d+)/i);
  if (pageMatch) {
    pageNumber = pageMatch[1];
  } else {
    // If there's a standalone number that is not mobile, not year
    const numMatches = text.match(/\b\d{1,4}\b/g);
    if (numMatches) {
      const candidates = numMatches.filter((n) => !diary.includes(n) && (!mobile || !mobile.includes(n)));
      if (candidates.length > 0) {
        pageNumber = candidates[candidates.length - 1];
      }
    }
  }

  // Extract Village: check against knownVillages or "from X village", "X gaam", "ગામ X"
  const villagePatterns = [
    /(?:from|resident of|village|at|ગામ|રહેવાસી|વાળા|ગાંવ)\s+([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+(?:\s+[A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)?)/i,
    /([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)\s+(?:village|gaam|ગામ|ગાંવ)/i,
  ];

  for (const pat of villagePatterns) {
    const vMatch = text.match(pat);
    if (vMatch && vMatch[1]) {
      const candidate = vMatch[1].trim();
      const ignoredWords = ['diary', 'page', 'mobile', 'phone', 'customer', 'new', 'add', 'no', 'number'];
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

  // Extract Customer Name: Look before "from", "village", "diary", "page", or start of text
  let nameText = text;
  if (village) {
    const vIdx = nameText.toLowerCase().indexOf(village.toLowerCase());
    if (vIdx > 0) {
      nameText = nameText.substring(0, vIdx);
    }
  }
  const markers = ['from', 'village', 'diary', 'page', 'mobile', 'ગામ', 'ચોપડો', 'પાના', 'ડાયરી'];
  for (const m of markers) {
    const mIdx = nameText.toLowerCase().indexOf(m);
    if (mIdx > 0) {
      nameText = nameText.substring(0, mIdx);
    }
  }

  // Clean up name
  name = nameText
    .replace(/(?:customer|new customer|add customer|name is|શ્રી|નામ)/gi, '')
    .replace(/[^A-Za-z\u0A80-\u0AFF\u0900-\u097F\s]/g, '')
    .trim();

  // Capitalize name
  if (name) {
    name = name
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return {
    name: name || 'Unknown Customer',
    village: village || 'Dahod',
    diary: diary || 'Diary 2026',
    pageNumber: pageNumber || '1',
    mobile,
    rawText,
  };
}

// 2. Bulk Customer Voice Parsing (Section 10)
// Example input: "1. Ramesh Patel from Vova village Diary 2026 Page 12, 2. Suresh Damor from Garbada Diary 2025 Page 84, 3. Bharat Bhabhor from Limkheda Diary 2026 Page 55"
export function parseBulkCustomersVoice(rawText: string, knownVillages: string[] = []): ParsedCustomerVoice[] {
  const text = rawText.trim();

  // Split by numbered items e.g. "1.", "2.", "Customer 1:", "Next customer:", "and next"
  let segments = text.split(/(?:\b\d+[\.\)]|\bCustomer\s*\d+:?|\bનંબર\s*\d+:?|\bnumber\s*\d+:?|\bnext\s*customer:?|\band\s+next:?)/i);

  // If no numbered split found, try splitting by semicolon, newline, or "and then"
  if (segments.length <= 1) {
    const newline = String.fromCharCode(10);
    segments = text.split(new RegExp('(?:;|' + newline + '|\band\s+then\b|\band\s+also\b)', 'i'));
  }

  const cleanedSegments = segments
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (cleanedSegments.length === 0) {
    return [parseSingleCustomerVoice(rawText, knownVillages)];
  }

  return cleanedSegments.map((seg) => parseSingleCustomerVoice(seg, knownVillages));
}

// 3. Loan Voice Parsing with Multiple Ornaments (Section 8 & 12)
// Example input: "Add 500 grams silver kandora and 200 grams silver kada for a total loan amount of fifty thousand rupees on 12 August"
export function parseLoanVoice(rawText: string, knownCategories: string[] = []): ParsedLoanVoice {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Extract Total Loan Amount
  let loanAmount = 0;
  const amountMatches = [
    /(?:loan amount|total loan|loan of|amount of|total|રૂપિયા|रुपये|loan)\s*(?:is|of|for)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|thousand|k|lac|rupees|rs|રૂપિયા|रुपये)?/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|thousand|k|rupees|rs|રૂપિયા|रुपये)\s*(?:loan|total|amount)/i,
    /(?:fifty|forty|thirty|twenty|ten|sixty|seventy|eighty|ninety|hundred|thousand|lakh|पचास|साठ|લાખ|હજાર)\s*(?:thousand|lakh|rupees|rs|રૂપિયા|रुपये)?/i,
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
    // Check highest standalone number >= 1000
    const nums = text.match(/\b\d{4,7}\b/g);
    if (nums && nums.length > 0) {
      loanAmount = parseInt(nums[0], 10);
    } else {
      loanAmount = 50000; // default fallback
    }
  }

  // 2. Extract Date (or default today)
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

  // 3. Extract Multiple Ornaments
  // Split phrases by "and", "plus", ",", "સાથે", "તથા", "અને", "aur"
  const ornamentSegments = text.split(/(?:\band\b|\bplus\b|\balso\b|,|અને|તથા|સાથે|और)/i);
  const ornaments: { metal: MetalType; category: string; weight: number; quantity: number }[] = [];

  const categoryKeywords: Record<string, string> = {
    'kandora': 'Kandora',
    'kandoro': 'Kandora',
    'કંદોરો': 'Kandora',
    'કંદોરા': 'Kandora',
    'कंदोरा': 'Kandora',
    'kada': 'Kada',
    'kadas': 'Kada',
    'કડા': 'Kada',
    'કડો': 'Kada',
    'कड़ा': 'Kada',
    'chain': 'Chain',
    'ચેઇન': 'Chain',
    'દોરો': 'Chain',
    'चेन': 'Chain',
    'ring': 'Ring',
    'viti': 'Ring',
    'વીંટી': 'Ring',
    'अंगूठी': 'Ring',
    'necklace': 'Necklace',
    'haar': 'Necklace',
    'હાર': 'Necklace',
    'हार': 'Necklace',
    'mangalsutra': 'Mangalsutra',
    'મંગળસૂત્ર': 'Mangalsutra',
    'मंगलसूत्र': 'Mangalsutra',
    'earring': 'Earrings',
    'earrings': 'Earrings',
    'jhumki': 'Earrings',
    'jhumka': 'Earrings',
    'butti': 'Earrings',
    'ઝૂમખી': 'Earrings',
    'ઝૂમખા': 'Earrings',
    'બુટ્ટી': 'Earrings',
    'झुमके': 'Earrings',
    'bangle': 'Bangle',
    'bangles': 'Bangle',
    'kangan': 'Bangle',
    'chudi': 'Bangle',
    'બંગડી': 'Bangle',
    'ચૂડી': 'Bangle',
    'चूड़ी': 'Bangle',
    'anklet': 'Anklet / Payal',
    'payal': 'Anklet / Payal',
    'jhanjhar': 'Anklet / Payal',
    'toda': 'Anklet / Payal',
    'ઝાઝર': 'Anklet / Payal',
    'પાયલ': 'Anklet / Payal',
    'તોડા': 'Anklet / Payal',
    'पायल': 'Anklet / Payal',
    'utensils': 'Utensils',
    'thali': 'Utensils',
    'bartan': 'Utensils',
    'vasan': 'Utensils',
    'વાસણ': 'Utensils',
    'થાલી': 'Utensils',
    'बर्तन': 'Utensils',
    'coin': 'Coin / Bar',
    'bar': 'Coin / Bar',
    'lagdi': 'Coin / Bar',
    'ginni': 'Coin / Bar',
    'સિક્કો': 'Coin / Bar',
    'લગડી': 'Coin / Bar',
  };

  for (const seg of ornamentSegments) {
    const sLower = seg.toLowerCase();

    // Check if segment mentions weight
    const wtMatch = seg.match(/(\d+(\.\d+)?)\s*(gram|grams|gm|gms|g|tola|tole|ગ્રામ|તોલા|ग्राम|तोला)/i);
    let weight = 0;
    if (wtMatch) {
      weight = parseFloat(wtMatch[1]);
      if (wtMatch[3].toLowerCase().includes('tola') || wtMatch[3].includes('તોલા') || wtMatch[3].includes('तोला')) {
        weight = weight * 11.664;
      }
      weight = Math.round(weight * 10) / 10;
    }

    // Check metal: Gold or Silver
    let metal: MetalType = 'Silver';
    if (sLower.includes('gold') || sLower.includes('sona') || sLower.includes('સોનું') || sLower.includes('સોના') || sLower.includes('सोना')) {
      metal = 'Gold';
    } else if (sLower.includes('silver') || sLower.includes('chandi') || sLower.includes('ચાંદી') || sLower.includes('चांदी')) {
      metal = 'Silver';
    } else {
      // Default to Silver if weight > 50g (tribal Dahod silver ornaments are heavy), otherwise Gold
      metal = weight >= 50 ? 'Silver' : 'Gold';
    }

    // Check category
    let category = 'Other';
    for (const [kw, catName] of Object.entries(categoryKeywords)) {
      if (sLower.includes(kw)) {
        category = catName;
        break;
      }
    }

    // Check quantity: e.g. "pair of", "2 pcs", "2 kada"
    let quantity = 1;
    if (sLower.includes('pair') || sLower.includes('બે') || sLower.includes('दो') || sLower.includes('2')) {
      quantity = 2;
    }

    // If we found a valid category or weight, add to ornaments
    if (weight > 0 || category !== 'Other') {
      ornaments.push({
        metal,
        category: category !== 'Other' ? category : (metal === 'Silver' ? 'Kandora' : 'Chain'),
        weight: weight || (metal === 'Silver' ? 250 : 15),
        quantity,
      });
    }
  }

  // If no ornaments parsed from segments, provide a sensible default based on text
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
