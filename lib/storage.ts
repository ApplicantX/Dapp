import { AppData, Customer, Loan, LoanPayment, LoanTopUp, ActivityLog, Ornament, LoanStatus, BulkCustomerLoanRecord } from './types';
import { initialAppData } from './sampleData';
import {
  syncCustomerToSupabase,
  syncLoanToSupabase,
  syncPaymentToSupabase,
  syncDeletePaymentFromSupabase,
  syncTopUpToSupabase,
  syncDeleteTopUpFromSupabase,
  syncCloseLoanToSupabase,
  syncActivityLogToSupabase,
  syncBulkCommitToSupabase,
} from './supabaseSync';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'dahod_jewellery_lending_data_v2';

// Unified helper to calculate total borrowed, principal repaid, interest repaid, and remaining principal
export function getLoanPrincipalDetails(loan: Loan) {
  const initialPrincipal = Number(loan.loanAmount) || 0;
  const totalTopUps = (loan.topUps || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalBorrowed = initialPrincipal + totalTopUps;

  const totalRepaid = (loan.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalInterestRepaid = (loan.payments || []).reduce((sum, p) => {
    return sum + (Number(p.interestAmount) || 0);
  }, 0);

  const totalPrincipalRepaid = (loan.payments || []).reduce((sum, p) => {
    if (typeof p.principalAmount === 'number') {
      return sum + p.principalAmount;
    }
    if (typeof p.interestAmount === 'number') {
      return sum + Math.max(0, (Number(p.amount) || 0) - p.interestAmount);
    }
    return sum + (Number(p.amount) || 0);
  }, 0);

  const remainingPrincipal = Math.max(0, totalBorrowed - totalPrincipalRepaid);

  return {
    initialPrincipal,
    totalTopUps,
    totalBorrowed,
    totalRepaid,
    totalInterestRepaid,
    totalPrincipalRepaid,
    remainingPrincipal,
  };
}

export function resetToSampleData(): AppData {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAppData));
    } catch (e) {
      console.warn('Failed to reset storage:', e);
    }
  }
  return initialAppData;
}

export function getStoredData(): AppData {
  if (typeof window === 'undefined') return initialAppData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAppData));
      } catch (e) {}
      return initialAppData;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return initialAppData;
    }

    // Sanitize customers to prevent any missing field crashes
    const rawCustomers = Array.isArray(parsed.customers) ? parsed.customers : initialAppData.customers;
    const sanitizedCustomers: Customer[] = rawCustomers
      .filter((c: any) => c && typeof c === 'object')
      .map((c: any, idx: number) => ({
        id: String(c.id || `cust-saved-${idx}`),
        name: String(c.name || 'Customer'),
        village: String(c.village || 'Dahod'),
        diary: String(c.diary || 'Diary 2026'),
        pageNumber: String(c.pageNumber || `${idx + 1}`),
        mobile: c.mobile ? String(c.mobile) : undefined,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      }));

    // Sanitize loans to ensure ornaments array and numeric values exist
    const rawLoans = Array.isArray(parsed.loans) ? parsed.loans : initialAppData.loans;
    const sanitizedLoans: Loan[] = rawLoans
      .filter((l: any) => l && typeof l === 'object')
      .map((l: any, idx: number) => ({
        id: String(l.id || `loan-saved-${idx}`),
        customerId: String(l.customerId || ''),
        loanDate: String(l.loanDate || new Date().toISOString().split('T')[0]),
        loanAmount: Number(l.loanAmount) || 0,
        status: (l.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE') as LoanStatus,
        closedDate: l.closedDate ? String(l.closedDate) : undefined,
        ornaments: Array.isArray(l.ornaments)
          ? l.ornaments
              .filter((o: any) => o && typeof o === 'object')
              .map((o: any, oIdx: number) => ({
                id: String(o.id || `orn-${idx}-${oIdx}`),
                metal: (o.metal === 'Gold' ? 'Gold' : 'Silver') as Ornament['metal'],
                category: String(o.category || 'Ornaments'),
                weight: Number(o.weight) || 0,
                quantity: Number(o.quantity) || 1,
                description: o.description ? String(o.description) : undefined,
              }))
          : [],
        payments: Array.isArray(l.payments)
          ? l.payments
              .filter((p: any) => p && typeof p === 'object')
              .map((p: any, pIdx: number) => {
                const amt = Number(p.amount) || 0;
                const intAmt = typeof p.interestAmount === 'number' ? p.interestAmount : undefined;
                const princAmt = typeof p.principalAmount === 'number'
                  ? p.principalAmount
                  : intAmt !== undefined
                  ? Math.max(0, amt - intAmt)
                  : amt;
                return {
                  id: String(p.id || `pay-${idx}-${pIdx}`),
                  date: String(p.date || new Date().toISOString().split('T')[0]),
                  amount: amt,
                  interestAmount: intAmt,
                  principalAmount: princAmt,
                  notes: p.notes ? String(p.notes) : undefined,
                  createdAt: p.createdAt || new Date().toISOString(),
                };
              })
          : [],
        topUps: Array.isArray(l.topUps)
          ? l.topUps
              .filter((t: any) => t && typeof t === 'object')
              .map((t: any, tIdx: number) => ({
                id: String(t.id || `topup-${idx}-${tIdx}`),
                date: String(t.date || new Date().toISOString().split('T')[0]),
                amount: Number(t.amount) || 0,
                notes: t.notes ? String(t.notes) : undefined,
                createdAt: t.createdAt || new Date().toISOString(),
              }))
          : [],
        notes: l.notes ? String(l.notes) : undefined,
        createdAt: l.createdAt || new Date().toISOString(),
        updatedAt: l.updatedAt || new Date().toISOString(),
      }));

    const rawLogs = Array.isArray(parsed.activityLogs) ? parsed.activityLogs : initialAppData.activityLogs;
    const sanitizedLogs: ActivityLog[] = rawLogs
      .filter((log: any) => log && typeof log === 'object')
      .map((log: any, idx: number) => ({
        id: String(log.id || `act-saved-${idx}`),
        timestamp: String(log.timestamp || new Date().toISOString()),
        user: String(log.user || 'Family Admin'),
        action: log.action || 'ADD_LOAN',
        customerName: String(log.customerName || 'Customer'),
        village: String(log.village || 'Dahod'),
        details: String(log.details || ''),
      }));

    return {
      customers: sanitizedCustomers.length > 0 ? sanitizedCustomers : initialAppData.customers,
      loans: sanitizedLoans,
      activityLogs: sanitizedLogs,
      villages: Array.isArray(parsed.villages) && parsed.villages.length > 0 ? parsed.villages : initialAppData.villages,
      ornamentCategories: Array.isArray(parsed.ornamentCategories) && parsed.ornamentCategories.length > 0 ? parsed.ornamentCategories : initialAppData.ornamentCategories,
      diaries: Array.isArray(parsed.diaries) && parsed.diaries.length > 0 ? parsed.diaries : initialAppData.diaries,
      defaultAnnualInterestRate: Number(parsed.defaultAnnualInterestRate) || 18.0,
    };
  } catch (err) {
    console.error('Error reading data from storage, recovering with default data:', err);
    return initialAppData;
  }
}

export function saveStoredData(data: AppData): void {
  // Disabled: all entries are stored exclusively in Supabase PostgreSQL
  return;
}

// Log an action to Activity History
export function recordActivity(
  data: AppData,
  action: ActivityLog['action'],
  customerName: string,
  village: string,
  details: string,
  user: string = 'Family Admin'
): AppData {
  const newLog: ActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    user,
    action,
    customerName,
    village,
    details,
  };
  const updatedLogs = [newLog, ...data.activityLogs];
  const updatedData = { ...data, activityLogs: updatedLogs };
  saveStoredData(updatedData);
  syncActivityLogToSupabase(newLog);
  return updatedData;
}

// Add a single Customer
export function addCustomer(data: AppData, customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): { data: AppData; newCustomer: Customer } {
  const newCustomer: Customer = {
    ...customer,
    id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedCustomers = [newCustomer, ...data.customers];
  let updatedData: AppData = { ...data, customers: updatedCustomers };

  if (!updatedData.villages.includes(customer.village)) {
    updatedData.villages = [...updatedData.villages, customer.village];
  }
  if (!updatedData.diaries.includes(customer.diary)) {
    updatedData.diaries = [...updatedData.diaries, customer.diary];
  }

  updatedData = recordActivity(
    updatedData,
    'CREATE_CUSTOMER',
    customer.name,
    customer.village,
    `Added new customer in ${customer.diary}, Page ${customer.pageNumber}`
  );

  syncCustomerToSupabase(newCustomer);
  return { data: updatedData, newCustomer };
}

// Add multiple Customers in batch
export function addBatchCustomers(data: AppData, newCustomersList: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>[]): AppData {
  const created = newCustomersList.map((c) => ({
    ...c,
    id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const updatedCustomers = [...created, ...data.customers];
  let updatedData: AppData = { ...data, customers: updatedCustomers };

  const villageSet = new Set(updatedData.villages);
  const diarySet = new Set(updatedData.diaries);
  newCustomersList.forEach((c) => {
    if (c.village) villageSet.add(c.village);
    if (c.diary) diarySet.add(c.diary);
  });
  updatedData.villages = Array.from(villageSet);
  updatedData.diaries = Array.from(diarySet);

  updatedData = recordActivity(
    updatedData,
    'CREATE_CUSTOMER',
    `Batch of ${created.length} Customers`,
    'Various',
    `Created ${created.length} customers in bulk voice entry`
  );

  return updatedData;
}

// Update Customer
export function updateCustomer(data: AppData, customerId: string, updates: Partial<Customer>): AppData {
  const existing = data.customers.find((c) => c.id === customerId);
  if (!existing) return data;

  const isDiaryMove = (updates.diary && updates.diary !== existing.diary) || (updates.pageNumber && updates.pageNumber !== existing.pageNumber);

  const updatedCustomers = data.customers.map((c) => {
    if (c.id === customerId) {
      return {
        ...c,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }
    return c;
  });

  let updatedData: AppData = { ...data, customers: updatedCustomers };

  if (isDiaryMove) {
    updatedData = recordActivity(
      updatedData,
      'MOVE_DIARY_PAGE',
      existing.name,
      existing.village,
      `Moved account from ${existing.diary} Page ${existing.pageNumber} to ${updates.diary || existing.diary} Page ${updates.pageNumber || existing.pageNumber}`
    );
  } else {
    updatedData = recordActivity(
      updatedData,
      'EDIT_CUSTOMER',
      existing.name,
      existing.village,
      `Updated customer details`
    );
  }

  const updatedCustomer = updatedCustomers.find((c) => c.id === customerId);
  if (updatedCustomer) syncCustomerToSupabase(updatedCustomer);

  return updatedData;
}

// Add a Loan
export function addLoan(
  data: AppData,
  customerId: string,
  loanData: { loanDate: string; loanAmount: number; ornaments: Ornament[]; notes?: string }
): AppData {
  const customer = data.customers.find((c) => c.id === customerId);
  if (!customer) return data;

  const newLoan: Loan = {
    id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    customerId,
    loanDate: loanData.loanDate,
    loanAmount: Number(loanData.loanAmount),
    status: 'ACTIVE',
    ornaments: loanData.ornaments,
    notes: loanData.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedLoans = [newLoan, ...data.loans];
  let updatedData: AppData = { ...data, loans: updatedLoans };

  const ornamentSummary = loanData.ornaments
    .map((o) => `${o.quantity}x ${o.weight}g ${o.metal} ${o.category}`)
    .join(', ');

  updatedData = recordActivity(
    updatedData,
    'ADD_LOAN',
    customer.name,
    customer.village,
    `Added Active Loan of ₹${loanData.loanAmount.toLocaleString('en-IN')} with ornaments: [${ornamentSummary}] on ${loanData.loanDate}`
  );

  syncLoanToSupabase(newLoan);
  return updatedData;
}

// Close a Loan
export function closeLoan(data: AppData, loanId: string): AppData {
  const loan = data.loans.find((l) => l.id === loanId);
  if (!loan) return data;
  const customer = data.customers.find((c) => c.id === loan.customerId);

  const closedDate = new Date().toISOString().split('T')[0];

  const updatedLoans = data.loans.map((l) => {
    if (l.id === loanId) {
      return {
        ...l,
        status: 'CLOSED' as LoanStatus,
        closedDate,
        updatedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  let updatedData: AppData = { ...data, loans: updatedLoans };

  const ornamentSummary = loan.ornaments
    .map((o) => `${o.quantity}x ${o.weight}g ${o.metal} ${o.category}`)
    .join(', ');

  updatedData = recordActivity(
    updatedData,
    'CLOSE_LOAN',
    customer ? customer.name : 'Customer',
    customer ? customer.village : 'Dahod',
    `Closed Loan of ₹${loan.loanAmount.toLocaleString('en-IN')}. Collateral released: [${ornamentSummary}] on ${closedDate}`
  );

  syncCloseLoanToSupabase(loanId, closedDate);
  return updatedData;
}

// Add a Partial Payment to a Loan (with Interest vs Principal breakdown)
export function addPaymentToLoan(
  data: AppData,
  loanId: string,
  paymentData: { date: string; amount: number; interestAmount?: number; notes?: string }
): AppData {
  const loan = data.loans.find((l) => l.id === loanId);
  if (!loan) return data;
  const customer = data.customers.find((c) => c.id === loan.customerId);

  const amount = Number(paymentData.amount) || 0;
  const interestAmount = Math.max(0, Number(paymentData.interestAmount) || 0);
  const principalAmount = Math.max(0, amount - interestAmount);

  const newPayment: LoanPayment = {
    id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: paymentData.date || new Date().toISOString().split('T')[0],
    amount,
    interestAmount,
    principalAmount,
    notes: paymentData.notes ? paymentData.notes.trim() : undefined,
    createdAt: new Date().toISOString(),
  };

  const updatedLoans = data.loans.map((l) => {
    if (l.id === loanId) {
      const existingPayments = Array.isArray(l.payments) ? l.payments : [];
      return {
        ...l,
        payments: [...existingPayments, newPayment],
        updatedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  let updatedData: AppData = { ...data, loans: updatedLoans };
  const updatedLoan = updatedLoans.find((l) => l.id === loanId)!;
  const { remainingPrincipal } = getLoanPrincipalDetails(updatedLoan);

  updatedData = recordActivity(
    updatedData,
    'ADD_PAYMENT',
    customer ? customer.name : 'Customer',
    customer ? customer.village : 'Dahod',
    `Recorded payment of ₹${amount.toLocaleString('en-IN')} on ${newPayment.date} (Interest: ₹${interestAmount.toLocaleString('en-IN')}, Principal reduction: ₹${principalAmount.toLocaleString('en-IN')}). Remaining Principal: ₹${remainingPrincipal.toLocaleString('en-IN')}`
  );

  saveStoredData(updatedData);
  syncPaymentToSupabase(loanId, newPayment);
  return updatedData;
}

// Delete a Partial Payment from a Loan
export function deletePaymentFromLoan(
  data: AppData,
  loanId: string,
  paymentId: string
): AppData {
  const loan = data.loans.find((l) => l.id === loanId);
  if (!loan) return data;
  const customer = data.customers.find((c) => c.id === loan.customerId);
  const targetPayment = (loan.payments || []).find((p) => p.id === paymentId);

  const updatedLoans = data.loans.map((l) => {
    if (l.id === loanId) {
      return {
        ...l,
        payments: (l.payments || []).filter((p) => p.id !== paymentId),
        updatedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  let updatedData: AppData = { ...data, loans: updatedLoans };

  if (targetPayment) {
    updatedData = recordActivity(
      updatedData,
      'DELETE_PAYMENT',
      customer ? customer.name : 'Customer',
      customer ? customer.village : 'Dahod',
      `Removed repayment entry of ₹${targetPayment.amount.toLocaleString('en-IN')} dated ${targetPayment.date}`
    );
  }

  saveStoredData(updatedData);
  syncDeletePaymentFromSupabase(paymentId);
  return updatedData;
}

// Add a Top-Up / Additional Loan on the same jewelry collateral (વધારાનો ઉપાડ)
export function addTopUpToLoan(
  data: AppData,
  loanId: string,
  topUpData: { date: string; amount: number; notes?: string }
): AppData {
  const loan = data.loans.find((l) => l.id === loanId);
  if (!loan) return data;
  const customer = data.customers.find((c) => c.id === loan.customerId);

  const amount = Number(topUpData.amount) || 0;

  const newTopUp: LoanTopUp = {
    id: `topup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: topUpData.date || new Date().toISOString().split('T')[0],
    amount,
    notes: topUpData.notes ? topUpData.notes.trim() : undefined,
    createdAt: new Date().toISOString(),
  };

  const updatedLoans = data.loans.map((l) => {
    if (l.id === loanId) {
      const existingTopUps = Array.isArray(l.topUps) ? l.topUps : [];
      return {
        ...l,
        topUps: [...existingTopUps, newTopUp],
        updatedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  let updatedData: AppData = { ...data, loans: updatedLoans };
  const updatedLoan = updatedLoans.find((l) => l.id === loanId)!;
  const { totalBorrowed, remainingPrincipal } = getLoanPrincipalDetails(updatedLoan);

  updatedData = recordActivity(
    updatedData,
    'ADD_TOPUP',
    customer ? customer.name : 'Customer',
    customer ? customer.village : 'Dahod',
    `Added Top-Up Loan of ₹${amount.toLocaleString('en-IN')} on ${newTopUp.date} on existing collateral. Total Borrowed: ₹${totalBorrowed.toLocaleString('en-IN')}, Remaining Principal: ₹${remainingPrincipal.toLocaleString('en-IN')}`
  );

  saveStoredData(updatedData);
  syncTopUpToSupabase(loanId, newTopUp);
  return updatedData;
}

// Delete a Top-Up from a Loan
export function deleteTopUpFromLoan(
  data: AppData,
  loanId: string,
  topUpId: string
): AppData {
  const loan = data.loans.find((l) => l.id === loanId);
  if (!loan) return data;
  const customer = data.customers.find((c) => c.id === loan.customerId);
  const targetTopUp = (loan.topUps || []).find((t) => t.id === topUpId);

  const updatedLoans = data.loans.map((l) => {
    if (l.id === loanId) {
      return {
        ...l,
        topUps: (l.topUps || []).filter((t) => t.id !== topUpId),
        updatedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  let updatedData: AppData = { ...data, loans: updatedLoans };

  if (targetTopUp) {
    updatedData = recordActivity(
      updatedData,
      'DELETE_TOPUP',
      customer ? customer.name : 'Customer',
      customer ? customer.village : 'Dahod',
      `Removed top-up loan entry of ₹${targetTopUp.amount.toLocaleString('en-IN')} dated ${targetTopUp.date}`
    );
  }

  saveStoredData(updatedData);
  syncDeleteTopUpFromSupabase(topUpId);
  return updatedData;
}

// Export All Data to Multi-Sheet Excel (.xlsx)
export function exportToExcel(data: AppData): void {
  const wb = XLSX.utils.book_new();

  const customerRows = data.customers.map((c) => ({
    'Customer Name': c.name,
    'Village': c.village,
    'Mobile Number': c.mobile || 'N/A',
    'Diary': c.diary,
    'Page Number': c.pageNumber,
    'Created Date': c.createdAt ? c.createdAt.split('T')[0] : '',
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

  const loanRows = data.loans.map((l) => {
    const cust = data.customers.find((c) => c.id === l.customerId);
    const details = getLoanPrincipalDetails(l);
    return {
      'Customer Name': cust ? cust.name : 'Unknown',
      'Village': cust ? cust.village : 'Unknown',
      'Diary / Page': cust ? `${cust.diary} p.${cust.pageNumber}` : '',
      'Loan Date': l.loanDate,
      'Initial Principal (INR)': details.initialPrincipal,
      'Total Top-Ups (INR)': details.totalTopUps,
      'Total Borrowed (INR)': details.totalBorrowed,
      'Interest Paid (INR)': details.totalInterestRepaid,
      'Principal Repaid (INR)': details.totalPrincipalRepaid,
      'Total Paid (INR)': details.totalRepaid,
      'Remaining Principal (INR)': details.remainingPrincipal,
      'Status': l.status,
      'Closed Date': l.closedDate || '',
      'Top-Ups Count': (l.topUps || []).length,
      'Repayments Count': (l.payments || []).length,
      'Ornaments Count': l.ornaments.length,
      'Notes': l.notes || '',
    };
  });
  const wsLoans = XLSX.utils.json_to_sheet(loanRows);
  XLSX.utils.book_append_sheet(wb, wsLoans, 'Loans');

  const ornamentRows: any[] = [];
  data.loans.forEach((l) => {
    const cust = data.customers.find((c) => c.id === l.customerId);
    l.ornaments.forEach((o) => {
      ornamentRows.push({
        'Customer Name': cust ? cust.name : 'Unknown',
        'Village': cust ? cust.village : 'Unknown',
        'Loan Date': l.loanDate,
        'Loan Amount': l.loanAmount,
        'Loan Status': l.status,
        'Metal': o.metal,
        'Category': o.category,
        'Weight (Grams)': o.weight,
        'Quantity': o.quantity,
        'Description': o.description || '',
      });
    });
  });
  const wsOrnaments = XLSX.utils.json_to_sheet(ornamentRows);
  XLSX.utils.book_append_sheet(wb, wsOrnaments, 'Ornaments');

  const activityRows = data.activityLogs.map((a) => ({
    'Date / Time': new Date(a.timestamp).toLocaleString('en-IN'),
    'User': a.user,
    'Action': a.action,
    'Customer Name': a.customerName,
    'Village': a.village,
    'Details': a.details,
  }));
  const wsActivity = XLSX.utils.json_to_sheet(activityRows);
  XLSX.utils.book_append_sheet(wb, wsActivity, 'Activity History');

  const filename = `Dahod_Jewellery_Lending_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Dedicated 500+ Bulk Voice Records to Excel Export (.xlsx)
export function exportBulkRecordsToExcel(records: BulkCustomerLoanRecord[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Master Captured Records
  const rows = records.map((r, index) => ({
    '#': index + 1,
    'Customer Name': r.name,
    'Village (ગામ)': r.village,
    'Diary Reference': r.diary,
    'Page Number': r.pageNumber,
    'Mobile Number': r.mobile || '',
    'Loan Amount (₹)': r.loanAmount,
    'Metal': r.metal,
    'Ornament Category': r.category,
    'Weight (Grams)': r.weight,
    'Quantity': r.quantity,
    'Status': r.status,
    'Warnings': r.warningMessage || 'None',
    'Raw Spoken Statement': r.rawSpeech,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto column widths
  ws['!cols'] = [
    { wch: 4 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 15 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Captured Customer Records');

  // Sheet 2: Summary Stats
  const totalPrincipal = records.reduce((sum, r) => sum + r.loanAmount, 0);
  const totalGoldGrams = records.filter((r) => r.metal === 'Gold').reduce((sum, r) => sum + r.weight, 0);
  const totalSilverGrams = records.filter((r) => r.metal === 'Silver').reduce((sum, r) => sum + r.weight, 0);

  const summaryRows = [
    { 'Summary Metric': 'Total Customer Entries', 'Value': records.length },
    { 'Summary Metric': 'Total Loan Principal (₹)', 'Value': totalPrincipal },
    { 'Summary Metric': 'Total Pledged Gold (Grams)', 'Value': totalGoldGrams.toFixed(1) },
    { 'Summary Metric': 'Total Pledged Silver (Grams)', 'Value': totalSilverGrams.toFixed(1) },
    { 'Summary Metric': 'Export Timestamp', 'Value': new Date().toLocaleString('en-IN') },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Stats');

  const filename = `Dahod_Voice_Bulk_Import_${records.length}_Customers_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Commit Bulk Voice Records directly to App Database
export function commitBulkRecordsToDatabase(data: AppData, records: BulkCustomerLoanRecord[]): AppData {
  let updatedData = { ...data };
  const today = new Date().toISOString().split('T')[0];

  (records || []).forEach((rec) => {
    if (!rec) return;
    const safeName = (rec.name || 'Customer').trim();
    const safeVillage = (rec.village || 'Dahod').trim();

    // 1. Create or Find Customer
    let cust = (updatedData.customers || []).find(
      (c) => c && c.name && c.village &&
        c.name.toLowerCase() === safeName.toLowerCase() &&
        c.village.toLowerCase() === safeVillage.toLowerCase()
    );

    if (!cust) {
      const newCust: Customer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: safeName,
        village: safeVillage,
        diary: (rec.diary || 'Diary 2026').trim(),
        pageNumber: (rec.pageNumber || '1').trim(),
        mobile: rec.mobile ? String(rec.mobile).trim() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedData.customers = [newCust, ...(updatedData.customers || [])];
      cust = newCust;
    }

    // 2. Create Loan under this customer
    const newLoan: Loan = {
      id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerId: cust.id,
      loanDate: today,
      loanAmount: Number(rec.loanAmount) || 50000,
      status: 'ACTIVE',
      ornaments: [
        {
          id: `orn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          metal: rec.metal || 'Silver',
          category: rec.category || 'Kandora',
          weight: Number(rec.weight) || 500,
          quantity: Number(rec.quantity) || 1,
          description: rec.rawSpeech || '',
        },
      ],
      notes: `Bulk voice entry: ${rec.rawSpeech || ''}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updatedData.loans = [newLoan, ...(updatedData.loans || [])];
  });

  // Ensure villages and categories are up to date
  const villageSet = new Set(updatedData.villages || []);
  (records || []).forEach((r) => {
    if (r && r.village) villageSet.add(r.village.trim());
  });
  updatedData.villages = Array.from(villageSet);

  updatedData = recordActivity(
    updatedData,
    'BULK_IMPORT',
    `${(records || []).length} Bulk Customers`,
    'Dahod Region',
    `Imported ${(records || []).length} customer loan accounts from bulk voice input session.`
  );

  syncBulkCommitToSupabase(updatedData.customers, updatedData.loans);
  return updatedData;
}

// JSON Backup export and restore
export function exportToJSON(data: AppData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dahod_Lending_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(jsonString: string): AppData | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.customers && Array.isArray(parsed.customers) && parsed.loans && Array.isArray(parsed.loans)) {
      saveStoredData(parsed);
      return parsed;
    }
    return null;
  } catch (e) {
    console.error('Failed to import JSON backup:', e);
    return null;
  }
}
