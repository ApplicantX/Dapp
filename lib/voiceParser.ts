import { MetalType, OrnamentType, VoiceAction, VoiceParseResult } from './types';

// Helper to convert spoken number words (English, Hindi, Gujarati) into numbers
export function parseSpokenNumber(text: string): number | null {
  const clean = text.toLowerCase().replace(/,/g, '').trim();

  // Direct digits like "50000", "50000.50"
  const directMatch = clean.match(/(\d+(\.\d+)?)/);
  if (directMatch) {
    let num = parseFloat(directMatch[1]);
    if (clean.includes('lakh') || clean.includes('lac') || clean.includes('लाख') || clean.includes('લાખ')) {
      num *= 100000;
    } else if (clean.includes('thousand') || clean.includes('k') || clean.includes('हज़ार') || clean.includes('હજાર')) {
      num *= 1000;
    } else if (clean.includes('crore') || clean.includes('करोड़') || clean.includes('કરોડ')) {
      num *= 10000000;
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
    'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90, 'सौ': 100,
    'हज़ार': 1000, 'लाख': 100000, 'डेढ़': 1.5, 'ढाई': 2.5, 'દોઢ': 1.5, 'અઢી': 2.5,
    'પચાસ': 50, 'સાઠ': 60, 'સિત્તેર': 70, 'એંસી': 80, 'નેવું': 90, 'સો': 100, 'હજાર': 1000,
  };

  for (const [w, val] of Object.entries(wordsMap)) {
    if (clean.includes(w)) {
      if (clean.includes('thousand') || clean.includes('हज़ार') || clean.includes('હજાર')) {
        return val < 1000 ? val * 1000 : val;
      }
      if (clean.includes('lakh') || clean.includes('लाख') || clean.includes('લાખ')) {
        return val < 100000 ? val * 100000 : val;
      }
      return val;
    }
  }

  return null;
}

export function parseVoiceInput(rawTranscript: string): VoiceParseResult {
  const text = rawTranscript.toLowerCase().trim();
  const result: VoiceParseResult = {
    action: 'UNKNOWN',
    confidence: 0.5,
    rawTranscript,
    interpretedText: '',
  };

  // 1. Detect Action
  const isAddLoan =
    text.includes('add loan') ||
    text.includes('new loan') ||
    text.includes('create loan') ||
    text.includes('give loan') ||
    text.includes('lend') ||
    text.includes('loan of') ||
    text.includes('loan for') ||
    text.includes('girvi') ||
    text.includes('गिरवी') ||
    text.includes('गहना') ||
    text.includes('ગિરવે') ||
    text.includes('ગીરવી') ||
    text.includes('નવું ખાતું') ||
    text.includes('ખાતું બનાવો') ||
    text.includes('લોન આપો') ||
    text.includes('લોન આપ્યા');

  const isPayment =
    text.includes('record interest') ||
    text.includes('pay interest') ||
    text.includes('collect interest') ||
    text.includes('interest of') ||
    text.includes('received payment') ||
    text.includes('payment of') ||
    text.includes('ब्याज जमा') ||
    text.includes('जमा करो') ||
    text.includes('વ્યાજ જમા') ||
    text.includes('રકમ જમા');

  const isSearch =
    text.includes('search') ||
    text.includes('find customer') ||
    text.includes('find') ||
    text.includes('look for') ||
    text.includes('show customer') ||
    text.includes('open customer') ||
    text.includes('શોધો') ||
    text.includes('ખોલો') ||
    text.includes('ढूंढो');

  const isOverdue =
    text.includes('show overdue') ||
    text.includes('overdue loans') ||
    text.includes('pending loans') ||
    text.includes('alerts') ||
    text.includes('બાકી ખાતા') ||
    text.includes('मुदDAT');

  const isCalculator =
    text.includes('calculate') ||
    text.includes('calculator') ||
    text.includes('how much loan') ||
    text.includes('gold value') ||
    text.includes('ગણતરી') ||
    text.includes('हिसाब');

  const isRateCheck =
    text.includes('gold rate') ||
    text.includes('silver rate') ||
    text.includes('rate today') ||
    text.includes('what is the price') ||
    text.includes('સોનાનો ભાવ') ||
    text.includes('चांदी का भाव');

  if (isAddLoan) {
    result.action = 'ADD_LOAN';
    result.confidence = 0.9;
  } else if (isPayment) {
    result.action = 'RECORD_PAYMENT';
    result.confidence = 0.88;
  } else if (isSearch) {
    result.action = 'SEARCH';
    result.confidence = 0.85;
  } else if (isOverdue) {
    result.action = 'SHOW_OVERDUE';
    result.confidence = 0.85;
  } else if (isRateCheck) {
    result.action = 'UPDATE_RATES';
    result.confidence = 0.85;
  } else if (isCalculator) {
    result.action = 'CALCULATE';
    result.confidence = 0.8;
  } else if (text.length > 3) {
    // If just a name or general input, treat as search or potential loan
    result.action = 'SEARCH';
    result.searchQuery = rawTranscript.trim();
    result.confidence = 0.6;
  }

  // 2. Extract Metal Type
  if (text.includes('silver') || text.includes('chandi') || text.includes('ચાંદી') || text.includes('चांदी')) {
    result.metal = 'SILVER';
  } else if (
    text.includes('gold') ||
    text.includes('sona') ||
    text.includes('સોનું') ||
    text.includes('સોના') ||
    text.includes('सोना') ||
    text.includes('सोने') ||
    text.includes('22k') ||
    text.includes('24k') ||
    text.includes('916')
  ) {
    result.metal = 'GOLD';
  } else {
    // Default to Gold for jewelry store loans
    result.metal = 'GOLD';
  }

  // 3. Extract Ornament / Item Type
  if (text.includes('chain') || text.includes('ચેઇન') || text.includes('चेन') || text.includes('દોરો')) {
    result.itemType = 'CHAIN';
    result.itemDescription = 'Gold Chain';
  } else if (
    text.includes('bangle') ||
    text.includes('bangles') ||
    text.includes('kada') ||
    text.includes('kangan') ||
    text.includes('કાંગણ') ||
    text.includes('કડા') ||
    text.includes('चूड़ी') ||
    text.includes('कंगन')
  ) {
    result.itemType = 'BANGLE';
    result.itemDescription = 'Gold Bangles / Kada Pair';
  } else if (
    text.includes('ring') ||
    text.includes('anguthi') ||
    text.includes('viti') ||
    text.includes('વીંટી') ||
    text.includes('અંગૂઠી') ||
    text.includes('अंगूठी')
  ) {
    result.itemType = 'RING';
    result.itemDescription = 'Ring';
  } else if (
    text.includes('necklace') ||
    text.includes('haar') ||
    text.includes('choker') ||
    text.includes('હાર') ||
    text.includes('हार') ||
    text.includes('सेट')
  ) {
    result.itemType = 'NECKLACE';
    result.itemDescription = 'Necklace Set';
  } else if (
    text.includes('earring') ||
    text.includes('earrings') ||
    text.includes('jhumka') ||
    text.includes('butti') ||
    text.includes('ઝૂમખા') ||
    text.includes('બુટ્ટી') ||
    text.includes('झुमके') ||
    text.includes('बाली')
  ) {
    result.itemType = 'EARRINGS';
    result.itemDescription = 'Earrings / Jhumka';
  } else if (
    text.includes('mangalsutra') ||
    text.includes('tanmaniya') ||
    text.includes('મંગળસૂત્ર') ||
    text.includes('मंगलसूत्र')
  ) {
    result.itemType = 'MANGALSUTRA';
    result.itemDescription = 'Mangalsutra';
  } else if (
    text.includes('coin') ||
    text.includes('ginni') ||
    text.includes('bar') ||
    text.includes('lagdi') ||
    text.includes('સિક્કો') ||
    text.includes('લગડી') ||
    text.includes('सिक्का') ||
    text.includes('पासा')
  ) {
    result.itemType = 'COIN';
    result.itemDescription = 'Coin / Bullion';
  } else if (
    text.includes('thali') ||
    text.includes('utensil') ||
    text.includes('utensils') ||
    text.includes('bartan') ||
    text.includes('vasan') ||
    text.includes('વાસણ') ||
    text.includes('થાલી') ||
    text.includes('बर्तन') ||
    text.includes('थाली')
  ) {
    result.itemType = 'UTENSILS';
    result.itemDescription = 'Silver Utensils Set';
  } else if (
    text.includes('anklet') ||
    text.includes('payal') ||
    text.includes('jhanjhar') ||
    text.includes('ઝાઝર') ||
    text.includes('પાયલ') ||
    text.includes('पायल')
  ) {
    result.itemType = 'ANKLET';
    result.itemDescription = 'Silver Anklet / Payal';
  } else {
    result.itemType = 'OTHER';
    result.itemDescription = result.metal === 'GOLD' ? 'Gold Ornament' : 'Silver Item';
  }

  // 4. Extract Weight (in grams or tola)
  // e.g. "20 gram", "24.5g", "2 tola", "15.2 grams", "20 ग्राम", "૨૦ ગ્રામ"
  const weightMatch = text.match(/(\d+(\.\d+)?)\s*(gram|grams|gm|gms|g|tola|tole|ગ્રામ|તોલા|ग्राम|तोला)/i);
  if (weightMatch) {
    let w = parseFloat(weightMatch[1]);
    const unit = weightMatch[3].toLowerCase();
    if (unit.includes('tola') || unit.includes('તોલા') || unit.includes('तोला')) {
      w = w * 11.664; // standard tola in grams
    }
    result.grossWeight = Math.round(w * 10) / 10;
    result.netWeight = result.grossWeight;
  }

  // 5. Extract Purity
  if (text.includes('24k') || text.includes('24 carat') || text.includes('૨૪ કેરેટ') || text.includes('24 कैरेट') || text.includes('pure')) {
    result.purity = '24K';
  } else if (text.includes('18k') || text.includes('18 carat') || text.includes('૧૮ કેરેટ') || text.includes('18 कैरेट')) {
    result.purity = '18K';
  } else if (text.includes('14k')) {
    result.purity = '14K';
  } else if (result.metal === 'SILVER') {
    if (text.includes('925') || text.includes('sterling') || text.includes('92.5')) {
      result.purity = '92.5 Silver';
    } else {
      result.purity = '999 Fine Silver';
    }
  } else {
    result.purity = '22K (916)';
  }

  // 6. Extract Principal Loan Amount or Payment Amount
  // Matches "50000", "50,000", "50 thousand", "50k", "1.5 lakh", "50000 rupees", "५० हज़ार"
  const amountPatterns = [
    /(?:loan|amount|rs|rupees|inr|રૂપિયા|रुपये|पचास|લાખ|लाख)\s*(?:of|for|is|to)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|thousand|k|lac|rupees|rs|રૂપિયા|रुपये)?/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:thousand|lakh|lac|k|rupees|rs|રૂપિયા|रुपये)/i,
    /(?:पचास|साठ|सत्तर|अस्सी|नब्बे|સો|हज़ार|હજાર|લાખ)\s*(?:रुपये|રૂપિયા)?/i,
  ];

  for (const pat of amountPatterns) {
    const match = text.match(pat);
    if (match) {
      const parsed = parseSpokenNumber(match[0]);
      if (parsed && parsed >= 500) {
        result.amount = parsed;
        break;
      }
    }
  }

  // If no amount found yet, check generic large number > 500
  if (!result.amount) {
    const numberMatches = text.match(/\b\d{4,7}\b/g);
    if (numberMatches && numberMatches.length > 0) {
      result.amount = parseInt(numberMatches[0], 10);
    }
  }

  // 7. Extract Interest Rate
  // e.g. "1.5%", "1.5 percent", "2%", "1.5 taka", "દોઢ ટકા", "डेढ़ प्रतिशत"
  const rateMatch = text.match(/(\d+(\.\d+)?)\s*(%|percent|taka|rate|per month|ટકા|प्रतिशत|टका)/i);
  if (rateMatch) {
    result.interestRate = parseFloat(rateMatch[1]);
  } else if (text.includes('દોઢ ટકા') || text.includes('डेढ़ टका') || text.includes('dedh taka') || text.includes('dodh taka')) {
    result.interestRate = 1.5;
  } else if (text.includes('અઢી ટકા') || text.includes('ढाई टका') || text.includes('dhai taka')) {
    result.interestRate = 2.5;
  } else if (text.includes('બે ટકા') || text.includes('दो टका') || text.includes('two percent')) {
    result.interestRate = 2.0;
  } else if (result.action === 'ADD_LOAN') {
    result.interestRate = 1.5; // default 1.5%
  }

  // 8. Extract Customer Name
  // Common name patterns: "for Ramesh Patel", "to Ramesh", "customer Ramesh", "રમેશભાઈ માટે", "सुरेश कुमार"
  const namePatterns = [
    /(?:for|to|customer|name|naam|ગ્રાહક|નામ)\s+([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+(?:\s+[A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)?)/i,
    /([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+(?:\s+[A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)?)\s+(?:ne|ko|bhai|ben|kumar|patel|shah|sharma|singh|mehta|soni|joshi|માટે|ને|કા|કે)/i,
  ];

  for (const pat of namePatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Filter out keywords
      const ignored = ['gold', 'silver', 'loan', 'chain', 'bangle', 'rupees', 'gram', 'percent', 'girvi', 'sohna', 'chandi', 'add', 'new'];
      if (!ignored.includes(candidate.toLowerCase()) && candidate.length > 2) {
        // Capitalize words
        result.customerName = candidate
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        break;
      }
    }
  }

  // 9. Extract Phone number
  const phoneMatch = text.match(/(?:\+91|0)?[6-9]\d{9}/);
  if (phoneMatch) {
    result.customerPhone = phoneMatch[0];
  }

  // 10. Generate Human-friendly Interpretation
  if (result.action === 'ADD_LOAN') {
    const cust = result.customerName || 'Customer';
    const amt = result.amount ? `₹${result.amount.toLocaleString('en-IN')}` : 'Loan';
    const wt = result.grossWeight ? `${result.grossWeight}g` : '';
    const item = result.itemDescription || 'Jewelry';
    const rate = result.interestRate ? `@ ${result.interestRate}%/mo` : '';
    result.interpretedText = `Creating loan for ${cust} of ${amt} on ${wt} ${item} ${rate}`;
  } else if (result.action === 'RECORD_PAYMENT') {
    const cust = result.customerName || 'Customer';
    const amt = result.amount ? `₹${result.amount.toLocaleString('en-IN')}` : 'Payment';
    result.interpretedText = `Recording interest payment of ${amt} for ${cust}`;
  } else if (result.action === 'SEARCH') {
    result.searchQuery = result.customerName || rawTranscript.trim();
    result.interpretedText = `Searching for "${result.searchQuery}"`;
  } else if (result.action === 'SHOW_OVERDUE') {
    result.interpretedText = 'Showing overdue and alert loan accounts';
  } else if (result.action === 'UPDATE_RATES') {
    result.interpretedText = 'Checking today\'s live gold and silver rates';
  } else if (result.action === 'CALCULATE') {
    result.interpretedText = 'Opening gold loan & collateral calculator';
  } else {
    result.interpretedText = `Understood: "${rawTranscript}"`;
  }

  return result;
}
