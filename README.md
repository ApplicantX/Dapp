# Dahod Jewellery & Gold/Silver Lending App

> **Internal family operational app designed specifically for Dahod Jewellery & Gold/Silver Lending business.**

Digitizes the physical diary-based customer/account lookup, records physical gold & silver ornaments held in the vault, enables continuous voice-first data entry in regional Gujarati/Indian accents, and provides an independent annual compound interest calculator.

---

## 🌟 Key Functional Modules (as per Specification)

### 1. Dashboard / Starting Screen (Two Large Options)
- **Compound Interest Calculator**: Direct access to jewellery annual compound interest calculations.
- **Customer Details**: Direct access to customer lookup, active held ornaments, and loan history.

### 2. Customer Lookup & Diary Management
- **Search by Name & Village**: Disambiguates customers with identical names using their village (e.g., *Ramesh Mishra from Vova* vs *Ramesh Patel from Limkheda*).
- **Physical Diary Reference**: Shows the exact Diary (e.g. `Diary 2026`) and Page Number (e.g. `142`).
- **Diary Page Move**: Easily update the diary and page reference when a physical diary fills up, automatically recording the move in audit history.
- **Voice Search**: Real-time microphone search with fuzzy matching.

### 3. Voice-First Data Entry
- **Continuous Voice Recording**: Microphone keeps listening through ordinary thinking pauses until the user explicitly taps the large **STOP** button.
- **Single Customer Voice Entry**: Speaks name, village, diary, and page number (*"Ramesh Mishra from Vova village, Diary 2026, Page 142"*).
- **Bulk Customer Voice Entry**: Speak multiple customers in a single session (*"1. Ramesh Patel from Vova Diary 2026 Page 12, 2. Suresh Damor from Garbada Diary 2025 Page 84..."*). Automatically parses into numbered editable cards with missing info alerts and **"SAVE ALL CUSTOMERS"**.
- **Loan Voice Entry ("SPEAK NEW LOAN")**: Speak total loan amount and multiple ornaments in one phrase (*"Add 500 grams silver kandora and 200 grams silver kada for a total loan amount of fifty thousand rupees on 12 August"*). Extracts separate physical ornament records and loan amount.

### 4. Separate Physical Ornament Records & Vault Holdings
- Each physical ornament is stored as a distinct record (Metal: Gold/Silver, Category: Kandora, Kada, Ring, Chain, etc., Weight in grams, Quantity).
- **Active Vault Holdings**: Displays all pledged ornaments currently in vault across active loans.
- **Closed Loans**: Marked with bold **RED** visual status. Ornaments remain in historical loan records but are removed from active vault holdings.

### 5. Independent Compound Interest Calculator
- Annual compounding: $A = P 	imes (1 + r)^t$, $	ext{Interest} = A - P$.
- Select 1 to 20 items.
- Editable annual rate (% p.a., supports decimals like 18, 21.5).
- Calculates Principal, Interest, and Total per item and displays Grand Totals in INR (`₹`).

### 6. Data Export & Backup
- **Multi-Sheet Excel Workbook (.xlsx)**: Generates 4 sheets:
  1. `Customers` (Name, Village, Mobile, Diary, Page Number, Created Date)
  2. `Loans` (Customer, Village, Diary/Page, Loan Date, Loan Amount, Status, Closed Date)
  3. `Ornaments` (Customer, Village, Loan Date, Loan Amount, Metal, Category, Weight, Quantity, Description)
  4. `Activity History` (Date/Time, User, Action, Customer, Village, Details)
- **JSON Database Backup**: 1-click full machine-readable backup and restore.

---

## 🚀 Running Locally

```bash
cd /Users/nirvangandhi/Desktop/Dapp
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔄 Git & Deployment

```bash
cd /Users/nirvangandhi/Desktop/Dapp
git add .
git commit -m "Update Dahod Jewellery Lending app"
```
