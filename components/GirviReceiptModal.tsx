'use client';

import React, { useRef } from 'react';
import { LoanAccount, StoreSettings } from '@/lib/types';
import { Language, translations } from '@/lib/translations';
import { calculateAccruedInterest } from '@/lib/storage';
import {
  X,
  Printer,
  Share2,
  MessageCircle,
  Gem,
  CheckCircle,
} from 'lucide-react';

interface GirviReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanAccount | null;
  settings: StoreSettings;
  language: Language;
}

export const GirviReceiptModal: React.FC<GirviReceiptModalProps> = ({
  isOpen,
  onClose,
  loan,
  settings,
  language,
}) => {
  const t = translations[language];
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !loan) return null;

  const {
    daysElapsed,
    monthsElapsed,
    monthlyInterestAmount,
    totalPaidInterest,
    netPendingInterest,
    currentTotalPayable,
  } = calculateAccruedInterest(loan);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const newline = String.fromCharCode(10);
    const ornamentsList = loan.collateral
      .map(
        (c, i) =>
          (i + 1) + '. ' + c.description + ' - Net Wt: ' + c.netWeight + 'g (' + c.purity + ')'
      )
      .join(newline);

    const msg = [
      '*' + settings.storeName + ' - Girvi Receipt*',
      '',
      'Token No: *' + loan.loanNumber + '*',
      'Customer: *' + loan.customerName + '*',
      'Date: *' + loan.startDate + '*',
      'Loan Amount: *₹' + loan.principalAmount.toLocaleString('en-IN') + '*',
      'Interest Rate: *' + loan.monthlyInterestRate + '% per month (₹' + monthlyInterestAmount + '/mo)*',
      '',
      '*Pledged Ornaments:*',
      ornamentsList,
      '',
      'Total Paid Interest: ₹' + totalPaidInterest.toLocaleString('en-IN'),
      'Pending Interest: ₹' + netPendingInterest.toLocaleString('en-IN'),
      'Total Payable Today: ₹' + currentTotalPayable.toLocaleString('en-IN'),
      '',
      'Address: ' + settings.address,
      'Contact: ' + settings.phone,
    ].join(newline);

    const text = encodeURIComponent(msg);
    const cleanPhone = loan.customerPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    window.open('https://wa.me/' + fullPhone + '?text=' + text, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-royal my-6 print:shadow-none print:m-0 print:p-4 print:border-none print:w-full">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-purple-950 bg-purple-100 px-3 py-1 rounded-full">
              Official Pawn Receipt / Girvi Pavti (ગિરવે પાવતી)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-950 text-gold-300 font-bold text-xs hover:bg-purple-900 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Pavti</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div ref={printRef} className="text-slate-900 font-sans text-sm space-y-4">
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-purple-950">
            <div className="flex items-center justify-center gap-2">
              <Gem className="w-6 h-6 text-purple-900" />
              <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-wide uppercase font-serif">
                {settings.storeName}
              </h1>
            </div>
            <p className="text-xs font-semibold text-purple-900 mt-0.5">
              {settings.storeTagline}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              📍 {settings.address} • 📞 {settings.phone}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-500 mt-1">
              <span>GST: {settings.gstNumber || '24AAAAA0000A1Z5'}</span>
              <span>•</span>
              <span>License No: {settings.licenseNumber || 'GJ-AHM-GL-2024'}</span>
            </div>
          </div>

          {/* Token & Date Bar */}
          <div className="bg-purple-50 p-3 rounded-xl flex items-center justify-between text-xs font-bold border border-purple-200">
            <div>
              <span>Girvi Token / Account No: </span>
              <strong className="text-purple-950 text-base">{loan.loanNumber}</strong>
            </div>
            <div>
              <span>Issue Date: </span>
              <strong className="text-slate-900">{loan.startDate}</strong>
            </div>
            <div>
              <span>Due Date: </span>
              <strong className="text-slate-900">{loan.dueDate}</strong>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Customer Name:</span>
              <strong className="text-slate-900 text-sm font-bold">{loan.customerName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Contact Phone:</span>
              <strong className="text-slate-900 text-sm font-bold">{loan.customerPhone}</strong>
            </div>
            {loan.customerAddress && (
              <div className="col-span-2">
                <span className="text-slate-500 block">Address:</span>
                <span className="text-slate-800 font-medium">{loan.customerAddress}</span>
              </div>
            )}
          </div>

          {/* Pledged Ornaments Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 mb-1.5">
              Pledged Ornaments in Safe Vault (ગિરવે રાખેલ દાગીના):
            </h4>
            <table className="w-full text-xs text-left border border-slate-300 rounded-lg overflow-hidden">
              <thead className="bg-purple-950 text-white font-bold">
                <tr>
                  <th className="p-2 border-r border-purple-900">#</th>
                  <th className="p-2 border-r border-purple-900">Item Description</th>
                  <th className="p-2 border-r border-purple-900">Metal</th>
                  <th className="p-2 border-r border-purple-900">Gross Wt (g)</th>
                  <th className="p-2 border-r border-purple-900">Net Wt (g)</th>
                  <th className="p-2 border-r border-purple-900">Purity</th>
                  <th className="p-2 text-right">Market Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loan.collateral.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2 font-bold border-r border-slate-200">{idx + 1}</td>
                    <td className="p-2 font-medium border-r border-slate-200">{item.description}</td>
                    <td className="p-2 font-semibold border-r border-slate-200">{item.metal}</td>
                    <td className="p-2 border-r border-slate-200">{item.grossWeight}g</td>
                    <td className="p-2 font-bold border-r border-slate-200">{item.netWeight}g</td>
                    <td className="p-2 font-semibold border-r border-slate-200">{item.purity}</td>
                    <td className="p-2 text-right font-bold">₹{item.estimatedValue.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-purple-50 font-bold border-t-2 border-purple-950">
                <tr>
                  <td colSpan={4} className="p-2 text-right">Total Net Weight:</td>
                  <td className="p-2">
                    {loan.collateral.reduce((sum, c) => sum + c.netWeight, 0).toFixed(1)}g
                  </td>
                  <td className="p-2 text-right">Total Valuation:</td>
                  <td className="p-2 text-right text-purple-950">
                    ₹{loan.collateral.reduce((sum, c) => sum + c.estimatedValue, 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Financials Breakdown */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-purple-900/10 rounded-xl border border-purple-300 text-xs">
            <div>
              <span className="text-slate-600 block">Principal Loan Amount:</span>
              <strong className="text-purple-950 text-base font-extrabold">
                ₹{loan.principalAmount.toLocaleString('en-IN')}
              </strong>
            </div>
            <div>
              <span className="text-slate-600 block">Monthly Interest Rate:</span>
              <strong className="text-purple-950 text-sm font-bold">
                {loan.monthlyInterestRate}% / mo (₹{monthlyInterestAmount}/mo)
              </strong>
            </div>
            <div>
              <span className="text-slate-600 block">Total Paid Interest:</span>
              <strong className="text-emerald-700 text-sm font-bold">
                ₹{totalPaidInterest.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          {/* Terms & Legal Declaration */}
          <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
            <p className="font-semibold text-slate-800 mb-1">શરતો અને કબૂલાત (Terms & Conditions):</p>
            <p>
              ૧. ગ્રાહકે દર્શાવેલ દાગીના તેમની માલિકીના છે અને લોન મેળવવા માટે સુરક્ષિત રીતે ગિરવે મુકેલ છે.
              ૨. વ્યાજ દર મહિને નિયમિત ભરવાનું રહેશે.
              ૩. મુદ્દલ અને બાકી વ્યાજ સંપૂર્ણ ચૂકવીને દાગીનો મૂળ સ્થિતિમાં પાછો મેળવી શકાશે.
            </p>
          </div>

          {/* Signature Blocks */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-xs font-bold text-center">
            <div>
              <div className="border-t border-slate-400 pt-1.5 mx-6">
                <span>ગ્રાહકની સહી (Customer Signature)</span>
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1.5 mx-6">
                <span>દુકાનદારની સહી / સિક્કો (For {settings.storeName})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
