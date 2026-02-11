import { describe, it, expect } from "vitest";
import { formatCompactNumber, formatShortDuration, formatRelativeTime } from "./formatting";

describe("formatCompactNumber", () => {
  it("formats large numbers in scientific notation with 3 significant digits", () => {
    expect(formatCompactNumber(2502836856)).toBe("2.50e9");
    expect(formatCompactNumber(1000000000000000)).toBe("1.00e15");
  });

  it("formats thousands in scientific notation", () => {
    expect(formatCompactNumber(1234)).toBe("1.23e3");
    expect(formatCompactNumber(1000)).toBe("1.00e3");
  });

  it("formats small numbers without scientific notation", () => {
    expect(formatCompactNumber(42)).toBe("42.0");
    expect(formatCompactNumber(100)).toBe("100");
    expect(formatCompactNumber(999)).toBe("999");
  });

  it("formats zero", () => {
    expect(formatCompactNumber(0)).toBe("0.00");
  });
});

describe("formatShortDuration", () => {
  it("formats seconds only", () => {
    expect(formatShortDuration(30)).toBe("30sec");
  });

  it("formats minutes", () => {
    expect(formatShortDuration(120)).toBe("2min");
  });

  it("formats hours and minutes", () => {
    expect(formatShortDuration(3 * 3600 + 15 * 60)).toBe("3h15min");
  });

  it("formats days and hours", () => {
    expect(formatShortDuration(2 * 86400 + 5 * 3600)).toBe("2d5h");
  });

  it("formats weeks and days", () => {
    expect(formatShortDuration(3 * 7 * 86400 + 3 * 86400)).toBe("3w3d");
  });

  it("formats zero", () => {
    expect(formatShortDuration(0)).toBe("0sec");
  });

  it("limits to two parts", () => {
    expect(formatShortDuration(2 * 7 * 86400 + 3 * 86400 + 5 * 3600)).toBe("2w3d");
  });
});

describe("formatRelativeTime", () => {
  const now = 1000000;

  it("formats future time", () => {
    const target = now + 3 * 7 * 86400 * 1000 + 3 * 86400 * 1000;
    expect(formatRelativeTime(target, now)).toBe("in 3w3d");
  });

  it("formats past time", () => {
    const target = now - 2 * 3600 * 1000;
    expect(formatRelativeTime(target, now)).toBe("2h ago");
  });
});
