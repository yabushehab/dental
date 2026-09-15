import { describe, expect, it } from "vitest";
import {
  addDays,
  dateStrInTz,
  minutesInTzDay,
  timeStrInTz,
  zonedTimeToUtc,
} from "./time";

const BAHRAIN = "Asia/Bahrain"; // UTC+3, no DST

describe("zonedTimeToUtc", () => {
  it("converts Bahrain wall time to UTC (+3)", () => {
    const utc = zonedTimeToUtc("2026-09-15", "08:00", BAHRAIN);
    expect(utc.toISOString()).toBe("2026-09-15T05:00:00.000Z");
  });

  it("handles day rollover across midnight", () => {
    const utc = zonedTimeToUtc("2026-09-15", "01:30", BAHRAIN);
    expect(utc.toISOString()).toBe("2026-09-14T22:30:00.000Z");
  });

  it("round-trips with dateStrInTz/timeStrInTz", () => {
    const utc = zonedTimeToUtc("2026-01-01", "23:45", BAHRAIN);
    expect(dateStrInTz(utc, BAHRAIN)).toBe("2026-01-01");
    expect(timeStrInTz(utc, BAHRAIN)).toBe("23:45");
  });

  it("handles a DST-observing zone (Europe/London summer)", () => {
    const utc = zonedTimeToUtc("2026-07-01", "09:00", "Europe/London"); // BST = UTC+1
    expect(utc.toISOString()).toBe("2026-07-01T08:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(() => zonedTimeToUtc("2026-9-1", "08:00", BAHRAIN)).toThrow();
    expect(() => zonedTimeToUtc("2026-09-01", "8am", BAHRAIN)).toThrow();
  });
});

describe("day helpers", () => {
  it("minutesInTzDay", () => {
    const utc = zonedTimeToUtc("2026-09-15", "08:30", BAHRAIN);
    expect(minutesInTzDay(utc, BAHRAIN)).toBe(8 * 60 + 30);
  });

  it("addDays crosses months and years", () => {
    expect(addDays("2026-09-15", 1)).toBe("2026-09-16");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
