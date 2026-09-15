import { describe, expect, it } from "vitest";
import { BHD, formatAmount, formatMoney, parseAmount, vatOn, withVat } from "./money";

describe("parseAmount (BHD, 3 decimals)", () => {
  it("parses whole and fractional dinars", () => {
    expect(parseAmount("12.500")).toBe(12500);
    expect(parseAmount("0.005")).toBe(5);
    expect(parseAmount("7")).toBe(7000);
    expect(parseAmount("7.5")).toBe(7500);
    expect(parseAmount("-1.250")).toBe(-1250);
  });

  it("rejects too many decimals for the currency", () => {
    expect(() => parseAmount("1.2345")).toThrow();
    expect(() => parseAmount("1.055", { code: "USD", exponent: 2 })).toThrow();
  });

  it("rejects garbage", () => {
    expect(() => parseAmount("abc")).toThrow();
    expect(() => parseAmount("1,5")).toThrow();
    expect(() => parseAmount("")).toThrow();
  });
});

describe("formatAmount / formatMoney", () => {
  it("formats fils as dinars", () => {
    expect(formatAmount(12500)).toBe("12.500");
    expect(formatAmount(5)).toBe("0.005");
    expect(formatAmount(-1250)).toBe("-1.250");
    expect(formatMoney(150000, BHD)).toBe("BHD 150.000");
  });

  it("round-trips", () => {
    for (const s of ["0.000", "0.001", "99.999", "1000.500"]) {
      expect(formatAmount(parseAmount(s))).toBe(s);
    }
  });

  it("rejects float input", () => {
    expect(() => formatAmount(12.5)).toThrow();
  });
});

describe("VAT", () => {
  it("computes 10% Bahrain VAT in fils", () => {
    expect(vatOn(10000, 10)).toBe(1000);
    expect(withVat(10000, 10)).toBe(11000);
  });

  it("zero-rated healthcare", () => {
    expect(vatOn(25000, 0)).toBe(0);
  });

  it("rounds half-up at the fils", () => {
    expect(vatOn(5, 10)).toBe(1); // 0.5 fils -> 1
    expect(vatOn(4, 10)).toBe(0); // 0.4 fils -> 0
  });
});
