function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const XRAY_1600_PRICE_FALLBACK = 550;
export const XRAY_REMAINING_PRICE_FALLBACK = 400;
export const XRAY_1502_PRICE_FALLBACK = 450;

const XRAY_1600_COMMISSION_RATE = 0.245;
const XRAY_1502_COMMISSION_RATE = 0.275;
const XRAY_REMAINING_DEDUCTION = 110;

export function calcXray1600Pool(revenue: number, price: number): number {
  if (price <= 0) return 0;
  return round2((revenue / price) * price * XRAY_1600_COMMISSION_RATE);
}

export function calcXray1502Pool(revenue: number, price: number): number {
  if (price <= 0) return 0;
  return round2((revenue / price) * price * XRAY_1502_COMMISSION_RATE);
}

export function calcXrayRemainingPool(revenue: number, price: number): number {
  if (price <= 0) return 0;
  return round2((revenue / price) * XRAY_REMAINING_DEDUCTION);
}
