# Galla — Tea Shop Billing

**Galla** (கல்லா) is a fast, offline-first billing app for tea shops. It runs in the browser on phones, tablets and PCs and can be installed as an app (PWA). All data stays on the device — no server needed.

## Features

- Touch-friendly billing with categories, search and an order ticket
- Cash / UPI payments with an auto-generated UPI QR for the exact amount
- Discount (₹ or %), optional GST (CGST + SGST), round off
- 58mm thermal receipt printing (# · Item · Qty · Rate · Amount)
- Bills history with reprint and delete
- Expenses and net-profit reports, Excel export
- Stock tracking with low / out-of-stock indicators
- English / தமிழ் interface and Tamil item names
- Dark, Light and Tea Leaf themes
- JSON backup and restore

## Tech

React 19 · Vite 6 · Tailwind CSS 4 · Dexie (IndexedDB) · vite-plugin-pwa · qrcode · SheetJS

See [TECH_STACK.md](TECH_STACK.md) for the full design, database schema and roadmap.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173 (also reachable from phones on the same Wi-Fi)
npm run build     # production build in dist/
npm run preview   # serve the production build locally
```

## Notes

- Data is stored in the browser's IndexedDB on that device only. Use **Settings → Download backup** regularly.
- For thermal printing, choose your printer in the print dialog, set margins to **None** and turn off **Headers and footers**.
