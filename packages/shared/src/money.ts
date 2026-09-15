/**
 * Money is ALWAYS an integer amount of the currency's minor unit
 * (fils for BHD: 1 BHD = 1000 fils). Never floats.
 */

export interface CurrencyInfo {
  code: string;
  /** 10^exponent minor units per major unit (BHD = 3, USD = 2) */
  exponent: number;
}

export const BHD: CurrencyInfo = { code: "BHD", exponent: 3 };

export function minorUnitsPerMajor(currency: CurrencyInfo): number {
  return 10 ** currency.exponent;
}

/** "12.500" (BHD) -> 12500 fils. Rejects more decimals than the currency has. */
export function parseAmount(input: string, currency: CurrencyInfo = BHD): number {
  const trimmed = input.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) throw new Error(`Invalid amount: "${input}"`);
  const [, sign, whole, frac = ""] = match;
  if (frac.length > currency.exponent) {
    throw new Error(
      `Too many decimal places for ${currency.code}: "${input}" (max ${currency.exponent})`,
    );
  }
  const minor =
    Number(whole) * minorUnitsPerMajor(currency) +
    Number(frac.padEnd(currency.exponent, "0") || "0");
  return sign === "-" ? -minor : minor;
}

/** 12500 fils -> "12.500" */
export function formatAmount(minor: number, currency: CurrencyInfo = BHD): string {
  if (!Number.isInteger(minor)) throw new Error(`Non-integer minor amount: ${minor}`);
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const per = minorUnitsPerMajor(currency);
  const whole = Math.floor(abs / per);
  const frac = String(abs % per).padStart(currency.exponent, "0");
  return currency.exponent === 0 ? `${sign}${whole}` : `${sign}${whole}.${frac}`;
}

/** 12500 fils -> "BHD 12.500" */
export function formatMoney(minor: number, currency: CurrencyInfo = BHD): string {
  return `${currency.code} ${formatAmount(minor, currency)}`;
}

/**
 * VAT on a net amount at a percent rate (e.g. 10 for 10%).
 * Half-up rounding to the minor unit — the standard invoice convention.
 */
export function vatOn(netMinor: number, ratePercent: number): number {
  if (!Number.isInteger(netMinor)) throw new Error(`Non-integer minor amount: ${netMinor}`);
  return Math.round((netMinor * ratePercent) / 100);
}

export function withVat(netMinor: number, ratePercent: number): number {
  return netMinor + vatOn(netMinor, ratePercent);
}
