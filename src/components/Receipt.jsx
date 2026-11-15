import { billNoStr, fmtDate, fmtTime } from '../lib/utils';
import { translate, localeOf } from '../lib/i18n';

const money = (n) => Number(n || 0).toFixed(2);

const S = {
  page: {
    width: '58mm',
    boxSizing: 'border-box',
    padding: '2mm 2.5mm 8mm',
    fontFamily: 'ui-monospace, Consolas, "Courier New", "Nirmala UI", "Noto Sans Tamil", monospace',
    fontSize: '10.5px',
    lineHeight: 1.35,
    color: '#000',
    background: '#fff',
  },
  center: { textAlign: 'center' },
  row: { display: 'flex', justifyContent: 'space-between', gap: '2mm' },
  dash: { borderTop: '1px dashed #000', margin: '1.5mm 0' },
  double: { borderTop: '3px double #000', margin: '1.5mm 0' },
  th: { fontWeight: 700, padding: '0.5mm 0', borderBottom: '1px dashed #000' },
  td: { padding: '0.8mm 0', verticalAlign: 'top' },
  num: { textAlign: 'right', whiteSpace: 'nowrap' },
};

/** Standard 58mm thermal receipt: header, bill info, # | Item | Qty | Rate | Amt, totals, payment, footer. */
export default function Receipt({ bill, settings: s, qr }) {
  const L = (k) => translate(s.lang, k);
  const loc = localeOf(s.lang);
  const mode = s.nameMode;
  const tax = bill.tax;
  const half = tax ? tax.amount / 2 : 0;
  const subtotal = bill.subtotal ?? bill.items.reduce((t, l) => t + l.price * l.qty, 0);
  const totalQty = bill.items.reduce((t, l) => t + l.qty, 0);
  const payLabel = bill.payMode === 'upi' ? 'UPI' : s.lang === 'ta' ? L('Cash') : 'CASH';
  const contact = [s.phone && `${L('Ph')}: ${s.phone}`, tax && s.gstin && `GSTIN: ${s.gstin}`].filter(Boolean);

  return (
    <div style={S.page}>
      {/* header */}
      <div style={S.center}>
        <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.3px' }}>{s.shopName}</div>
        {s.address && <div>{s.address}</div>}
        {contact.map((c) => (
          <div key={c}>{c}</div>
        ))}
        {tax && <div style={{ fontWeight: 700, marginTop: '1mm' }}>TAX INVOICE</div>}
      </div>

      <div style={S.dash} />

      {/* bill info */}
      <div style={S.row}>
        <span>
          {L('Bill No')}: <b>{billNoStr(bill.billNo)}</b>
        </span>
        <span>{fmtDate(bill.createdAt, loc)}</span>
      </div>
      <div style={S.row}>
        <span>
          {L('Payment')}: <b>{payLabel}</b>
        </span>
        <span>{fmtTime(bill.createdAt, loc)}</span>
      </div>

      <div style={S.dash} />

      {/* items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '4mm' }} />
          <col />
          <col style={{ width: '6mm' }} />
          <col style={{ width: '10.5mm' }} />
          <col style={{ width: '11.5mm' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...S.th, textAlign: 'left' }}>#</th>
            <th style={{ ...S.th, textAlign: 'left' }}>{L('Item')}</th>
            <th style={{ ...S.th, ...S.num }}>{L('Qty')}</th>
            <th style={{ ...S.th, ...S.num }}>{L('Rate')}</th>
            <th style={{ ...S.th, ...S.num }}>{L('Amt')}</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((l, i) => (
            <tr key={i}>
              <td style={S.td}>{i + 1}</td>
              <td style={{ ...S.td, wordBreak: 'break-word', paddingRight: '1mm' }}>
                {mode === 'ta' && l.nameTa ? l.nameTa : l.name}
                {mode === 'both' && l.nameTa && <div style={{ fontSize: '9.5px' }}>{l.nameTa}</div>}
              </td>
              <td style={{ ...S.td, ...S.num }}>{l.qty}</td>
              <td style={{ ...S.td, ...S.num }}>{money(l.price)}</td>
              <td style={{ ...S.td, ...S.num }}>{money(l.price * l.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={S.dash} />

      <div style={S.row}>
        <span>
          {L('Items')}: {bill.items.length}
        </span>
        <span>
          {L('Qty')}: {totalQty}
        </span>
      </div>

      {/* totals */}
      <div style={{ marginTop: '1mm' }}>
        <div style={S.row}>
          <span>{L('Subtotal')}</span>
          <span>{money(subtotal)}</span>
        </div>
        {bill.discount && (
          <div style={S.row}>
            <span>
              {L('Discount')}
              {bill.discount.type === 'pct' ? ` (${bill.discount.value}%)` : ''}
            </span>
            <span>-{money(bill.discount.amount)}</span>
          </div>
        )}
        {tax && (
          <>
            <div style={S.row}>
              <span>CGST @ {tax.rate / 2}%</span>
              <span>{money(half)}</span>
            </div>
            <div style={S.row}>
              <span>SGST @ {tax.rate / 2}%</span>
              <span>{money(half)}</span>
            </div>
          </>
        )}
        {bill.roundOff ? (
          <div style={S.row}>
            <span>{L('Round off')}</span>
            <span>
              {bill.roundOff > 0 ? '+' : ''}
              {money(bill.roundOff)}
            </span>
          </div>
        ) : null}
      </div>

      <div style={S.double} />
      <div style={{ ...S.row, fontSize: '14px', fontWeight: 700 }}>
        <span>{L('TOTAL')}</span>
        <span>Rs. {money(bill.total)}</span>
      </div>
      <div style={S.double} />

      {/* payment */}
      {bill.received ? (
        <>
          <div style={S.row}>
            <span>{L('Cash received')}</span>
            <span>{money(bill.received)}</span>
          </div>
          <div style={S.row}>
            <span>{L('Balance')}</span>
            <span>{money(bill.received - bill.total)}</span>
          </div>
          <div style={S.dash} />
        </>
      ) : null}

      {qr && (
        <div style={{ ...S.center, marginTop: '2mm' }}>
          <img src={qr} alt="" style={{ width: '30mm', height: '30mm' }} />
          <div>{L('Scan to pay via UPI')}</div>
          <div style={S.dash} />
        </div>
      )}

      {s.footer && <div style={{ ...S.center, marginTop: '1mm' }}>{s.footer}</div>}
    </div>
  );
}
