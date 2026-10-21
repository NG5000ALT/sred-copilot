import { describe, expect, it } from "vitest";
import { decide, type Scores } from "@/lib/pipeline/decision";

const s = (u: number, h: number, sy: number, a: number, r: number) =>
  ({ uncertainty: u, hypothesis: h, systematic: sy, advancement: a, records: r }) as Scores;

describe("decide", () => {
  it("eligible needs uncertainty 2 and systematic/advancement/records >= 1", () => {
    expect(decide(s(2, 0, 1, 1, 1), []).decision).toBe("eligible");
    expect(decide(s(2, 2, 2, 2, 2), []).decision).toBe("eligible");
  });
  it("any exclusion forces not eligible", () => {
    expect(decide(s(2, 2, 2, 2, 2), ["style changes"]).decision).toBe("not_eligible");
  });
  it("a missing supporting criterion drops to borderline", () => {
    expect(decide(s(2, 2, 0, 2, 2), []).decision).toBe("borderline");
    expect(decide(s(2, 2, 2, 0, 2), []).decision).toBe("borderline");
    expect(decide(s(2, 0, 2, 2, 0), []).decision).toBe("borderline");
  });
  it("borderline needs uncertainty >= 1 and total >= 6", () => {
    expect(decide(s(1, 2, 1, 1, 1), []).decision).toBe("borderline");
    expect(decide(s(1, 1, 1, 1, 1), []).decision).toBe("not_eligible");
  });
  it("zero uncertainty is never eligible", () => {
    expect(decide(s(0, 2, 2, 2, 2), []).decision).toBe("not_eligible");
  });
});
