import { AppData, Customer, Loan, ActivityLog, Ornament, LoanStatus } from './types';
import { initialAppData } from './sampleData';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'dahod_jewellery_lending_data_v2';

export function getStoredData(): AppData {
  if (typeof window === 'undefined') return initialAppData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAppData));
      return initialAppData;
    }
    const parsed = JSON.parse(raw);
    return {
      ...initialAppData,
      ...parsed,
      customers: parsed.customers || initialAppData.customers,
      loans: parsed.loans || initialAppData.loans,
      activityLogs: parsed.activityLogs || initialAppData.activityLogs,
      villages: parsed.villages || initialAppData.villages,
      ornamentCategories: parsed.ornamentCategories || initialAppData.ornamentCategories,
      diaries: parsed.diaries || initialAppData.diaries,
    };
  } catch (err) {
    console.error('Error reading data from storage:', err);
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

  // Ensure village and diary exist in master list
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

  // Update villages and diaries
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
    `Created ${created.length} customers in bulk voice entry: ${created.map((c) => `${c.name} (${c.village}, ${c.diary} p.${c.pageNumber})`).join('; ')}`
  );

  return updatedData;
}

// Update Customer (including moving Diary & Page)
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
      `Updated customer details: ${JSON.stringify(updates)}`
    );
  }

  return updatedData;
}

// Add a Loan under a Customer
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

// Close a Loan (Mark CLOSED with RED visual treatment, retain in history)
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

// Export All Data to Multi-Sheet Excel (.xlsx) as specified in Requirements Section 18
export function exportToExcel(data: AppData): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customers
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

  // Sheet 2: Loans
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

  // Sheet 3: Ornaments
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

  // Sheet 4: Activity History
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

  // Generate and Download File
  const filename = `Dahod_Jewellery_Lending_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Export Complete JSON Backup
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

// Restore Complete JSON Backup
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
