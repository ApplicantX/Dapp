import { CollateralItem, LoanAccount, MarketRates, PaymentRecord, StoreSettings } from './types';
import { initialMarketRates, initialStoreSettings, sampleLoans } from './sampleData';

const LOANS_STORAGE_KEY = 'dapp_loans_data_v1';
const RATES_STORAGE_KEY = 'dapp_rates_data_v1';
const SETTINGS_STORAGE_KEY = 'dapp_settings_data_v1';

export function getStoredLoans(): LoanAccount[] {
  if (typeof window === 'undefined') return sampleLoans;
  try {
    const raw = localStorage.getItem(LOANS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(sampleLoans));
      return sampleLoans;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading loans from storage:', err);
    return sampleLoans;
  }
}

export function saveLoans(loans: LoanAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
  } catch (err) {
    console.error('Error saving loans to storage:', err);
  }
}

export function getStoredRates(): MarketRates {
  if (typeof window === 'undefined') return initialMarketRates;
  try {
    const raw = localStorage.getItem(RATES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(initialMarketRates));
      return initialMarketRates;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading rates from storage:', err);
    return initialMarketRates;
  }
}

export function saveRates(rates: MarketRates): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
  } catch (err) {
    console.error('Error saving rates to storage:', err);
  }
}

export function getStoredSettings(): StoreSettings {
  if (typeof window === 'undefined') return initialStoreSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(initialStoreSettings));
      return initialStoreSettings;
    }
    return { ...initialStoreSettings, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error reading settings from storage:', err);
    return initialStoreSettings;
  }
}

export function saveSettings(settings: StoreSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to storage:', err);
  }
}

export function generateNextLoanNumber(existingLoans: LoanAccount[]): string {
  const numbers = existingLoans
    .map(l => {
      const match = l.loanNumber.match(/\d+/);
      return match ? parseInt(match[0], 10) : 1000;
    })
    .filter(n => !isNaN(n));
  const max = numbers.length > 0 ? Math.max(...numbers) : 1000;
  return `G-${max + 1}`;
}

export function calculateEstimatedValue(
  metal: 'GOLD' | 'SILVER',
  netWeight: number,
  purity: string,
  rates: MarketRates
): number {
  if (metal === 'GOLD') {
    let ratePerGram = rates.gold22kPer10g / 10;
    if (purity.includes('24')) {
      ratePerGram = rates.gold24kPer10g / 10;
    } else if (purity.includes('18')) {
      ratePerGram = rates.gold18kPer10g / 10;
    } else if (purity.includes('14')) {
      ratePerGram = (rates.gold24kPer10g / 10) * (14 / 24);
    }
    return Math.round(netWeight * ratePerGram);
  } else {
    // Silver (per kg)
    const ratePerGram = rates.silverPerKg / 1000;
    let purityFactor = 1.0;
    if (purity.includes('925') || purity.includes('92.5')) {
      purityFactor = 0.925;
    } else if (purity.includes('800') || purity.includes('80')) {
      purityFactor = 0.8;
    }
    return Math.round(netWeight * ratePerGram * purityFactor);
  }
}

export function calculateAccruedInterest(loan: LoanAccount): {
  daysElapsed: number;
  monthsElapsed: number;
  monthlyInterestAmount: number;
  totalInterestDue: number;
  totalPaidInterest: number;
  netPendingInterest: number;
  currentTotalPayable: number;
} {
  const start = new Date(loan.startDate).getTime();
  const now = loan.status === 'SETTLED' && loan.settledDate 
    ? new Date(loan.settledDate).getTime() 
    : new Date().getTime();
  
  const diffDays = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  // Standard Indian jewelry loan calculation: 30 days = 1 month (or exact day fraction)
  const monthsElapsed = Math.max(1, Math.ceil(diffDays / 30));
  const monthlyInterestAmount = Math.round(loan.principalAmount * (loan.monthlyInterestRate / 100));
  const totalInterestDue = monthlyInterestAmount * monthsElapsed;

  const totalPaidInterest = loan.payments
    .filter(p => p.type === 'INTEREST')
    .reduce((sum, p) => sum + p.amount, 0);

  const principalRepaid = loan.payments
    .filter(p => p.type === 'PRINCIPAL')
    .reduce((sum, p) => sum + p.amount, 0);

  const currentPrincipal = Math.max(0, loan.principalAmount - principalRepaid);
  const netPendingInterest = Math.max(0, totalInterestDue - totalPaidInterest);
  const currentTotalPayable = currentPrincipal + netPendingInterest;

  return {
    daysElapsed: diffDays,
    monthsElapsed,
    monthlyInterestAmount,
    totalInterestDue,
    totalPaidInterest,
    netPendingInterest,
    currentTotalPayable,
  };
}

export function exportDatabaseBackup(): string {
  const data = {
    loans: getStoredLoans(),
    rates: getStoredRates(),
    settings: getStoredSettings(),
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };
  return JSON.stringify(data, null, 2);
}

export function importDatabaseBackup(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.loans && Array.isArray(parsed.loans)) {
      saveLoans(parsed.loans);
    }
    if (parsed.rates) {
      saveRates(parsed.rates);
    }
    if (parsed.settings) {
      saveSettings(parsed.settings);
    }
    return true;
  } catch (err) {
    console.error('Failed to import backup:', err);
    return false;
  }
}
