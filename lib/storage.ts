import { AppData, Customer, Loan, ActivityLog, Ornament, LoanStatus, BulkCustomerLoanRecord } from './types';
import { initialAppData } from './sampleData';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'dahod_jewellery_lending_data_v2';

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
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving data to storage:', err);
  }
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
    return {
      'Customer Name': cust ? cust.name : 'Unknown',
      'Village': cust ? cust.village : 'Unknown',
      'Diary / Page': cust ? `${cust.diary} p.${cust.pageNumber}` : '',
      'Loan Date': l.loanDate,
      'Loan Amount (INR)': l.loanAmount,
      'Status': l.status,
      'Closed Date': l.closedDate || '',
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

  saveStoredData(updatedData);
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
