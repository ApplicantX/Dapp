export type MetalType = 'GOLD' | 'SILVER';

export type OrnamentType =
  | 'CHAIN'
  | 'BANGLE'
  | 'RING'
  | 'NECKLACE'
  | 'EARRINGS'
  | 'COIN'
  | 'BAR'
  | 'MANGALSUTRA'
  | 'ANKLET'
  | 'UTENSILS'
  | 'BRACELET'
  | 'OTHER';

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'SETTLED' | 'AUCTIONED';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  type: 'INTEREST' | 'PRINCIPAL' | 'SETTLEMENT';
  notes?: string;
  receiptNumber?: string;
}

export interface CollateralItem {
  id: string;
  metal: MetalType;
  itemType: OrnamentType;
  description: string;
  grossWeight: number; // in grams
  netWeight: number;   // in grams
  purity: string;      // e.g. "22K (916)", "24K", "18K", "92.5 Silver"
  estimatedValue: number; // in INR
  photoUrl?: string;
}

export interface LoanAccount {
  id: string;
  loanNumber: string; // e.g. "G-1001"
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerIdProof?: string;
  collateral: CollateralItem[];
  principalAmount: number; // in INR
  monthlyInterestRate: number; // % per month (e.g. 1.5%)
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  status: LoanStatus;
  payments: PaymentRecord[];
  settledDate?: string;
  settledAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketRates {
  gold24kPer10g: number; // e.g. 74500
  gold22kPer10g: number; // e.g. 68300
  gold18kPer10g: number; // e.g. 55800
  silverPerKg: number;   // e.g. 88000
  lastUpdated: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  ownerName: string;
  phone: string;
  address: string;
  gstNumber?: string;
  licenseNumber?: string;
  defaultInterestRate: number; // default 1.5%
  safeLTVPercentage: number;   // default 75%
  currencySymbol: string;      // "₹"
  language: 'en' | 'hi' | 'gu';
  groqApiKey?: string;
  openaiApiKey?: string;
  speechService: 'whisper_api' | 'browser_speech' | 'auto';
  voiceFeedbackEnabled: boolean;
}

export type VoiceAction =
  | 'ADD_LOAN'
  | 'RECORD_PAYMENT'
  | 'SEARCH'
  | 'SHOW_ACTIVE'
  | 'SHOW_OVERDUE'
  | 'SHOW_SETTLED'
  | 'UPDATE_RATES'
  | 'CALCULATE'
  | 'VIEW_LOAN'
  | 'HELP'
  | 'UNKNOWN';

export interface VoiceParseResult {
  action: VoiceAction;
  customerName?: string;
  customerPhone?: string;
  metal?: MetalType;
  itemType?: OrnamentType;
  itemDescription?: string;
  grossWeight?: number;
  netWeight?: number;
  purity?: string;
  amount?: number;
  interestRate?: number;
  paymentType?: 'INTEREST' | 'PRINCIPAL' | 'SETTLEMENT';
  searchQuery?: string;
  confidence: number;
  rawTranscript: string;
  interpretedText: string;
}
