import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AppData, Customer, Loan, Ornament, LoanPayment, LoanTopUp, ActivityLog } from './types';
import { initialAppData } from './sampleData';

/**
 * Fetch all data from Supabase PostgreSQL
 */
export async function fetchFromSupabase(): Promise<AppData | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    // 1. Fetch Customers
    const { data: rawCustomers, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (custErr) throw custErr;

    // 2. Fetch Loans
    const { data: rawLoans, error: loanErr } = await supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (loanErr) throw loanErr;

    // 3. Fetch Ornaments
    const { data: rawOrnaments, error: ornErr } = await supabase
      .from('ornaments')
      .select('*');

    if (ornErr) throw ornErr;

    // 4. Fetch Payments
    const { data: rawPayments, error: payErr } = await supabase
      .from('loan_payments')
      .select('*')
      .order('payment_date', { ascending: true });

    if (payErr) throw payErr;

    // 5. Fetch Top-Ups
    const { data: rawTopUps, error: topErr } = await supabase
      .from('loan_top_ups')
      .select('*')
      .order('top_up_date', { ascending: true });

    if (topErr) throw topErr;

    // 6. Fetch Activity Logs
    const { data: rawLogs, error: logErr } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (logErr) throw logErr;

    // 7. Fetch Settings
    const { data: rawSettings } = await supabase
      .from('app_settings')
      .select('*');

    // Assemble customers
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

    // Assemble loans with nested ornaments, payments, and top-ups
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
  } catch (e) {
    console.error('Failed to fetch from Supabase:', e);
    return null;
  }
}

/**
 * Upload entire local database into Supabase (initial seed/migration)
 */
export async function seedLocalDataToSupabase(data: AppData): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    // 1. Check if customers already exist
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log('Supabase already contains data, skipping initial seed.');
      return true;
    }

    // 2. Insert Customers
    if (data.customers && data.customers.length > 0) {
      const customerInserts = data.customers.map((c) => ({
        id: c.id,
        name: c.name,
        village: c.village,
        diary: c.diary,
        page_number: c.pageNumber,
        mobile: c.mobile || null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }));
      await supabase.from('customers').upsert(customerInserts);
    }

    // 3. Insert Loans, Ornaments, Payments, TopUps
    for (const loan of data.loans) {
      await supabase.from('loans').upsert({
        id: loan.id,
        customer_id: loan.customerId,
        loan_date: loan.loanDate,
        loan_amount: loan.loanAmount,
        status: loan.status,
        closed_date: loan.closedDate || null,
        notes: loan.notes || null,
        created_at: loan.createdAt,
        updated_at: loan.updatedAt,
      });

      if (loan.ornaments && loan.ornaments.length > 0) {
        const ornInserts = loan.ornaments.map((o) => ({
          id: o.id,
          loan_id: loan.id,
          metal: o.metal,
          category: o.category,
          weight: o.weight,
          quantity: o.quantity || 1,
          description: o.description || null,
          created_at: new Date().toISOString(),
        }));
        await supabase.from('ornaments').upsert(ornInserts);
      }

      if (loan.payments && loan.payments.length > 0) {
        const payInserts = loan.payments.map((p) => ({
          id: p.id,
          loan_id: loan.id,
          payment_date: p.date,
          amount: p.amount,
          interest_amount: p.interestAmount || 0,
          principal_amount: p.principalAmount || p.amount,
          notes: p.notes || null,
          created_at: p.createdAt,
        }));
        await supabase.from('loan_payments').upsert(payInserts);
      }

      if (loan.topUps && loan.topUps.length > 0) {
        const topInserts = loan.topUps.map((t) => ({
          id: t.id,
          loan_id: loan.id,
          top_up_date: t.date,
          amount: t.amount,
          notes: t.notes || null,
          created_at: t.createdAt,
        }));
        await supabase.from('loan_top_ups').upsert(topInserts);
      }
    }

    // 4. Insert Activity Logs
    if (data.activityLogs && data.activityLogs.length > 0) {
      const logInserts = data.activityLogs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        user_name: log.user,
        action: log.action,
        customer_name: log.customerName,
        village: log.village,
        details: log.details,
      }));
      await supabase.from('activity_logs').upsert(logInserts);
    }

    // 5. Insert App Settings
    await supabase.from('app_settings').upsert([
      { key: 'villages', value: data.villages },
      { key: 'ornamentCategories', value: data.ornamentCategories },
      { key: 'diaries', value: data.diaries },
      { key: 'defaultAnnualInterestRate', value: data.defaultAnnualInterestRate },
    ]);

    console.log('Successfully seeded local data to Supabase!');
    return true;
  } catch (err) {
    console.error('Error seeding data to Supabase:', err);
    return false;
  }
}

/**
 * Sync individual mutations to Supabase in real-time
 */
export async function syncCustomerToSupabase(customer: Customer) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      village: customer.village,
      diary: customer.diary,
      page_number: customer.pageNumber,
      mobile: customer.mobile || null,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    });
  } catch (e) {
    console.warn('Failed to sync customer to Supabase:', e);
  }
}

export async function syncLoanToSupabase(loan: Loan) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('loans').upsert({
      id: loan.id,
      customer_id: loan.customerId,
      loan_date: loan.loanDate,
      loan_amount: loan.loanAmount,
      status: loan.status,
      closed_date: loan.closedDate || null,
      notes: loan.notes || null,
      created_at: loan.createdAt,
      updated_at: loan.updatedAt,
    });

    if (loan.ornaments && loan.ornaments.length > 0) {
      const ornInserts = loan.ornaments.map((o) => ({
        id: o.id,
        loan_id: loan.id,
        metal: o.metal,
        category: o.category,
        weight: o.weight,
        quantity: o.quantity || 1,
        description: o.description || null,
        created_at: new Date().toISOString(),
      }));
      await supabase.from('ornaments').upsert(ornInserts);
    }
  } catch (e) {
    console.warn('Failed to sync loan to Supabase:', e);
  }
}

export async function syncPaymentToSupabase(loanId: string, payment: LoanPayment) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('loan_payments').upsert({
      id: payment.id,
      loan_id: loanId,
      payment_date: payment.date,
      amount: payment.amount,
      interest_amount: payment.interestAmount || 0,
      principal_amount: payment.principalAmount || payment.amount,
      notes: payment.notes || null,
      created_at: payment.createdAt,
    });
  } catch (e) {
    console.warn('Failed to sync payment to Supabase:', e);
  }
}

export async function syncDeletePaymentFromSupabase(paymentId: string) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('loan_payments').delete().eq('id', paymentId);
  } catch (e) {
    console.warn('Failed to delete payment from Supabase:', e);
  }
}

export async function syncTopUpToSupabase(loanId: string, topUp: LoanTopUp) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('loan_top_ups').upsert({
      id: topUp.id,
      loan_id: loanId,
      top_up_date: topUp.date,
      amount: topUp.amount,
      notes: topUp.notes || null,
      created_at: topUp.createdAt,
    });
  } catch (e) {
    console.warn('Failed to sync top-up to Supabase:', e);
  }
}

export async function syncDeleteTopUpFromSupabase(topUpId: string) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('loan_top_ups').delete().eq('id', topUpId);
  } catch (e) {
    console.warn('Failed to delete top-up from Supabase:', e);
  }
}

export async function syncCloseLoanToSupabase(loanId: string, closedDate: string) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('loans').update({
      status: 'CLOSED',
      closed_date: closedDate,
      updated_at: new Date().toISOString(),
    }).eq('id', loanId);
  } catch (e) {
    console.warn('Failed to close loan in Supabase:', e);
  }
}

export async function syncActivityLogToSupabase(log: ActivityLog) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('activity_logs').upsert({
      id: log.id,
      timestamp: log.timestamp,
      user_name: log.user,
      action: log.action,
      customer_name: log.customerName,
      village: log.village,
      details: log.details,
      previous_value: log.previousValue || null,
      new_value: log.newValue || null,
    });
  } catch (e) {
    console.warn('Failed to sync activity log to Supabase:', e);
  }
}

export async function syncBulkCommitToSupabase(newCustomers: Customer[], newLoans: Loan[], newLog?: ActivityLog) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    if (newCustomers && newCustomers.length > 0) {
      const custRows = newCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        village: c.village,
        diary: c.diary,
        page_number: c.pageNumber,
        mobile: c.mobile || null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }));
      await supabase.from('customers').upsert(custRows);
    }
    for (const l of newLoans) {
      await syncLoanToSupabase(l);
    }
    if (newLog) {
      await syncActivityLogToSupabase(newLog);
    }
  } catch (e) {
    console.warn('Failed to sync bulk records to Supabase:', e);
  }
}
