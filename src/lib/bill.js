const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Bill maths: subtotal → discount → GST (on discounted amount) → round to nearest rupee.
 * discount: { type: 'amt' | 'pct', value: number } | null
 */
export function computeBill(lines, { discount = null, gstEnabled = false, gstRate = 0 } = {}) {
  const subtotal = r2(lines.reduce((s, l) => s + l.price * l.qty, 0));

  let discAmt = 0;
  if (discount && discount.value > 0) {
    discAmt = discount.type === 'pct' ? (subtotal * Math.min(discount.value, 100)) / 100 : discount.value;
    discAmt = r2(Math.min(subtotal, discAmt));
  }

  const taxable = r2(subtotal - discAmt);
  const taxAmt = gstEnabled && gstRate > 0 ? r2((taxable * gstRate) / 100) : 0;
  const gross = r2(taxable + taxAmt);
  const total = Math.round(gross);

  return {
    subtotal,
    discount: discAmt ? { type: discount.type, value: discount.value, amount: discAmt } : null,
    tax: taxAmt ? { rate: Number(gstRate), amount: taxAmt } : null,
    roundOff: r2(total - gross),
    total,
  };
}

/** Name to show for an item / bill line, based on the nameMode setting. */
export function primaryName(item, mode) {
  return mode === 'ta' && item.nameTa ? item.nameTa : item.name;
}
export function secondaryName(item, mode) {
  return mode === 'both' && item.nameTa ? item.nameTa : null;
}
