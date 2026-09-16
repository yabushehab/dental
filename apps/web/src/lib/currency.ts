import type { CurrencyInfo } from "@dentalos/shared";

export function orgCurrency(org: { currency: string; currencyExponent: number }): CurrencyInfo {
  return { code: org.currency, exponent: org.currencyExponent };
}
