import { MetalType, ParsedCustomerVoice, ParsedLoanVoice, BulkCustomerLoanRecord } from './types';

// Helper to convert spoken number words (English, Hindi, Gujarati, Hinglish) into integers
export function parseSpokenNumber(text: string): number | null {
  const clean = text.toLowerCase().replace(/,/g, '').trim();

  // Direct digits like "50000", "50000.50", "142", "2026"
  const directMatch = clean.match(/(\d+(\.\d+)?)/);
  if (directMatch) {
    let num = parseFloat(directMatch[1]);
    if (
      clean.includes('lakh') ||
      clean.includes('lac') ||
      clean.includes('લાખ') ||
      clean.includes('लाख')
    ) {
      num *= 100000;
    } else if (
      clean.includes('thousand') ||
      clean.includes('hazar') ||
      clean.includes('hazaar') ||
      clean.includes('k') ||
      clean.includes('હજાર') ||
      clean.includes('हज़ार') ||
      clean.includes('हजार')
    ) {
      num *= 1000;
    }
    return Math.round(num * 100) / 100;
  }

  // Word-based numbers in English, Hindi, and Gujarati
  const wordsMap: Record<string, number> = {
    // English
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'twenty-five': 25, 'thirty': 30, 'thirty-five': 35,
    'forty': 40, 'forty-five': 45, 'fifty': 50, 'sixty': 60,
    'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'lac': 100000,

    // Hinglish (Romanized Hindi)
    'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'chaar': 4, 'paanch': 5, 'panch': 5,
    'chhah': 6, 'che': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'dus': 10, 'das': 10,
    'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'pandrah': 15,
    'solah': 16, 'satrah': 17, 'atharah': 18, 'unnees': 19, 'bees': 20,
    'pachees': 25, 'pachis': 25, 'pachchis': 25, 'tees': 30, 'chalees': 40,
    'pachas': 50, 'pachaas': 50, 'sath': 60, 'saath': 60, 'sattar': 70,
    'assi': 80, 'nabbe': 90, 'sau': 100, 'hazar': 1000, 'hazaar': 1000,

    // Gujarati
    'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5,
    'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10,
    'પચીસ': 25, 'ત્રીસ': 30, 'ચાલીસ': 40, 'પચાસ': 50,
    'સાઠ': 60, 'સિત્તેર': 70, 'એંસી': 80, 'નેવું': 90,
    'સો': 100, 'હજાર': 1000, 'લાખ': 100000,

    // Hindi (Devanagari)
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
    'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
    'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
    'सोलह': 16, 'सत्रह': 17, 'अट्ठारह': 18, 'उन्नीस': 19, 'बीस': 20,
    'पच्चीस': 25, 'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पैंतालीस': 45,
    'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
    'सौ': 100, 'हज़ार': 1000, 'हजार': 1000, 'लाख': 100000,
  };

  // Check compound multiplier e.g. "pachas hazar", "ek lakh", "50 hazar"
  const isThousand =
    clean.includes('thousand') ||
    clean.includes('hazar') ||
    clean.includes('hazaar') ||
    clean.includes('હજાર') ||
    clean.includes('हज़ार') ||
    clean.includes('हजार');

  const isLakh =
    clean.includes('lakh') ||
    clean.includes('lac') ||
    clean.includes('લાખ') ||
    clean.includes('लाख');

  const sortedWords = Object.entries(wordsMap).sort((a, b) => b[0].length - a[0].length);
  for (const [w, val] of sortedWords) {
    if (clean.includes(w)) {
      if (isLakh && val < 100) return val * 100000;
      if (isThousand && val < 1000) return val * 1000;
      return val;
    }
  }

  return null;
}

// 1. Single Customer Voice Parsing (English & Hindi)
export function parseSingleCustomerVoice(rawText: string, knownVillages: string[] = []): ParsedCustomerVoice {
  let text = rawText
    .replace(/thank you for watching\.?/gi, '')
    .replace(/thanks for watching\.?/gi, '')
    .replace(/thank you\.?/gi, '')
    .replace(/thanks\.?/gi, '')
    .replace(/please subscribe\.?/gi, '')
    .replace(/tola,?\s*diary\s*page\.?/gi, '')
    .trim();

  const lower = text.toLowerCase();

  let name = '';
  let village = '';
  let diary = '';
  let pageNumber = '';
  let mobile: string | undefined = undefined;

  // 1. Extract Mobile number (10 digits)
  const mobileMatch = text.match(/(?:\+91|0)?[6-9]\d{9}/);
  if (mobileMatch) {
    mobile = mobileMatch[0];
  }

  // 2. Extract Diary Reference (English, Hindi, Gujarati)
  const diaryMatch = text.match(/(?:diary|ચોપડો|ડાયરી|डायरी|चोपड़ा|खाता|book)\s*([A-Za-z0-9\-_]+(?:\s+[A-Za-z0-9]+)?)/i);
  if (diaryMatch) {
    const dVal = diaryMatch[1].trim();
    diary = dVal.toLowerCase().startsWith('diary') ? dVal : `Diary ${dVal}`;
  } else {
    const yearMatch = text.match(/\b(202[4-9])\b/);
    if (yearMatch) {
      diary = `Diary ${yearMatch[1]}`;
    }
  }

  // 3. Extract Page Number
  const pageMatch = text.match(
    /(?:page|page number|p\.|पाना नंबर|पाना|પાના નંબર|પાનું|પેજ|પાનુ|પાન|પન્ના|पन्ना नंबर|पन्ना|पृष्ठ|पेज नंबर|पेज)\s*(?:no\.?|number|संख्या)?\s*(\d+)/i
  );
  if (pageMatch) {
    pageNumber = pageMatch[1];
  }

  // 4. Extract Village (English, Hindi, Gujarati)
  const villagePatterns = [
    /(?:from|resident of|village|at|gaon|gaav|se|ka|ki|ગામ|વાળા|गांव|गाँव|से|का|की|निवासी)\s+([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+(?:\s+[A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)?)/i,
    /([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)\s+(?:village|gaam|gaon|gaav|ગામ|गांव|गाँव)/i,
  ];

  for (const pat of villagePatterns) {
    const vMatch = text.match(pat);
    if (vMatch && vMatch[1]) {
      const candidate = vMatch[1].trim();
      const ignored = [
        'diary', 'page', 'mobile', 'phone', 'customer', 'new', 'add', 'no', 'number',
        'loan', 'rupees', 'gold', 'silver', 'thank', 'you', 'kandora', 'chandi', 'sona',
        'डायरी', 'पेज', 'लोन', 'रुपये', 'चांदी', 'सोना'
      ];
      if (!ignored.includes(candidate.toLowerCase())) {
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

  // 5. Extract Customer Name
  let cleanForName = text;
  if (village) {
    cleanForName = cleanForName.replace(new RegExp(`(?:from|village|at|gaon|ગામ|गांव)?\s*${village}`, 'gi'), '');
  }
  if (diary) {
    cleanForName = cleanForName.replace(new RegExp(diary, 'gi'), '');
  }
  if (pageNumber) {
    cleanForName = cleanForName.replace(new RegExp(`(?:page|p\.|पाना नंबर|પાના નંબર|पन्ना)?\s*${pageNumber}`, 'gi'), '');
  }
  if (mobile) {
    cleanForName = cleanForName.replace(mobile, '');
  }

  cleanForName = cleanForName
    .replace(/\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:lakh|thousand|hazar|k|lac|rupees|rs|રૂપિયા|रुपये|रुपए|loan|amount)\b/gi, '')
    .replace(/(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|chaar|char|paanch|panch|che|chhah|saat|aath|nau|das|એક|બે|ત્રણ|ચાર|પાંચ|एक|दो|तीन|चार|पांच)\s*)?(?:quantities|quantity|qty|pieces|piece|pcs|items|item|નંગ|પીસ|पीस|नग)\b/gi, '')
    .replace(/\b(?:entry|entries|next entry|next|record|account|customer|new customer|add customer|name is|શ્રી|નામ|नाम|श्री|श्रीमती|अगला|अगली|एंट्री|બીજી|બીજો|એન્ટ્રી)\b/gi, '')
    .replace(/\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:lakh|thousand|hazar|k|lac|rupees|rs|રૂપિયા|રકમ|रुपये|रुपए|loan|amount)\b/gi, '')
    .replace(/\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:gram|grams|gm|gms|g|tola|tole|કિલો|kg|kilo|ગ્રામ|તોલા|ग्राम|तोला|किलो)\b/gi, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred|thousand|lakh|lac|ek|do|teen|char|chaar|paanch|panch|che|chhah|saat|aath|nau|das|gyarah|barah|terah|unnees|bees|pachees|tees|chalees|pachas|sath|sattar|assi|nabbe|sau|hazar|lakh|એક|બે|ત્રણ|ચાર|પાંચ|છ|સાત|આઠ|નવ|દસ|પચીસ|ત્રીસ|ચાલીસ|પચાસ|સાઠ|સો|હજાર|લાખ|एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस|ग्यारह|बारह|तेरह|बीस|पच्चीस|तीस|चालीस|पचास|साठ|सौ|हजार|हज़ार|लाख)\b/gi, '')
    .replace(/\b(?:gold|silver|sona|chandi|kandora|kandoro|canedor|canedora|can draw|can dora|can do ra|kandoora|kada|chain|ring|necklace|mangalsutra|earrings|bangle|anklet|payal|utensils|coin|સોનું|ચાંદી|કંદોરો|કડા|ચેઇન|વીંટી|હાર|મંગળસૂત્ર|सोना|चांदी|कंदोरा|कड़ा|चेन|अंगूठी|पायल|हार|झुमका)\b/gi, '')
    .replace(/(?:customer|new customer|add customer|name is|શ્રી|નામ|नाम|श्री|श्रीमती|\bno\.?\s*\d+|thank you|thanks|from|village|diary|page|loan|rupees|રૂપિયા|रुपये)/gi, '')
    .replace(/[^A-Za-z\u0A80-\u0AFF\u0900-\u097F\s]/g, '')
    .trim();

  const nameWords = cleanForName.split(/\s+/).filter((w) => w.length > 1);
  if (nameWords.length > 0) {
    name = nameWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  return {
    name: name || '',
    village: village || '',
    diary: diary || '',
    pageNumber: pageNumber || '',
    mobile,
    rawText,
  };
}

// 2. Bulk Customer Voice Parsing
export function parseBulkCustomersVoice(rawText: string, knownVillages: string[] = []): ParsedCustomerVoice[] {
  const text = rawText
    .replace(/thank you for watching\.?/gi, '')
    .replace(/thank you\.?/gi, '')
    .replace(/thanks\.?/gi, '')
    .replace(/tola,?\s*diary\s*page\.?/gi, '')
    .trim();

  if (!text) return [];

  let segments = text.split(/(?:(?:^|\s)\d+[\.\)]|\b(?:next|अगला|अगली|બીજી|બીજો|પછીની)\s*(?:entry|customer|account|record|loan|ग्राहक|एंट्री|એન્ટ્રી)?\b|\b(?:entry|account|customer|record)\s*\d+:?|\bCustomer\s*\d+:?|\bનંબર\s*\d+:?|\bनंबर\s*\d+:?|\bnumber\s*\d+:?|\band\s+next:?|\bપછી:?)/i);

  if (segments.length <= 1) {
    const newline = String.fromCharCode(10);
    segments = text.split(new RegExp('(?:;|' + newline + '|\band\s+then\b|\band\s+also\b|\baur\b)', 'i'));
  }

  const cleanedSegments = segments
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !/^(thank\s*you|thanks)$/i.test(s));

  if (cleanedSegments.length === 0) {
    const single = parseSingleCustomerVoice(rawText, knownVillages);
    return single.name ? [single] : [];
  }

  const results: ParsedCustomerVoice[] = [];
  for (const seg of cleanedSegments) {
    const parsed = parseSingleCustomerVoice(seg, knownVillages);
    if (parsed.name || parsed.village || parsed.pageNumber) {
      results.push(parsed);
    }
  }

  return results;
}

// 3. High-Throughput Bulk Voice to Excel Parser (English & Hindi)
export function parseBulkVoiceToExcelRecords(
  rawText: string,
  knownVillages: string[] = [],
  knownCategories: string[] = []
): BulkCustomerLoanRecord[] {
  const cleanSource = rawText
    .replace(/thank you for watching\.?/gi, '')
    .replace(/thanks for watching\.?/gi, '')
    .replace(/thank you\.?/gi, '')
    .replace(/thanks\.?/gi, '')
    .replace(/please subscribe\.?/gi, '')
    .replace(/tola,?\s*diary\s*page\.?/gi, '')
    .replace(/(\d+),(\d+)/g, '$1$2')
    .replace(/\bgrand\b/gi, 'gram')
    .trim();

  if (!cleanSource || cleanSource.length < 2) return [];

  const splitPattern = /(?:(?:^|\s)\d+[\.\)]|\bCustomer\s*\d+:?|\bનંબર\s*\d+:?|\bनंबर\s*\d+:?|\bnumber\s*\d+:?|\bnext\s*customer:?|\bagla\s*customer:?|\bnext:?|\band\s+next:?|\bપછી:?|\bબીજો\s*ગ્રાહક:?|\bअगला\s*ग्राहक:?)/i;
  
  let rawSegments = cleanSource.split(splitPattern);

  if (rawSegments.length <= 1) {
    const newline = String.fromCharCode(10);
    rawSegments = cleanSource.split(new RegExp('(?:;|' + newline + '|\band\s+then\s+next\b|\baur\s+agla\b)', 'i'));
  }

  const validSegments = rawSegments
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !/^(thank\s*you|thanks|ok|okay|yes)$/i.test(s));

  if (validSegments.length === 0) {
    if (cleanSource.length > 1) validSegments.push(cleanSource);
  }

  const records: BulkCustomerLoanRecord[] = [];

  const categoryKeywords: Record<string, string> = {
    // Kandora
    'kandora': 'Kandora',
    'kandoro': 'Kandora',
    'controller': 'Kandora',
    'control': 'Kandora',
    'kontroller': 'Kandora',
    'canedor': 'Kandora',
    'canedora': 'Kandora',
    'can draw': 'Kandora',
    'can dora': 'Kandora',
    'can do ra': 'Kandora',
    'kandoora': 'Kandora',
    'કંદોરો': 'Kandora',
    'કંદોરા': 'Kandora',
    'कंदोरा': 'Kandora',
    'करधनी': 'Kandora',

    // Kada
    'kada': 'Kada',
    'kadas': 'Kada',
    'કડા': 'Kada',
    'કડો': 'Kada',
    'कड़ा': 'Kada',
    'कड़े': 'Kada',

    // Chain
    'chain': 'Chain',
    'ચેઇન': 'Chain',
    'દોરો': 'Chain',
    'चेन': 'Chain',

    // Ring
    'ring': 'Ring',
    'viti': 'Ring',
    'વીંટી': 'Ring',
    'अंगूठी': 'Ring',
    'अंगूठियां': 'Ring',
    'मुंदरी': 'Ring',

    // Necklace / Haar
    'necklace': 'Necklace',
    'haar': 'Necklace',
    'હાર': 'Necklace',
    'हार': 'Necklace',

    // Mangalsutra
    'mangalsutra': 'Mangalsutra',
    'મંગળસૂત્ર': 'Mangalsutra',
    'मंगलसूत्र': 'Mangalsutra',

    // Earrings / Jhumki
    'earring': 'Earrings',
    'earrings': 'Earrings',
    'jhumki': 'Earrings',
    'butti': 'Earrings',
    'ઝૂમખી': 'Earrings',
    'झुमका': 'Earrings',
    'झुमके': 'Earrings',
    'बाली': 'Earrings',

    // Bangles
    'bangle': 'Bangle',
    'bangles': 'Bangle',
    'બંગડી': 'Bangle',
    'चूड़ी': 'Bangle',
    'चूड़ियां': 'Bangle',
    'कंगन': 'Bangle',

    // Anklet / Payal
    'anklet': 'Anklet / Payal',
    'payal': 'Anklet / Payal',
    'ઝાઝર': 'Anklet / Payal',
    'પાયલ': 'Anklet / Payal',
    'पायल': 'Anklet / Payal',
    'पाजेब': 'Anklet / Payal',
    'झांझर': 'Anklet / Payal',

    // Utensils
    'utensils': 'Utensils',
    'thali': 'Utensils',
    'વાસણ': 'Utensils',
    'बर्तन': 'Utensils',

    // Coin / Bar
    'coin': 'Coin / Bar',
    'સિક્કો': 'Coin / Bar',
    'सिक्का': 'Coin / Bar',
  };

  validSegments.forEach((origSeg, idx) => {
    let seg = origSeg;
    let initialIndex = '';
    const matchNum = seg.match(/^(?:number\s+|item\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|\d+)[\s,:\.\-]+/i);
    if (matchNum) {
      const numMap: Record<string, string> = {
        one: '1', two: '2', three: '3', four: '4', five: '5',
        six: '6', seven: '7', eight: '8', nine: '9', ten: '10'
      };
      initialIndex = numMap[matchNum[1].toLowerCase()] || matchNum[1];
      seg = seg.slice(matchNum[0].length).trim();
    }

    const sLower = seg.toLowerCase();

    // 1. Mobile
    let mobile: string | undefined = undefined;
    const mMatch = seg.match(/(?:\+91|0)?[6-9]\d{9}/);
    if (mMatch) mobile = mMatch[0];

    // 2. Diary
    let diary = 'Diary 2026';
    const diaryMatch = seg.match(/(?:diary|ચોપડો|ડાયરી|डायरी|चोपड़ा)\s*([A-Za-z0-9\-_]+)/i);
    if (diaryMatch) {
      diary = diaryMatch[1].toLowerCase().startsWith('diary') ? diaryMatch[1] : `Diary ${diaryMatch[1]}`;
    }

    // 3. Page Number
    let pageNumber = '';
    const pageMatch = seg.match(/(?:page|p\.|પાના નંબર|પાનું|પેજ|પાન|પન્ના|पाना नंबर|पाना|पन्ना नंबर|पन्ना|पृष्ठ|पेज)\s*(?:no\.?|number|संख्या)?\s*(\d+)/i);
    if (pageMatch) {
      pageNumber = pageMatch[1];
    } else if (initialIndex) {
      pageNumber = initialIndex;
    } else {
      const pageFallback = seg.match(/(?:page|पाना|पन्ना|પાના|p\.)\s*(\d+)/i);
      if (pageFallback) pageNumber = pageFallback[1];
    }

    // 4. Village
    let village = '';
    const villagePatterns = [
      /(?:from|resident of|village|at|gaon|gaav|se|ka|ki|ગામ|વાળા|गांव|गाँव|से|का|की)\s+([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)/i,
      /([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)\s+(?:village|gaam|gaon|gaav|ગામ|गांव|गाँव)/i,
    ];

    for (const pat of villagePatterns) {
      const vMatch = seg.match(pat);
      if (vMatch && vMatch[1]) {
        const candidate = vMatch[1].trim();
        const ignored = [
          'village', 'gaon', 'gaam', 'town', 'from', 'at',
          'diary', 'page', 'mobile', 'phone', 'customer', 'new', 'add', 'no', 'number',
          'loan', 'rupees', 'gold', 'silver', 'kandora', 'chandi', 'sona', 'डायरी', 'पेज', 'चांदी', 'सोना'
        ];
        if (!ignored.includes(candidate.toLowerCase())) {
          village = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          break;
        }
      }
    }

    if (!village && knownVillages.length > 0) {
      for (const v of knownVillages) {
        if (sLower.includes(v.toLowerCase())) {
          village = v;
          break;
        }
      }
    }
    if (!village) village = 'Dahod';

    // 5. Loan Amount (Supports "50000", "50 hazar", "50 हजार", "1 lakh", etc.)
    let loanAmount = 0;
    const amountMatches = [
      /(?:loan amount|total loan|loan of|amount of|loan|રૂપિયા|રકમ|रुपये|रुपए|लोन|रकम|rs\.?)\s*(?:is|of|for)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|thousand|hazar|k|lac|rupees|rs|રૂપિયા|रुपये)?/i,
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|thousand|hazar|k|rupees|rs|રૂપિયા|रुपये|रुपए)\s*(?:loan|total|amount|लोन)?/i,
      /(?:fifty|forty|thirty|twenty|ten|hundred|thousand|hazar|lakh|પચાસ|સાઠ|લાખ|હજાર|पचास|साठ|लाख|हजार|हज़ार)\s*(?:thousand|hazar|lakh|rupees|rs|રૂપિયા|रुपये)?/i,
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
      const digitNums = seg.match(/\b\d{4,7}\b/g);
      if (digitNums && digitNums.length > 0) {
        loanAmount = parseInt(digitNums[0], 10);
      } else {
        loanAmount = 50000;
      }
    }

    // 6. Metal Type
    let metal: MetalType = 'Silver';
    if (
      sLower.includes('gold') ||
      sLower.includes('sona') ||
      sLower.includes('sonu') ||
      sLower.includes('સોનું') ||
      sLower.includes('સોના') ||
      sLower.includes('सोना') ||
      sLower.includes('सोने')
    ) {
      metal = 'Gold';
    } else if (
      sLower.includes('silver') ||
      sLower.includes('chandi') ||
      sLower.includes('ચાંદી') ||
      sLower.includes('चांदी')
    ) {
      metal = 'Silver';
    }

    // 7. Weight
    const wtMatch = seg.match(/(\d+(?:\.\d+)?)\s*(gram|grams|gm|gms|g|tola|tole|ગ્રામ|તોલા|ग्राम|तोला|grand)/i);
    let weight = 0;
    if (wtMatch) {
      weight = parseFloat(wtMatch[1]);
      if (
        wtMatch[2].toLowerCase().includes('tola') ||
        wtMatch[2].includes('તોલા') ||
        wtMatch[2].includes('तोला')
      ) {
        weight = weight * 11.664;
      }
      weight = Math.round(weight * 10) / 10;
    } else {
      const wordWeights: Record<string, number> = {
        'five hundred': 500, 'four hundred': 400, 'three hundred': 300, 'two hundred': 200, 'one hundred': 100,
        'panch sau': 500, 'char sau': 400, 'tran sau': 300, 'be sau': 200, 'ek sau': 100,
        'पांच सौ': 500, 'चार सौ': 400, 'तीन सौ': 300, 'दो सौ': 200, 'एक सौ': 100,
        'પાંચસો': 500, 'ચારસો': 400, 'ત્રણસો': 300, 'બસો': 200, 'સો': 100,
        'fifty': 50, 'pachas': 50, 'पचास': 50, 'પચાસ': 50,
        'twenty': 20, 'bees': 20, 'બીસ': 20, 'बीस': 20,
        'ten': 10, 'dus': 10, 'દસ': 10, 'दस': 10,
        'hundred': 100, 'sau': 100, 'सौ': 100,
      };
      for (const [wKey, val] of Object.entries(wordWeights)) {
        if (sLower.includes(wKey)) {
          weight = val;
          break;
        }
      }
    }
    if (!weight) {
      weight = metal === 'Silver' ? 500 : 10;
    }

    // 8. Ornament Category
    let category = 'Kandora';
    for (const [kw, catName] of Object.entries(categoryKeywords)) {
      if (sLower.includes(kw)) {
        category = catName;
        break;
      }
    }

    // 8.5 Quantity extraction
    let quantity = 1;
    const qtyMatches = [
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|chaar|char|paanch|panch|che|chhah|saat|aath|nau|das|એક|બે|ત્રણ|ચાર|પાંચ|एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस)\s*(?:quantities|quantity|qty|pieces|piece|pcs|items|item|નંગ|પીસ|पीस|नग)\b/i,
      /(?:quantities|quantity|qty|pieces|pcs|નંગ|પીસ|पीस|नग)\s*(?:is|of|hai|che|હે)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|chaar|char|paanch|panch|che|એક|બે|ત્રણ|ચાર|પાંચ|एक|दो|तीन|चार|पांच)\b/i,
    ];
    for (const pat of qtyMatches) {
      const qm = seg.match(pat);
      if (qm) {
        const qVal = parseSpokenNumber(qm[1]);
        if (qVal && qVal >= 1 && qVal <= 100) {
          quantity = Math.round(qVal);
          break;
        }
      }
    }

    // 9. Customer Name extraction
    let cleanForName = seg;
    if (village) {
      cleanForName = cleanForName.replace(new RegExp(`(?:from|village|at|gaon|ગામ|गांव)?\s*${village}`, 'gi'), '');
    }
    if (diary) {
      cleanForName = cleanForName.replace(new RegExp(diary, 'gi'), '');
    }
    if (pageNumber) {
      cleanForName = cleanForName.replace(new RegExp(`(?:page|p\.|પાના નંબર|પાનું|पाना|पन्ना)?\s*${pageNumber}`, 'gi'), '');
    }
    if (mobile) {
      cleanForName = cleanForName.replace(mobile, '');
    }

    cleanForName = cleanForName
      .replace(/(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|chaar|char|paanch|panch|che|chhah|saat|aath|nau|das|એક|બે|ત્રણ|ચાર|પાંચ|एक|दो|तीन|चार|पांच)\s*)?(?:quantities|quantity|qty|pieces|piece|pcs|items|item|નંગ|પીસ|पीस|नग)\b/gi, '')
      .replace(/\b(?:entry|entries|next entry|next|record|account|customer|new customer|add customer|name is|શ્રી|નામ|नाम|श्री|श्रीमती|अगला|अगली|एंट्री|બીજી|બીજો|એન્ટ્રી)\b/gi, '')
      .replace(/\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:lakh|thousand|hazar|k|lac|rupees|rs|રૂપિયા|રકમ|रुपये|रुपए|loan|amount|लोन)\b/gi, '')
      .replace(/(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|fifty|hundred|two hundred|three hundred|four hundred|five hundred|pachas|sau|be sau|tran sau|char sau|panch sau|dosau|teensau|\d+)\s*)+(?:gram|grams|gm|gms|g|grand|tola|tole|ગ્રામ|તોલા|કિલો|kg|kilo|ग्राम|तोला|किलो)/gi, '')
      .replace(/\b\d+\b/g, '')
      .replace(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred|thousand|lakh|lac|ek|do|teen|char|chaar|paanch|panch|che|chhah|saat|aath|nau|das|gyarah|barah|terah|unnees|bees|pachees|tees|chalees|pachas|sath|sattar|assi|nabbe|sau|hazar|lakh|એક|બે|ત્રણ|ચાર|પાંચ|છ|સાત|આઠ|નવ|દસ|પચીસ|ત્રીસ|ચાલીસ|પચાસ|સાઠ|સો|હજાર|લાખ|एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस|ग्यारह|बारह|तेरह|बीस|पच्चीस|तीस|चालीस|पचास|साठ|सौ|हजार|हज़ार|लाख)\b/gi, '')
      .replace(/\b(?:gold|silver|sona|chandi|kandora|kandoro|controller|control|kontroller|canedor|canedora|can draw|can dora|can do ra|kandoora|kada|chain|ring|necklace|mangalsutra|earrings|bangle|anklet|payal|utensils|coin|સોનું|ચાંદી|કંદોરો|કડા|ચેઇન|વીંટી|હાર|મંગળસૂત્ર|सोना|चांदी|कंदोरा|कड़ा|चेन|अंगूठी|पायल|हार|झुमका)\b/gi, '')
      .replace(/(?:customer|new customer|add customer|name is|શ્રી|નામ|नाम|श्री|श्रीमती|\bno\.?\s*\d+|thank you|thanks|from|village|diary|page|loan|rupees|રૂપિયા|રકમ|रुपये)/gi, '')
      .replace(/[^A-Za-z\u0A80-\u0AFF\u0900-\u097F\s]/g, '')
      .trim();

    const nameWords = cleanForName.split(/\s+/).filter((w) => w.length > 1);
    let name = '';
    if (nameWords.length > 0) {
      name = nameWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    // Default sequential page if missing
    if (!pageNumber) {
      pageNumber = `${idx + 1}`;
    }

    const hasWarning = !name || !pageNumber;
    records.push({
      id: `bulk-${Date.now()}-${idx + 1}`,
      name: name || `Customer ${idx + 1}`,
      village,
      diary,
      pageNumber,
      loanAmount,
      metal,
      category,
      weight,
      quantity,
      mobile,
      rawSpeech: seg,
      status: hasWarning ? 'WARNING' : 'VALID',
      warningMessage: !name ? 'Spoken customer name unclear' : undefined,
    });
  });

  return records;
}

// 4. Single Customer Loan Voice Parsing (English & Hindi)
export function parseLoanVoice(rawText: string, knownCategories: string[] = []): ParsedLoanVoice {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  let loanAmount = 0;
  const amountMatches = [
    /(?:loan amount|total loan|loan of|amount of|total|રૂપિયા|રકમ|रुपये|रुपए|लोन|loan)\s*(?:is|of|for)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|thousand|hazar|k|lac|rupees|rs|રૂપિયા|रुपये)?/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|thousand|hazar|k|rupees|rs|રૂપિયા|रुपये|रुपए)\s*(?:loan|total|amount|लोन)/i,
    /(?:fifty|forty|thirty|twenty|ten|hundred|thousand|hazar|lakh|પચાસ|સાઠ|લાખ|હજાર|पचास|साठ|लाख|हजार|हज़ार)\s*(?:thousand|hazar|lakh|rupees|rs|રૂપિયા|रुपये)?/i,
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

  const ornamentSegments = text.split(/(?:\band\b|\bplus\b|\balso\b|\baur\b|,|અને|તથા|સાથે|और)/i);
  const ornaments: { metal: MetalType; category: string; weight: number; quantity: number }[] = [];

  const categoryKeywords: Record<string, string> = {
    'kandora': 'Kandora',
    'kandoro': 'Kandora',
    'કંદોરો': 'Kandora',
    'કંદોરા': 'Kandora',
    'कंदोरा': 'Kandora',
    'करधनी': 'Kandora',
    'kada': 'Kada',
    'kadas': 'Kada',
    'કડા': 'Kada',
    'कड़ा': 'Kada',
    'कड़े': 'Kada',
    'chain': 'Chain',
    'ચેઇન': 'Chain',
    'ચેન': 'Chain',
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
    'ઝૂમખી': 'Earrings',
    'झुमका': 'Earrings',
    'झुमके': 'Earrings',
    'bangle': 'Bangle',
    'બંગડી': 'Bangle',
    'चूड़ी': 'Bangle',
    'anklet': 'Anklet / Payal',
    'payal': 'Anklet / Payal',
    'ઝાઝર': 'Anklet / Payal',
    'पायल': 'Anklet / Payal',
    'utensils': 'Utensils',
    'thali': 'Utensils',
    'વાસણ': 'Utensils',
    'बर्तन': 'Utensils',
    'coin': 'Coin / Bar',
    'સિક્કો': 'Coin / Bar',
    'सिक्का': 'Coin / Bar',
  };

  for (const seg of ornamentSegments) {
    const sLower = seg.toLowerCase();

    const wtMatch = seg.match(/(\d+(\.\d+)?)\s*(gram|grams|gm|gms|g|tola|tole|ગ્રામ|તોલા|ग्राम|तोला)/i);
    let weight = 0;
    if (wtMatch) {
      weight = parseFloat(wtMatch[1]);
      if (
        wtMatch[3].toLowerCase().includes('tola') ||
        wtMatch[3].includes('તોલા') ||
        wtMatch[3].includes('तोला')
      ) {
        weight = weight * 11.664;
      }
      weight = Math.round(weight * 10) / 10;
    }

    let metal: MetalType = 'Silver';
    if (
      sLower.includes('gold') ||
      sLower.includes('sona') ||
      sLower.includes('sonu') ||
      sLower.includes('સોનું') ||
      sLower.includes('સોના') ||
      sLower.includes('सोना') ||
      sLower.includes('सोने')
    ) {
      metal = 'Gold';
    } else if (
      sLower.includes('silver') ||
      sLower.includes('chandi') ||
      sLower.includes('ચાંદી') ||
      sLower.includes('चांदी')
    ) {
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
    const qtyMatch = seg.match(/(\d+)\s*(?:pcs|piece|pieces|નંગ|pieces|items|पीस)/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
    }

    if (weight > 0 || category !== 'Other') {
      ornaments.push({
        metal,
        category: category === 'Other' ? (metal === 'Silver' ? 'Kandora' : 'Chain') : category,
        weight: weight || (metal === 'Silver' ? 500 : 10),
        quantity,
      });
    }
  }

  if (ornaments.length === 0) {
    ornaments.push({
      metal: 'Silver',
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
