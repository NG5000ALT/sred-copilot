import { RATES } from "@/lib/sred/rules";

export type PayrollPerson = {
  id: string;
  name: string;
  salary: number;
  employment_type: "employee" | "contractor";
  arm_length: boolean;
  specified_employee: boolean;
};

export type ExpenditureLine = {
  person: string;
  project: string;
  salary: number;
  time_share_est: number;
  time_share_override: number | null;
  basis: { project_activity: number; total_activity: number };
  qualifying_salary: number;
  category: "salary" | "salary_specified" | "contract" | "contract_non_arm_length";
  note?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Activity-based time share (PLAN 8.7). Overrides are kept beside the estimate, never replace it.
export function buildLines(
  people: PayrollPerson[],
  activity: { person: string; project: string; count: number }[],
  totals: Map<string, number>,
  overrides: Map<string, number> = new Map(),
): ExpenditureLine[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  return activity.flatMap(({ person, project, count }) => {
    const p = byId.get(person);
    const total = totals.get(person) ?? 0;
    if (!p || !total) return [];
    const est = Math.min(1, count / total);
    const override = overrides.get(`${person}|${project}`) ?? null;
    const share = override ?? est;
    const base = p.salary * share;
    let category: ExpenditureLine["category"] = p.specified_employee ? "salary_specified" : "salary";
    let qualifying = base;
    let note: string | undefined;
    if (p.employment_type === "contractor") {
      if (p.arm_length) {
        category = "contract";
        qualifying = base * RATES.contractorShare.value;
      } else {
        category = "contract_non_arm_length";
        qualifying = 0;
        note = "Non-arm's-length contract: treated differently, needs CPA review";
      }
    }
    return [{
      person, project, salary: p.salary,
      time_share_est: round2(est), time_share_override: override,
      basis: { project_activity: count, total_activity: total },
      qualifying_salary: round2(qualifying), category, note,
    }];
  });
}

export function totals(lines: ExpenditureLine[]) {
  const salaries = lines.filter((l) => l.category.startsWith("salary")).reduce((a, l) => a + l.qualifying_salary, 0);
  const contracts = lines.filter((l) => l.category === "contract").reduce((a, l) => a + l.qualifying_salary, 0);
  // shortcut: specified-employee salary-base caps are not applied; flagged as unverified in the UI
  const proxyOverhead = salaries * RATES.proxyOverhead.value;
  const qualifying = salaries + contracts + proxyOverhead;
  const limit = RATES.expenditureLimit.value;
  const itc = Math.min(qualifying, limit) * RATES.itcEnhanced.value + Math.max(0, qualifying - limit) * RATES.itcGeneral.value;
  return {
    salaries: round2(salaries),
    contracts: round2(contracts),
    proxyOverhead: round2(proxyOverhead),
    qualifying: round2(qualifying),
    itcRefundable: round2(Math.min(qualifying, limit) * RATES.itcEnhanced.value),
    itcNonRefundable: round2(Math.max(0, qualifying - limit) * RATES.itcGeneral.value),
    itc: round2(itc),
  };
}
