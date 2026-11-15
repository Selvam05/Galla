# Galla — Tech Stack Document

> **Galla** (கல்லா) = kadai-la cash vekkra petti. Tea shop billing app.

Tea shop billing app. Offline-la work aagum, browser-la odum, mobile / tablet / PC ellathulayum use pannalam.

---

## 1. Overview

| Vishayam | Mudivu |
|---|---|
| App type | Web app (PWA), install panna app maadhiri odum |
| Backend | **Illa.** Ellam browser-kulleye nadakkum |
| Database | IndexedDB (browser-oda inbuilt database), Dexie.js moolama |
| Internet | Thevai illa. Mudhal thadava load aana aprom offline-la odum |
| Cost | ₹0. Server, database bill edhuvum illa |
| Devices | Android / iPhone browser, tablet, Windows / Mac PC |

### Yen backend vendaam?
- Oru tea shop-la oru counter, oru device dhaan, so data share panna vendiya avasiyam illa
- Net illanaalum billing nikkaadhu
- Server cost illa, maintain panna vendiyadhu illa
- Pin naal owner mobile-la report paakanum, illa cloud backup venum na appo backend (Node.js + MongoDB / Supabase) serthukalam

---

## 2. Tech list — edhukku enna

| Tech | Version | Edhukku |
|---|---|---|
| **React** | 19.3 | UI build panna (screens, buttons, cart) |
| **Vite** | 6.4 | Dev server + production build (fast) |
| **Tailwind CSS** | 4.3 | Styling: colours, spacing, dark/light theme |
| **Dexie.js** | 4.4 | IndexedDB-a easy-a use panna (items, bills, settings save) |
| **dexie-react-hooks** | 1.1 | Database maaruna udane screen auto update aaga (`useLiveQuery`) |
| **vite-plugin-pwa** | 1.3 | Offline support + "Install app" option (service worker, manifest) |
| **qrcode** | 1.5 | Bill amount-oda UPI QR code generate panna |
| **lucide-react** | 1.73 | Icons (cup, cookie, printer, etc.) |
| **SheetJS (xlsx)** | 0.20.3 | Excel report export. Export button press pannumbodhu mattum load aagum (lazy load) |
| **Noto Sans Tamil** font | 5.x | Tamil item names offline-layum sariya theriya |
| **Outfit** font | 5.3 | Body text, numbers |
| **Fraunces** font | 5.3 | Shop name, headings, totals (premium serif look) |

Fonts npm package-a install aagirukku, Google Fonts link illa. Adhanaala offline-la kooda font sariya varum.

---

## 3. Features & adhukkaana tech

| Feature | Eppadi nadakkudhu |
|---|---|
| **Billing** | React state-la cart, item tap panna qty add aagum |
| **Bill save** | Dexie transaction: bill number +1, bill IndexedDB-la save |
| **Thermal print (58mm)** | `Receipt` component `#print-root`-la render aagum → `window.print()`. CSS `@page { size: 58mm auto }` |
| **UPI QR** | `upi://pay?pa=...&am=...` link → `qrcode` library → image |
| **Reports** | IndexedDB-la date wise bills edutthu JavaScript-la calculate. Chart pure CSS bars (chart library illa) |
| **Themes (Dark / Light / Tea Leaf)** | CSS variables + `data-theme` attribute (`light`, `green`). Pudhu theme serkka `index.css`-la oru colour block + `lib/theme.js`-la name podhum. Choice localStorage-la save aagum |
| **Offline** | Service worker ella files-ayum cache pannum |
| **Backup / Restore** | Ella data-vum (items, bills, expenses, settings) JSON file-a download, thirumba upload panna restore |
| **App language (English / தமிழ்)** | `lib/i18n.js`-la English text = key, Tamil translation dictionary. `t('Bill')` → "பில்". Default English. Settings → Language-la mattum maathalaam. Date/time `ta-IN` locale. Receipt-um adhe language-la |
| **Tamil names** | Item-la `nameTa` field. Settings-la English / தமிழ் / Both. Receipt-la-um adhe mode |
| **Discount** | Checkout-la ₹ or %. `lib/bill.js` → `computeBill()` |
| **GST** | Settings-la on/off, rate, GSTIN. Discount-ku aprom GST, receipt-la CGST + SGST split, nearest ₹-ku round off |
| **Expenses** | `expenses` table. Expenses page-la entry, Reports-la Net profit = Sales − Expenses |
| **Excel export** | Reports → Export Excel: Summary, Day-wise, Bills, Item-wise, Expenses sheets |
| **Stock** | Item-la `trackStock` + `stock`. Sale-la kammi aagum, bill delete panna thirumba varum, 0 aana "Out of stock" |

---

## 4. Folder structure

```
tea-shop-billing/
├── index.html              # App entry, theme flash-prevent script
├── vite.config.js          # Vite + React + Tailwind + PWA config
├── package.json
├── public/
│   └── icon.svg            # App icon
└── src/
    ├── main.jsx            # React start, fonts import
    ├── App.jsx             # Layout: sidebar (PC), bottom nav (mobile)
    ├── AppContext.jsx      # Settings, theme, toast, confirm dialog, print
    ├── db.js               # Dexie database schema, sample menu, saveBill()
    ├── index.css           # Tailwind theme, colours, light theme, print CSS
    ├── lib/
    │   ├── utils.js        # ₹ format, date, UPI link, category icons/colours
    │   ├── ui.js           # Common button / input styles
    │   └── theme.js        # Theme get / apply
    ├── components/
    │   ├── Modal.jsx       # Popup
    │   ├── Receipt.jsx     # 58mm print bill design
    │   ├── UpiQr.jsx       # QR code
    │   ├── Toggle.jsx      # On/off switch
    │   ├── ThemeButton.jsx # Sun / moon button
    │   └── PageHeader.jsx
    └── pages/
        ├── Billing.jsx     # Main billing screen + payment + success
        ├── Bills.jsx       # Bill history, reprint, delete
        ├── Reports.jsx     # Sales reports
        ├── Items.jsx       # Menu add / edit / delete
        └── Settings.jsx    # Shop details, UPI, print, theme, backup
```

---

## 5. Database design (IndexedDB — `chaiPos`)

> Database / localStorage keys-la pazhaya `chaiPos` / `chai-pos:` peyar-e irukkum. Maathuna users-oda data pogidum, adhanaala maathala.

Schema version 2 (v1 → v2 upgrade automatic, pazhaya data pogaadhu).

**items** — menu items
```js
{ id, name, nameTa, price, category, active: 1 | 0, sort, trackStock, stock }
```

**bills** — ovvoru sale-um
```js
{ id, billNo, createdAt, date: 'YYYY-MM-DD', items: [{ id, name, nameTa, price, qty }],
  itemCount, subtotal, discount: { type, value, amount } | null,
  tax: { rate, amount } | null, roundOff, total, payMode: 'cash' | 'upi', received }
```

**expenses** — selavu (v2)
```js
{ id, date, createdAt, category, amount, note, payMode }
```

**settings** — oru row mattum (`key: 'shop'`)
```js
{ shopName, address, phone, upiId, upiName, footer, printQr, autoPrint, lastBillNo,
  nameMode: 'en' | 'ta' | 'both', gstEnabled, gstRate, gstin }
```

Indexes: `bills.date`, `expenses.date` (date wise report-ku), `bills.billNo`, `items.category`.

---

## 6. Commands

```bash
npm install        # mudhal thadava dependencies install
npm run dev        # development: http://localhost:5173 (same WiFi-la mobile-la kooda open aagum)
npm run build      # production build → dist/ folder
npm run preview    # build aana app-a local-a test panna
```

---

## 7. Deploy (online-la poda)

`dist/` folder-a free hosting-la podalam:
- **Netlify** (business use-kum ok) — `dist` folder-a drag & drop
- **Vercel** — free plan personal use-ku mattum

Link open panni browser menu-la **"Install app"** / **"Add to Home screen"** press panna, app maadhiri install aagum.

---

## 8. Gavanikka vendiyadhu

- Data **andha browser / device-la mattum** dhaan irukkum. Browser data clear panna pogidum, so **Settings → Download backup** adikkadi edunga.
- Vera device-la (innoru phone-la) open panna andha data anga varaadhu.
- Print: thermal printer select pannunga, margins **None**, "Headers and footers" **off**.

---

## 9. Future (Phase 2 / 3)

| Phase | Features | Thevaiyaana tech |
|---|---|---|
| 2 ✅ | Tamil item names, discount, GST, expenses, Excel export, stock — **mudinjiduchu** | SheetJS, Noto Sans Tamil |
| 2.5 ✅ | Full app UI English / தமிழ் language choose — **mudinjiduchu** | `lib/i18n.js` dictionary |
| 2.6 | Owner PIN lock, PNG icons, Git, Netlify deploy | — |
| 3 | Cloud backup, owner mobile report, multi-device | Backend: Node.js + Express + MongoDB Atlas, illa Supabase |
| 3 | Bluetooth printer direct print | Web Bluetooth + ESC/POS commands |
