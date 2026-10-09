import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AppData, Customer, Loan, Ornament, LoanPayment, LoanTopUp, ActivityLog, BulkCustomerLoanRecord } from './types';
import { initialAppData } from './sampleData';

/**
 * Direct Supabase PostgreSQL Database Service
 * ZERO Local Browser Storage. Everything is read and written directly to Supabase.
 */

export async function fetchDatabase(): Promise<AppData> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured. Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.');
  }

  // 1. Fetch Customers
  const { data: rawCustomers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (custErr) throw new Error(`Failed to load customers from Supabase: ${custErr.message}`);

  // 2. Fetch Loans
  const { data: rawLoans, error: loanErr } = await supabase
    .from('loans')
    .select('*')
    .order('created_at', { ascending: false });

  if (loanErr) throw new Error(`Failed to load loans from Supabase: ${loanErr.message}`);

  // 3. Fetch Ornaments
  const { data: rawOrnaments, error: ornErr } = await supabase
    .from('ornaments')
    .select('*');

  if (ornErr) throw new Error(`Failed to load ornaments from Supabase: ${ornErr.message}`);

  // 4. Fetch Payments
  const { data: rawPayments, error: payErr } = await supabase
    .from('loan_payments')
    .select('*')
    .order('payment_date', { ascending: true });

  if (payErr) throw new Error(`Failed to load repayments from Supabase: ${payErr.message}`);

  // 5. Fetch Top-Ups
  const { data: rawTopUps, error: topErr } = await supabase
    .from('loan_top_ups')
    .select('*')
    .order('top_up_date', { ascending: true });

  if (topErr) throw new Error(`Failed to load top-up loans from Supabase: ${topErr.message}`);

  // 6. Fetch Activity Logs
  const { data: rawLogs, error: logErr } = await supabase
    .from('activity_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);

  if (logErr) throw new Error(`Failed to load audit logs from Supabase: ${logErr.message}`);

  // 7. Fetch Settings
  const { data: rawSettings } = await supabase
    .from('app_settings')
    .select('*');

  // Assemble Customers
  const customers: Customer[] = (rawCustomers || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    village: c.village,
    diary: c.diary,
    pageNumber: c.page_number,
    mobile: c.mobile || undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  // Assemble Loans with nested Ornaments, Payments, and Top-Ups
  const loans: Loan[] = (rawLoans || []).map((l: any) => {
    const ornaments: Ornament[] = (rawOrnaments || [])
      .filter((o: any) => o.loan_id === l.id)
      .map((o: any) => ({
        id: o.id,
        metal: o.metal,
        category: o.category,
        weight: Number(o.weight) || 0,
        quantity: Number(o.quantity) || 1,
        description: o.description || undefined,
      }));

    const payments: LoanPayment[] = (rawPayments || [])
      .filter((p: any) => p.loan_id === l.id)
      .map((p: any) => ({
        id: p.id,
        date: p.payment_date,
        amount: Number(p.amount) || 0,
        interestAmount: Number(p.interest_amount) || 0,
        principalAmount: Number(p.principal_amount) || 0,
        notes: p.notes || undefined,
        createdAt: p.created_at,
      }));

    const topUps: LoanTopUp[] = (rawTopUps || [])
      .filter((t: any) => t.loan_id === l.id)
      .map((t: any) => ({
        id: t.id,
        date: t.top_up_date,
        amount: Number(t.amount) || 0,
        notes: t.notes || undefined,
        createdAt: t.created_at,
      }));

    return {
      id: l.id,
      customerId: l.customer_id,
      loanDate: l.loan_date,
      loanAmount: Number(l.loan_amount) || 0,
      status: l.status,
      closedDate: l.closed_date || undefined,
      notes: l.notes || undefined,
      ornaments,
      payments,
      topUps,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    };
  });

  const activityLogs: ActivityLog[] = (rawLogs || []).map((log: any) => ({
    id: log.id,
    timestamp: log.timestamp,
    user: log.user_name || 'Family Admin',
    action: log.action,
    customerName: log.customer_name,
    village: log.village,
    details: log.details,
    previousValue: log.previous_value || undefined,
    newValue: log.new_value || undefined,
  }));

  const settingsMap: Record<string, any> = {};
  (rawSettings || []).forEach((s: any) => {
    settingsMap[s.key] = s.value;
  });

  return {
    customers,
    loans,
    activityLogs,
    villages: settingsMap.villages || initialAppData.villages,
    ornamentCategories: settingsMap.ornamentCategories || initialAppData.ornamentCategories,
    diaries: settingsMap.diaries || initialAppData.diaries,
    defaultAnnualInterestRate: Number(settingsMap.defaultAnnualInterestRate) || 18.0,
  };
}

/**
 * 1. Add a Partial Payment (directly to Supabase)
 */
export async function dbAddPayment(
  loanId: string,
  paymentData: { date: string; amount: number; interestAmount?: number; notes?: string },
  customerName: string,
  village: string,
  currentRemainingPrincipal: number
): Promise<LoanPayment> {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const amount = Number(paymentData.amount) || 0;
  const interestAmount = Math.max(0, Number(paymentData.interestAmount) || 0);
  const principalAmount = Math.max(0, amount - interestAmount);
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const date = paymentData.date || new Date().toISOString().split('T')[0];
  const newRemaining = Math.max(0, currentRemainingPrincipal - principalAmount);

  // 1. Insert into loan_payments table
  const { error: payErr } = await supabase.from('loan_payments').insert({
    id: paymentId,
    loan_id: loanId,
    payment_date: date,
    amount,
    interest_amount: interestAmount,
    principal_amount: principalAmount,
    notes: paymentData.notes?.trim() || null,
  });

  if (payErr) {
    throw new Error(`Failed to save payment to Supabase: ${payErr.message}`);
  }

  // 2. Insert into activity_logs table
  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: 'ADD_PAYMENT',
    customer_name: customerName,
    village,
    details: `Recorded repayment of ₹${amount.toLocaleString('en-IN')} on ${date} (Interest: ₹${interestAmount.toLocaleString('en-IN')}, Principal reduction: ₹${principalAmount.toLocaleString('en-IN')}). Remaining Principal: ₹${newRemaining.toLocaleString('en-IN')}`,
  });

  return {
    id: paymentId,
    date,
    amount,
    interestAmount,
    principalAmount,
    notes: paymentData.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 2. Delete a Partial Payment (directly from Supabase)
 */
export async function dbDeletePayment(
  paymentId: string,
  customerName: string,
  village: string,
  amount: number,
  date: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { error } = await supabase.from('loan_payments').delete().eq('id', paymentId);
  if (error) {
    throw new Error(`Failed to delete repayment from Supabase: ${error.message}`);
  }

  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: 'DELETE_PAYMENT',
    customer_name: customerName,
    village,
    details: `Removed repayment entry of ₹${amount.toLocaleString('en-IN')} dated ${date}`,
  });
}

/**
 * 3. Add a Top-Up Loan on same jewelry (directly to Supabase)
 */
export async function dbAddTopUp(
  loanId: string,
  topUpData: { date: string; amount: number; notes?: string },
  customerName: string,
  village: string,
  newTotalBorrowed: number,
  newRemainingPrincipal: number
): Promise<LoanTopUp> {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const amount = Number(topUpData.amount) || 0;
  const topUpId = `topup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const date = topUpData.date || new Date().toISOString().split('T')[0];

  // 1. Insert into loan_top_ups table
  const { error: topErr } = await supabase.from('loan_top_ups').insert({
    id: topUpId,
    loan_id: loanId,
    top_up_date: date,
    amount,
    notes: topUpData.notes?.trim() || null,
  });

  if (topErr) {
    throw new Error(`Failed to save top-up loan to Supabase: ${topErr.message}`);
  }

  // 2. Insert into activity_logs table
  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: 'ADD_TOPUP',
    customer_name: customerName,
    village,
    details: `Added Top-Up Loan of ₹${amount.toLocaleString('en-IN')} on ${date} on existing collateral. Total Borrowed: ₹${newTotalBorrowed.toLocaleString('en-IN')}, Remaining Principal: ₹${newRemainingPrincipal.toLocaleString('en-IN')}`,
  });

  return {
    id: topUpId,
    date,
    amount,
    notes: topUpData.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 4. Delete a Top-Up Loan (directly from Supabase)
 */
export async function dbDeleteTopUp(
  topUpId: string,
  customerName: string,
  village: string,
  amount: number,
  date: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { error } = await supabase.from('loan_top_ups').delete().eq('id', topUpId);
  if (error) {
    throw new Error(`Failed to delete top-up loan from Supabase: ${error.message}`);
  }

  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: 'DELETE_TOPUP',
    customer_name: customerName,
    village,
    details: `Removed top-up loan entry of ₹${amount.toLocaleString('en-IN')} dated ${date}`,
  });
}

/**
 * 5. Add a New Loan & Collateral Ornaments (directly to Supabase)
 */
export async function dbAddLoan(
  customerId: string,
  loanData: { loanDate: string; loanAmount: number; ornaments: Ornament[]; notes?: string },
  customerName: string,
  village: string
): Promise<Loan> {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const loanId = `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // 1. Insert into loans table
  const { error: loanErr } = await supabase.from('loans').insert({
    id: loanId,
    customer_id: customerId,
    loan_date: loanData.loanDate,
    loan_amount: Number(loanData.loanAmount),
    status: 'ACTIVE',
    notes: loanData.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  });

  if (loanErr) throw new Error(`Failed to save loan to Supabase: ${loanErr.message}`);

  // 2. Insert into ornaments table
  const newOrnaments: Ornament[] = loanData.ornaments.map((o, idx) => ({
    ...o,
    id: o.id || `orn-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
  }));

  if (newOrnaments.length > 0) {
    const ornInserts = newOrnaments.map((o) => ({
      id: o.id,
      loan_id: loanId,
      metal: o.metal,
      category: o.category,
      weight: Number(o.weight) || 0,
      quantity: Number(o.quantity) || 1,
      description: o.description?.trim() || null,
      created_at: now,
    }));

    const { error: ornErr } = await supabase.from('ornaments').insert(ornInserts);
    if (ornErr) throw new Error(`Failed to save ornaments to Supabase: ${ornErr.message}`);
  }

  // 3. Activity log
  const ornamentSummary = newOrnaments
    .map((o) => `${o.quantity}x ${o.weight}g ${o.metal} ${o.category}`)
    .join(', ');

  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: 'ADD_LOAN',
    customer_name: customerName,
    village,
    details: `Added Active Loan of ₹${Number(loanData.loanAmount).toLocaleString('en-IN')} with ornaments: [${ornamentSummary}] on ${loanData.loanDate}`,
  });

  return {
    id: loanId,
    customerId,
    loanDate: loanData.loanDate,
    loanAmount: Number(loanData.loanAmount),
    status: 'ACTIVE',
    ornaments: newOrnaments,
    payments: [],
    topUps: [],
    notes: loanData.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 6. Close a Loan (directly in Supabase)
 */
export async function dbCloseLoan(
  loanId: string,
  customerName: string,
  village: string,
  ornamentSummary: string,
  loanAmount: number
): Promise<string> {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const closedDate = new Date().toISOString().split('T')[0];

  const { error } = await supabase.from('loans').update({
    status: 'CLOSED',
    closed_date: closedDate,
    updated_at: new Date().toISOString(),
  }).eq('id', loanId);

  if (error) throw new Error(`Failed to close loan in Supabase: ${error.message}`);

  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: 'CLOSE_LOAN',
    customer_name: customerName,
    village,
    details: `Closed Loan of ₹${loanAmount.toLocaleString('en-IN')}. Collateral released: [${ornamentSummary}] on ${closedDate}`,
  });

  return closedDate;
}

/**
 * 7. Add a Single Customer (directly to Supabase)
 */
export async function dbAddCustomer(
  customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Customer> {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const customerId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newCustomer: Customer = {
    ...customer,
    id: customerId,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase.from('customers').insert({
    id: customerId,
    name: customer.name.trim(),
    village: customer.village.trim(),
    diary: customer.diary.trim(),
    page_number: customer.pageNumber.trim(),
    mobile: customer.mobile?.trim() || null,
    created_at: now,
    updated_at: now,
  });

  if (error) throw new Error(`Failed to save customer to Supabase: ${error.message}`);

  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: 'CREATE_CUSTOMER',
    customer_name: customer.name,
    village: customer.village,
    details: `Added new customer in ${customer.diary}, Page ${customer.pageNumber}`,
  });

  return newCustomer;
}

/**
 * 8. Update Customer (e.g. Move Diary Page) (directly in Supabase)
 */
export async function dbUpdateCustomer(
  customerId: string,
  updates: Partial<Customer>,
  existing: Customer
): Promise<Customer> {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const now = new Date().toISOString();
  const updatedCustomer: Customer = {
    ...existing,
    ...updates,
    updatedAt: now,
  };

  const payload: any = {
    updated_at: now,
  };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.village !== undefined) payload.village = updates.village.trim();
  if (updates.diary !== undefined) payload.diary = updates.diary.trim();
  if (updates.pageNumber !== undefined) payload.page_number = updates.pageNumber.trim();
  if (updates.mobile !== undefined) payload.mobile = updates.mobile.trim() || null;

  const { error } = await supabase.from('customers').update(payload).eq('id', customerId);
  if (error) throw new Error(`Failed to update customer in Supabase: ${error.message}`);

  const isDiaryMove =
    (updates.diary && updates.diary !== existing.diary) ||
    (updates.pageNumber && updates.pageNumber !== existing.pageNumber);

  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: isDiaryMove ? 'MOVE_DIARY_PAGE' : 'EDIT_CUSTOMER',
    customer_name: existing.name,
    village: existing.village,
    details: isDiaryMove
      ? `Moved account from ${existing.diary} Page ${existing.pageNumber} to ${updates.diary || existing.diary} Page ${updates.pageNumber || existing.pageNumber}`
      : `Updated customer details`,
  });

  return updatedCustomer;
}

/**
 * 9. Commit Bulk Records from Voice Entry (directly to Supabase)
 */
export async function dbCommitBulkRecords(
  records: BulkCustomerLoanRecord[]
): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized.');
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  for (const rec of records) {
    if (!rec) continue;
    const safeName = (rec.name || 'Customer').trim();
    const safeVillage = (rec.village || 'Dahod').trim();

    // Check existing customer
    const { data: existingCust } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', safeName)
      .ilike('village', safeVillage)
      .limit(1);

    let customerId: string;

    if (existingCust && existingCust.length > 0) {
      customerId = existingCust[0].id;
    } else {
      customerId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await supabase.from('customers').insert({
        id: customerId,
        name: safeName,
        village: safeVillage,
        diary: (rec.diary || 'Diary 2026').trim(),
        page_number: (rec.pageNumber || '1').trim(),
        mobile: rec.mobile ? String(rec.mobile).trim() : null,
        created_at: now,
        updated_at: now,
      });
    }

    // Insert Loan
    const loanId = `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await supabase.from('loans').insert({
      id: loanId,
      customer_id: customerId,
      loan_date: today,
      loan_amount: Number(rec.loanAmount) || 50000,
      status: 'ACTIVE',
      notes: `Bulk voice entry: ${rec.rawSpeech || ''}`,
      created_at: now,
      updated_at: now,
    });

    // Insert Ornament
    await supabase.from('ornaments').insert({
      id: `orn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      loan_id: loanId,
      metal: rec.metal || 'Silver',
      category: rec.category || 'Kandora',
      weight: Number(rec.weight) || 500,
      quantity: Number(rec.quantity) || 1,
      description: rec.rawSpeech || '',
      created_at: now,
    });
  }

  await supabase.from('activity_logs').insert({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_name: 'Family Admin',
    action: 'BULK_IMPORT',
    customer_name: `${records.length} Voice Customers`,
    village: 'Dahod Region',
    details: `Imported ${records.length} customer loan accounts from bulk voice input session.`,
  });
}
