import { billNoStr, fmtTime } from './utils';

const sheet = (XLSX, rows, widths) => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  return ws;
};

/** Builds and downloads an .xlsx report for the given range. SheetJS is loaded on demand. */
export async function exportReport({ shopName, from, to, bills, expenses }) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
  const sales = sum(bills, (b) => b.total);
  const cash = sum(bills.filter((b) => b.payMode === 'cash'), (b) => b.total);
  const upi = sales - cash;
  const discounts = sum(bills, (b) => b.discount?.amount);
  const gst = sum(bills, (b) => b.tax?.amount);
  const spent = sum(expenses, (e) => e.amount);

  // Summary
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      XLSX,
      [
        [shopName],
        [from === to ? `Report for ${from}` : `Report: ${from} to ${to}`],
        [],
        ['Total sales', sales],
        ['Bills', bills.length],
        ['Average bill', bills.length ? Math.round(sales / bills.length) : 0],
        ['Cash', cash],
        ['UPI', upi],
        ['Discounts given', discounts],
        ['GST collected', gst],
        ['Expenses', spent],
        ['Net profit', sales - spent],
      ],
      [22, 16]
    ),
    'Summary'
  );

  // Day-wise
  const days = {};
  for (const b of bills) {
    const d = (days[b.date] ||= { sales: 0, bills: 0, cash: 0, upi: 0, exp: 0 });
    d.sales += b.total;
    d.bills += 1;
    d[b.payMode === 'upi' ? 'upi' : 'cash'] += b.total;
  }
  for (const e of expenses) (days[e.date] ||= { sales: 0, bills: 0, cash: 0, upi: 0, exp: 0 }).exp += e.amount;
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      XLSX,
      [
        ['Date', 'Bills', 'Sales', 'Cash', 'UPI', 'Expenses', 'Net profit'],
        ...Object.keys(days)
          .sort()
          .map((k) => {
            const d = days[k];
            return [k, d.bills, d.sales, d.cash, d.upi, d.exp, d.sales - d.exp];
          }),
      ],
      [12, 8, 12, 12, 12, 12, 12]
    ),
    'Day-wise'
  );

  // Bills
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      XLSX,
      [
        ['Bill No', 'Date', 'Time', 'Items', 'Qty', 'Subtotal', 'Discount', 'GST', 'Total', 'Payment'],
        ...[...bills]
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((b) => [
            billNoStr(b.billNo),
            b.date,
            fmtTime(b.createdAt),
            b.items.map((l) => `${l.name} x${l.qty}`).join(', '),
            b.itemCount,
            b.subtotal ?? b.total,
            b.discount?.amount || 0,
            b.tax?.amount || 0,
            b.total,
            b.payMode === 'upi' ? 'UPI' : 'Cash',
          ]),
      ],
      [9, 11, 9, 40, 6, 10, 10, 8, 10, 9]
    ),
    'Bills'
  );

  // Item-wise
  const byItem = {};
  for (const b of bills)
    for (const l of b.items) {
      const e = (byItem[l.name] ||= { ta: '', qty: 0, amount: 0 });
      if (!e.ta && l.nameTa) e.ta = l.nameTa;
      e.qty += l.qty;
      e.amount += l.qty * l.price;
    }
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      XLSX,
      [
        ['Item', 'Tamil', 'Qty sold', 'Amount'],
        ...Object.entries(byItem)
          .sort((a, b) => b[1].amount - a[1].amount)
          .map(([name, e]) => [name, e.ta, e.qty, e.amount]),
      ],
      [20, 18, 10, 12]
    ),
    'Item-wise'
  );

  // Expenses
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      XLSX,
      [
        ['Date', 'Time', 'Category', 'Note', 'Paid by', 'Amount'],
        ...[...expenses]
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((e) => [e.date, fmtTime(e.createdAt), e.category, e.note || '', e.payMode === 'upi' ? 'UPI' : 'Cash', e.amount]),
      ],
      [11, 9, 16, 28, 9, 10]
    ),
    'Expenses'
  );

  XLSX.writeFile(wb, from === to ? `sales-report-${from}.xlsx` : `sales-report-${from}_to_${to}.xlsx`);
}
