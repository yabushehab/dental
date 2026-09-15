import { describe, expect, it } from "vitest";
import {
  DECIDUOUS_TEETH,
  PERMANENT_TEETH,
  isDeciduous,
  isUpper,
  isValidFdi,
  toothName,
} from "./fdi";

describe("FDI numbering", () => {
  it("has 32 permanent and 20 deciduous teeth", () => {
    expect(PERMANENT_TEETH).toHaveLength(32);
    expect(DECIDUOUS_TEETH).toHaveLength(20);
  });

  it("validates real FDI numbers", () => {
    expect(isValidFdi(11)).toBe(true);
    expect(isValidFdi(48)).toBe(true);
    expect(isValidFdi(55)).toBe(true);
    expect(isValidFdi(85)).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(isValidFdi(10)).toBe(false); // position 0
    expect(isValidFdi(19)).toBe(false); // permanent position > 8
    expect(isValidFdi(56)).toBe(false); // deciduous position > 5
    expect(isValidFdi(90)).toBe(false);
    expect(isValidFdi(0)).toBe(false);
  });

  it("classifies arch and dentition", () => {
    expect(isUpper(11)).toBe(true);
    expect(isUpper(36)).toBe(false);
    expect(isDeciduous(51)).toBe(true);
    expect(isDeciduous(31)).toBe(false);
  });

  it("names teeth", () => {
    expect(toothName(36)).toBe("lower left first molar");
    expect(toothName(11)).toBe("upper right central incisor");
    expect(toothName(55)).toBe("deciduous upper right second molar");
    expect(() => toothName(99)).toThrow();
  });
});
