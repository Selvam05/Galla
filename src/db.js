import Dexie from 'dexie';
import { dateKey } from './lib/utils';

export const db = new Dexie('chaiPos');

db.version(1).stores({
  items: '++id, category, name',
  bills: '++id, billNo, date, createdAt, payMode',
  settings: 'key',
});

// v2: expenses table + Tamil names on existing items
db.version(2)
  .stores({
    items: '++id, category, name',
    bills: '++id, billNo, date, createdAt, payMode',
    settings: 'key',
    expenses: '++id, date, createdAt, category',
  })
  .upgrade((tx) =>
    tx
      .table('items')
      .toCollection()
      .modify((it) => {
        if (!it.nameTa && TAMIL[it.name]) it.nameTa = TAMIL[it.name];
      })
  );

export const DEFAULT_SETTINGS = {
  key: 'shop',
  shopName: 'Chai Corner',
  address: '',
  phone: '',
  upiId: '',
  upiName: '',
  footer: 'Thank you! Visit again',
  printQr: true,
  autoPrint: true,
  lastBillNo: 0,
  nameMode: 'en', // 'en' | 'ta' | 'both'
  gstEnabled: false,
  gstRate: 5,
  gstin: '',
};

const TAMIL = {
  Tea: 'டீ',
  'Ginger Tea': 'இஞ்சி டீ',
  'Lemon Tea': 'லெமன் டீ',
  'Masala Tea': 'மசாலா டீ',
  Coffee: 'காபி',
  'Filter Coffee': 'ஃபில்டர் காபி',
  Boost: 'பூஸ்ட்',
  Horlicks: 'ஹார்லிக்ஸ்',
  Milk: 'பால்',
  Vadai: 'வடை',
  Bajji: 'பஜ்ஜி',
  Bonda: 'போண்டா',
  Samosa: 'சமோசா',
  'Veg Puff': 'வெஜ் பஃப்',
  'Egg Puff': 'முட்டை பஃப்',
  Biscuit: 'பிஸ்கட்',
  'Rose Milk': 'ரோஸ் மில்க்',
  'Badam Milk': 'பாதாம் பால்',
  'Lime Juice': 'லைம் ஜூஸ்',
  'Water Bottle': 'தண்ணீர் பாட்டில்',
};

const SEED = [
  ['Tea', 12, 'Tea & Coffee'],
  ['Ginger Tea', 15, 'Tea & Coffee'],
  ['Lemon Tea', 15, 'Tea & Coffee'],
  ['Masala Tea', 18, 'Tea & Coffee'],
  ['Coffee', 15, 'Tea & Coffee'],
  ['Filter Coffee', 20, 'Tea & Coffee'],
  ['Boost', 20, 'Tea & Coffee'],
  ['Horlicks', 20, 'Tea & Coffee'],
  ['Milk', 10, 'Tea & Coffee'],
  ['Vadai', 10, 'Snacks'],
  ['Bajji', 10, 'Snacks'],
  ['Bonda', 10, 'Snacks'],
  ['Samosa', 15, 'Snacks'],
  ['Veg Puff', 20, 'Snacks'],
  ['Egg Puff', 25, 'Snacks'],
  ['Biscuit', 5, 'Snacks'],
  ['Rose Milk', 25, 'Cool Drinks'],
  ['Badam Milk', 30, 'Cool Drinks'],
  ['Lime Juice', 20, 'Cool Drinks'],
  ['Water Bottle', 20, 'Cool Drinks'],
];

db.on('populate', async (tx) => {
  await tx.table('items').bulkAdd(
    SEED.map(([name, price, category], i) => ({
      name,
      nameTa: TAMIL[name] || '',
      price,
      category,
      active: 1,
      sort: i,
      trackStock: false,
      stock: 0,
    }))
  );
  await tx.table('settings').add({ ...DEFAULT_SETTINGS });
});

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('shop')) };
}

export async function updateSettings(patch) {
  const s = await getSettings();
  await db.settings.put({ ...s, ...patch, key: 'shop' });
}

/**
 * Saves a bill atomically: next running bill number, the bill itself,
 * and stock decrement for items that track stock.
 */
export async function saveBill({ lines, payMode, received, calc }) {
  return db.transaction('rw', db.bills, db.settings, db.items, async () => {
    const s = await getSettings();
    const billNo = (s.lastBillNo || 0) + 1;
    await db.settings.put({ ...s, lastBillNo: billNo });

    for (const l of lines) {
      const it = await db.items.get(l.id);
      if (it?.trackStock) await db.items.update(l.id, { stock: Math.max(0, (it.stock || 0) - l.qty) });
    }

    const now = new Date();
    const bill = {
      billNo,
      createdAt: now.getTime(),
      date: dateKey(now),
      items: lines.map(({ id, name, nameTa, price, qty }) => ({ id, name, nameTa: nameTa || '', price, qty })),
      itemCount: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: calc.subtotal,
      discount: calc.discount,
      tax: calc.tax,
      roundOff: calc.roundOff,
      total: calc.total,
      payMode,
      received: received ?? null,
    };
    bill.id = await db.bills.add(bill);
    return bill;
  });
}

/** Restores stock when a bill is deleted. */
export async function deleteBill(bill) {
  return db.transaction('rw', db.bills, db.items, async () => {
    for (const l of bill.items) {
      const it = await db.items.get(l.id);
      if (it?.trackStock) await db.items.update(l.id, { stock: (it.stock || 0) + l.qty });
    }
    await db.bills.delete(bill.id);
  });
}

export const EXPENSE_CATEGORIES = [
  ['Milk', 'பால்'],
  ['Tea powder', 'டீ தூள்'],
  ['Sugar', 'சர்க்கரை'],
  ['Coffee powder', 'காபி தூள்'],
  ['Snacks purchase', 'ஸ்நாக்ஸ்'],
  ['Gas', 'கேஸ்'],
  ['Salary', 'சம்பளம்'],
  ['Rent', 'வாடகை'],
  ['Electricity', 'கரண்ட்'],
  ['Other', 'மற்றவை'],
];
