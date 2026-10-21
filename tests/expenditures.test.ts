import { describe, expect, it } from "vitest";
import { buildLines, totals, type PayrollPerson } from "@/lib/pipeline/expenditures";

const people: PayrollPerson[] = [
  { id: "a", name: "A", salary: 100000, employment_type: "employee", arm_length: true, specified_employee: false },
  { id: "c", name: "C", salary: 50000, employment_type: "contractor", arm_length: true, specified_employee: false },
  { id: "n", name: "N", salary: 50000, employment_type: "contractor", arm_length: false, specified_employee: false },
];
const totalsMap = new Map([["a", 10], ["c", 4], ["n", 2]]);
const activity = [
  { person: "a", project: "p1", count: 4 },
  { person: "c", project: "p1", count: 2 },
  { person: "n", project: "p1", count: 2 },
];

describe("expenditures", () => {
  it("computes time share from activity counts", () => {
    const [l] = buildLines(people, activity, totalsMap);
    expect(l.time_share_est).toBe(0.4);
    expect(l.qualifying_salary).toBe(40000);
    expect(l.basis).toEqual({ project_activity: 4, total_activity: 10 });
  });
  it("override takes precedence but keeps the estimate", () => {
    const [l] = buildLines(people, activity, totalsMap, new Map([["a|p1", 0.5]]));
    expect(l.time_share_est).toBe(0.4);
    expect(l.time_share_override).toBe(0.5);
    expect(l.qualifying_salary).toBe(50000);
  });
  it("counts arm's-length contractors at 80%, non-arm's-length at 0 with a note", () => {
    const lines = buildLines(people, activity, totalsMap);
    expect(lines[1].qualifying_salary).toBe(20000);
    expect(lines[2].qualifying_salary).toBe(0);
    expect(lines[2].note).toBeTruthy();
  });
  it("totals add proxy overhead and the ITC", () => {
    const t = totals(buildLines(people, activity, totalsMap));
    expect(t.salaries).toBe(40000);
    expect(t.contracts).toBe(20000);
    expect(t.proxyOverhead).toBe(22000);
    expect(t.qualifying).toBe(82000);
    expect(t.itc).toBe(28700);
  });
  it("applies the general rate above the expenditure limit", () => {
    const big = [{ ...people[0], salary: 10_000_000 }];
    const t = totals(buildLines(big, [{ person: "a", project: "p", count: 1 }], new Map([["a", 1]])));
    expect(t.itcRefundable).toBe(2_100_000);
    expect(t.itcNonRefundable).toBeCloseTo((15_500_000 - 6_000_000) * 0.15, 2);
  });
});
