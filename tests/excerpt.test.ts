import { describe, expect, it } from "vitest";
import { stripPii, validExcerpt } from "@/lib/pipeline/excerpt";

describe("excerpts", () => {
  const body = "We tried INT8 quantization and lost 13 points of mAP.";
  it("keeps exact substrings", () => expect(validExcerpt("lost 13 points", body)).toBe("lost 13 points"));
  it("drops paraphrases", () => expect(validExcerpt("lost thirteen points", body)).toBeNull());
  it("drops empty", () => expect(validExcerpt("  ", body)).toBeNull());
  it("strips email and phone", () =>
    expect(stripPii("mail priya@lakeshore.example or 416-555-0199")).toBe("mail [email] or [phone]"));
});
