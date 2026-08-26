# DAPP - Luxury Voice-First Jewelry & Gold/Silver Loan (Girvi) Management

> **Custom built for Mom's Jewelry Store & Gold/Silver Loan Business.**

DAPP is a luxury, voice-first web application designed specifically for jewelry store owners who lend money against gold and silver ornaments (Girvi Khata / Pawn Ledger). It features a dedicated speech interface with Indian accent calibration, automated collateral valuation, interest accrual calculations, printable official Girvi receipts, and one-click WhatsApp notifications.

---

## 🌟 Key Features

### 🎙️ 1. Voice-First Assistant (Designed for Non-Tech Users)
- **Big One-Tap Microphone Button**: Just tap and speak naturally in English, Hindi (हिन्दी), or Gujarati (ગુજરાતી).
- **Intelligent Jewelry NLP Parser**:
  - Automatically extracts: Customer Name, Phone, Ornament Type (Chain, Bangles, Ring, Necklace, Silver Utensils), Weight (Grams/Tola), Purity (24K, 22K 916 Hallmark, 18K, 999 Silver), Principal Loan Amount, and Monthly Interest Rate (%).
  - Example: *"Add loan for Ramesh Patel 50,000 rupees on 20 gram 22 carat gold chain at 1.5%"*
- **Live Visual Waveform & Confirmation**: Pulsating royal purple & gold audio wave while speaking.
- **Voice Response (TTS)**: DAPP speaks back confirmations in a clear, warm voice so Mom always knows the action was recorded.

### 🪙 2. Gold & Silver Collateral & Loan Ledger (Girvi Khata)
- **Multi-Item Collateral Support**: Record multiple items per loan (e.g., pair of bangles + ring).
- **Real-Time Market Valuation**: Auto-calculates accurate collateral market value based on live 24K, 22K 916, 18K gold and silver rates.
- **Safe Lending Guideline**: Displays safe 75% LTV recommendation so loans are always secure.
- **Accrued Interest Calculator**: Real-time simple monthly interest calculation showing months/days elapsed, interest paid, and total balance payable today.

### 🧾 3. Official Girvi Receipts & WhatsApp Integration
- **Printable Pawn Receipt (Girvi Pavti / ગિરવે પાવતી)**: Official store slip with store details, GST, customer info, pledged ornaments table, terms, and signature lines.
- **1-Click WhatsApp Reminders**: Send formatted statement or receipt directly to customer's WhatsApp in one tap.

### 📊 4. Store Dashboard & Valuation Calculator
- **Vault Summary**: Total Gold in Vault (grams), Total Silver in Vault, and total asset valuation.
- **Instant Quotes**: Fast on-the-spot calculator when customers ask how much they can borrow for their gold.

### 💾 5. Offline-First & Backup
- Automatically saves everything in local storage.
- 1-click JSON backup export and restore.

---

## 🚀 Running Locally

From your terminal in `/Users/nirvangandhi/Desktop/Dapp`:

```bash
# 1. Start the development server
npm run dev

# 2. Open in your browser
http://localhost:3000
```

---

## 📦 Building for Production

```bash
npm run build
npm start
```

---

## 🔄 Syncing with GitHub & Deploying to Vercel

### Step 1: Initialize Git and Commit
```bash
cd /Users/nirvangandhi/Desktop/Dapp
git init
git add .
git commit -m "Initial commit of DAPP Jewelry Loan App"
```

### Step 2: Push to GitHub
1. Create a new repository on [GitHub](https://github.com/new) named `dapp-jewelry-loan`.
2. Push your local repo:
```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/dapp-jewelry-loan.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **Import Repository** and select `dapp-jewelry-loan`.
3. Click **Deploy**. Vercel will automatically build and deploy your Next.js application with a live HTTPS URL (e.g., `https://dapp-jewelry-loan.vercel.app`).
