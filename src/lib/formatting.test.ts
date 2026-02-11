import { describe, it, expect } from "vitest";
import { formatCompactNumber } from "./formatting";

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
