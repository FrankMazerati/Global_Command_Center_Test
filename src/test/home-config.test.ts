import { describe, it, expect } from "vitest";
import { dayPart, clampCount } from "@/lib/home-config";

describe("homepage rules", () => {
  it("greeting follows the time of day", () => {
    expect(dayPart(8)).toBe("morning");
    expect(dayPart(13)).toBe("afternoon");
    expect(dayPart(20)).toBe("evening");
  });
  it("modules show between 1 and 10 items", () => {
    expect(clampCount(0)).toBe(1);
    expect(clampCount(11)).toBe(10);
    expect(clampCount(6)).toBe(6);
  });
});
