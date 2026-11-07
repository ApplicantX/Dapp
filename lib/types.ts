export type MetalType = 'Gold' | 'Silver';

export type LoanStatus = 'ACTIVE' | 'CLOSED';

export interface Ornament {
  id: string;
  metal: MetalType;
  category: string; // e.g. "Kandora", "Kada", "Ring", "Chain", "Necklace", "Mangalsutra", "Earrings", "Anklet", "Utensils", etc.
  weight: number;   // weight in grams (supports decimals)
  quantity: number; // quantity count (e.g. 1, 2)
  description?: string;
}

export interface LoanPayment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // Total amount paid in INR
  interestAmount?: number; // Interest portion considered (વ્યાજ પેટે)
  principalAmount?: number; // Principal reduction portion (મુદ્દલ પેટે)
  notes?: string;
  createdAt: string;
}

export interface LoanTopUp {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // Additional loan amount in INR (વધારાનો ઉપાડ)
  notes?: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  customerId: string;
  loanDate: string; // YYYY-MM-DD
  loanAmount: number; // Initial Principal in INR
  status: LoanStatus;
  ornaments: Ornament[];
  payments?: LoanPayment[]; // Partial repayments made by customer
  topUps?: LoanTopUp[]; // Additional loan amounts taken on same jewelry (વધારાનો ઉપાડ)
  closedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;      // required
  village: string;   // required
  diary: string;     // required
  pageNumber: string;// required
  mobile?: string;   // optional
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE_CUSTOMER' | 'EDIT_CUSTOMER' | 'ADD_LOAN' | 'EDIT_LOAN' | 'CLOSE_LOAN' | 'DELETE_LOAN' | 'MOVE_DIARY_PAGE' | 'BULK_IMPORT' | 'AUTH_LOGIN' | 'REVOKE_DEVICE' | 'ADD_PAYMENT' | 'DELETE_PAYMENT' | 'ADD_TOPUP' | 'DELETE_TOPUP';
  customerName: string;
  village: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface AppData {
  customers: Customer[];
  loans: Loan[];
  activityLogs: ActivityLog[];
  villages: string[];
  ornamentCategories: string[];
  diaries: string[];
  defaultAnnualInterestRate: number;
}

export interface ParsedCustomerVoice {
  name: string;
  village: string;
  diary: string;
  pageNumber: string;
  mobile?: string;
  confidence?: number;
  rawText?: string;
}

export interface ParsedLoanVoice {
  loanAmount: number;
  loanDate: string;
  ornaments: {
    metal: MetalType;
    category: string;
    weight: number;
    quantity: number;
  }[];
  rawText: string;
}

export interface CalculatorItem {
  id: string;
  principal: number | '';
  years: number | '';
  months: number | '';
  startDate?: string;
  endDate?: string;
  annualRate: number;
  yearsElapsed: number;
  interestAmount: number;
  totalAmount: number;
}

export interface BulkCustomerLoanRecord {
  id: string;
  name: string;
  village: string;
  diary: string;
  pageNumber: string;
  mobile?: string;
  loanAmount: number;
  metal: MetalType;
  category: string;
  weight: number;
  quantity: number;
  notes?: string;
  rawSpeech: string;
  status: 'VALID' | 'WARNING';
  warningMessage?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: 'Family Admin' | 'Family Member';
  signedInAt: string;
  deviceInfo?: string;
}

export interface DeviceAccessRecord {
  id: string;
  userEmail: string;
  userName: string;
  deviceName: string;
  lastActive: string;
  isRevoked: boolean;
}
