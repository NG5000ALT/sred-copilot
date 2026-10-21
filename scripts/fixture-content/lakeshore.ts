import { Builder, type CompanyFixture } from "./builder";
import { addNoise } from "./noise";

// Lakeshore Vision Inc. — fictional. Computer-vision quality inspection for small manufacturers.
const people: CompanyFixture["people"] = [
  { external_id: "ben.h", name: "Ben Hollis", title: "CEO", salary: 165000, employment_type: "employee", arm_length: false, specified_employee: true },
  { external_id: "sam.r", name: "Sam Rahimi", title: "CTO", salary: 175000, employment_type: "employee", arm_length: false, specified_employee: true },
  { external_id: "priya.n", name: "Priya Natarajan", title: "ML Lead", salary: 148000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "omar.k", name: "Omar Khalil", title: "Embedded Systems Engineer", salary: 128000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "li.w", name: "Li Wei", title: "Machine Learning Engineer", salary: 122000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "mei.c", name: "Mei Chen", title: "Research Engineer, Vision", salary: 118000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "raj.s", name: "Raj Sandhu", title: "Data Engineer", salary: 112000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "ana.g", name: "Ana Gomes", title: "Data Labelling Contractor", salary: 54000, employment_type: "contractor", arm_length: true, specified_employee: false },
  { external_id: "dana.m", name: "Dana Moreau", title: "Backend Engineer", salary: 115000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "kev.o", name: "Kevin Osei", title: "Backend Engineer", salary: 108000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "felix.t", name: "Felix Tremblay", title: "Frontend Engineer", salary: 105000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "jo.p", name: "Jo Park", title: "Product Designer", salary: 98000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "zoe.l", name: "Zoe Laurent", title: "Product Manager", salary: 112000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "lucas.f", name: "Lucas Ferreira", title: "QA Engineer", salary: 92000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "carla.d", name: "Carla Dubois", title: "Account Executive", salary: 85000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "tom.b", name: "Tom Brennan", title: "Customer Support Lead", salary: 72000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "nina.v", name: "Nina Varga", title: "Operations & People", salary: 80000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "ivan.p", name: "Ivan Petrov", title: "Firmware Contractor", salary: 60000, employment_type: "contractor", arm_length: true, specified_employee: false },
].map((p) => ({ ...p, jira: p.external_id, slack: p.external_id }));

const channels = { general: "C01", "ml-edge": "C02", "ml-research": "C03", eng: "C04", sales: "C05", support: "C06", design: "C07", data: "C08", hiring: "C09" };

function build() {
  const b = new Builder("lakeshore-vision.example", channels);

  // ---------- A1: sub-50 ms defect detection on low-power ARM ----------
  b.epic("LV-12", "Real-time defect detection on low-power ARM boards", "priya.n", "2026-01-12 14:00",
    "Goal: run the defect detector at under 50 ms per frame on the Cortex-A72 inspection board (4 cores, no NPU) without losing more than 1 point of mAP. Current model: 92.4 mAP at 180 ms per frame. Customers on older lines cannot add a GPU box. We do not know whether a detector this small can keep accuracy on defects under 8 px once quantized; published INT8 results are mostly on ImageNet classification, not small-object detection.");
  b.issue("LV-113", "LV-12", "Baseline latency and accuracy on ARM board", "omar.k", "2026-01-19 15:30",
    "Profile the FP32 detector on the Cortex-A72 board with the 1,240-image held-out set. Record per-layer latency and mAP by defect size bucket.");
  b.comment("LV-113", "omar.k", "2026-01-23 16:10",
    "Baseline done. FP32: 180 ms per frame, 92.4 mAP overall, 81.0 mAP on defects under 8 px. 61% of time is in the first three conv blocks. Full profile in the A1 experiment log.");
  b.issue("LV-118", "LV-12", "Experiment 1: post-training INT8 quantization", "li.w", "2026-02-02 10:00",
    "Hypothesis: post-training static INT8 quantization with 500 calibration images gets us under 50 ms with under 1 point mAP loss, as reported for classification models.");
  b.comment("LV-118", "li.w", "2026-02-11 17:45",
    "Result: latency 41 ms (meets target) but mAP fell to 84.1 overall and to 58.3 on defects under 8 px. Hypothesis rejected. Small defects are lost because activation ranges in the first blocks are dominated by bright background pixels.");
  b.comment("LV-118", "priya.n", "2026-02-12 09:20",
    "Agree we close this as failed. Per-tensor calibration cannot represent the small-defect activations. Next: try pruning to keep FP32 precision, in parallel with a QAT plan.");
  b.issue("LV-124", "LV-12", "Experiment 2: structured channel pruning", "omar.k", "2026-02-16 11:00",
    "Hypothesis: removing 50% of channels in the backbone keeps small-defect accuracy because precision stays FP32, and halves latency.");
  b.comment("LV-124", "omar.k", "2026-03-06 15:00",
    "Result: 50% pruning plus 20 epochs fine-tuning gives 88 ms and 90.9 mAP. Accuracy is fine but latency is not close to 50 ms. 70% pruning reaches 61 ms but mAP drops to 86.2. Closing as failed for the latency target.");
  b.issue("LV-131", "LV-12", "Experiment 3: quantization-aware training with distillation", "li.w", "2026-03-09 10:30",
    "Hypothesis: quantization-aware training with per-channel weight scales, keeping the first and last layers in FP16, and distilling from the FP32 teacher recovers small-defect accuracy at INT8 speed.");
  b.comment("LV-131", "li.w", "2026-04-03 18:20",
    "Run 4 of 6: 46 ms per frame, 91.8 mAP overall, 79.6 mAP on defects under 8 px. Within 1 point of baseline overall. Mixed precision on the first block costs 5 ms versus full INT8.");
  b.comment("LV-131", "priya.n", "2026-04-06 09:00",
    "Repeated run 4 with three seeds: 91.6 to 91.9 mAP, 45 to 47 ms. Result is stable. Distillation weight 0.7 was the key setting; without distillation QAT gave 89.0 mAP.");
  b.issue("LV-137", "LV-12", "Thermal throttling check under continuous load", "omar.k", "2026-04-13 13:00",
    "Run the QAT model for 8 hours on the line simulator. Check whether latency stays under 50 ms once the board heats up.", "task");
  b.comment("LV-137", "omar.k", "2026-04-20 16:40",
    "After 2 hours the board throttles and latency rises to 58 ms. With the heatsink revision and 3 worker threads instead of 4, latency holds at 48 ms over 8 hours.");
  b.issue("LV-142", "LV-12", "Package QAT model for customer firmware", "ivan.p", "2026-04-27 10:00",
    "Build the release image with the INT8 runtime and the new model. Routine packaging work.", "task");
  b.doc("a1-experiment-log", "A1 ARM latency experiment log", "li.w", "2026-04-08 12:00",
    "Experiment log, project A1 (low-latency defect detection).\n2026-01-23 Baseline FP32: 180 ms, 92.4 mAP, 81.0 mAP under 8 px.\n2026-02-11 Exp 1 PTQ INT8 (500 calibration images): 41 ms, 84.1 mAP, 58.3 mAP under 8 px. Failed on accuracy.\n2026-03-06 Exp 2 pruning 50%: 88 ms, 90.9 mAP. Pruning 70%: 61 ms, 86.2 mAP. Failed on latency.\n2026-04-03 Exp 3 QAT + distillation, first block FP16: 46 ms, 91.8 mAP, 79.6 mAP under 8 px. Passed.\n2026-04-06 Seeds x3: 91.6 to 91.9 mAP, 45 to 47 ms.\nOpen question: whether the same recipe holds for the reflective-surface model in A2.");
  const t1 = b.msg("ml-edge", "li.w", "2026-02-11 18:02", "PTQ is a bust for small defects. 41 ms but we lose 23 points of mAP on the under-8 px bucket. The papers we based this on only report classification.");
  b.msg("ml-edge", "omar.k", "2026-02-11 18:15", "Expected something but not that much. Want me to try pruning so we stay FP32?", t1);
  b.msg("ml-edge", "priya.n", "2026-02-11 18:40", "Yes. And Li, can you write up a QAT plan with distillation? Nobody seems to have published QAT numbers for tiny-object detectors on CPU-only ARM, so we have to find out.", t1);
  const t2 = b.msg("ml-edge", "omar.k", "2026-03-06 15:12", "Pruning results: 88 ms at 50%, 61 ms at 70% but mAP 86.2. Not going to make 50 ms this way.");
  b.msg("ml-edge", "sam.r", "2026-03-06 15:30", "OK. Let's put everything on QAT. If QAT fails too we tell the two pilot customers they need the GPU box.", t2);
  b.msg("ml-edge", "li.w", "2026-04-03 18:30", "QAT + distillation run 4: 46 ms, 91.8 mAP. First time we are under 50 ms and within a point of baseline.");
  b.msg("ml-edge", "omar.k", "2026-04-20 16:45", "Heads up: under continuous load the board throttles to 58 ms after 2 hours. Heatsink rev + 3 threads holds 48 ms for 8 hours.");

  // ---------- A2: few-shot defects on reflective metal ----------
  b.epic("LV-40", "Defect detection on reflective metal with under 200 labelled images", "mei.c", "2026-03-02 10:00",
    "A new customer machines chrome and brushed aluminium parts. Specular highlights look like scratches to the current model. They can only provide 180 labelled images. Uncertainty: whether few-shot methods that work on matte surfaces transfer to specular surfaces at all. Target: recall 0.90 at a false-positive rate under 10%.");
  b.issue("LV-151", "LV-40", "Experiment 1: fine-tune existing detector on 180 images", "mei.c", "2026-03-09 11:00",
    "Hypothesis: standard fine-tuning with heavy augmentation is enough for 180 images.");
  b.comment("LV-151", "mei.c", "2026-03-20 17:00",
    "Result: recall 0.62, false-positive rate 31%. Most false positives sit on specular highlights. Fine-tuning alone does not work.");
  b.issue("LV-156", "LV-40", "Experiment 2: synthetic specular highlight augmentation", "mei.c", "2026-03-23 10:00",
    "Hypothesis: rendering synthetic highlights onto defect-free images teaches the model that highlights are not defects. Generate 2,000 augmented images with a Phong highlight model.");
  b.comment("LV-156", "mei.c", "2026-04-17 16:30",
    "Result: false-positive rate down to 18%, recall 0.66. Better but highlights with sharp edges still trigger detections. Synthetic highlights look too smooth.");
  b.comment("LV-156", "priya.n", "2026-04-18 10:15",
    "Worth testing a highlight mask as a preprocessing step instead of hoping the model learns it.");
  b.issue("LV-163", "LV-40", "Experiment 3: prototypical network with highlight masking", "mei.c", "2026-04-27 10:00",
    "Hypothesis: masking saturated pixels before feature extraction, plus a prototypical few-shot head pretrained on our matte-surface data, separates highlights from scratches.");
  b.comment("LV-163", "mei.c", "2026-05-29 18:00",
    "Result: recall 0.81, false-positive rate 9%. Ablation: highlight masking alone gives most of the gain (FPR 31% to 14%), the prototypical head adds the rest. Recall is still below the 0.90 target.");
  b.comment("LV-163", "li.w", "2026-06-03 11:30",
    "Tried the A1 QAT recipe on this model: 52 ms on the ARM board, recall drops to 0.78. Specular model is harder to quantize.");
  b.issue("LV-170", "LV-40", "Collect 60 more labelled images from customer line", "ana.g", "2026-06-08 09:00",
    "Label 60 additional chrome part images following the defect taxonomy.", "task");
  b.comment("LV-170", "ana.g", "2026-06-26 15:00", "Done, 60 images labelled and reviewed. Total is now 240.");
  b.doc("a2-results", "A2 reflective surfaces results table", "mei.c", "2026-06-05 12:00",
    "A2 results. Dataset: 180 labelled chrome and aluminium images, 5-fold cross-validation.\nExp 1 fine-tune: recall 0.62, FPR 31%.\nExp 2 synthetic highlights (2,000 images): recall 0.66, FPR 18%.\nExp 3 masking + prototypical head: recall 0.81, FPR 9%.\nMasking only: FPR 14%.\nConclusion so far: highlight masking matters more than model choice. Recall target of 0.90 not reached.");
  const t3 = b.msg("ml-research", "mei.c", "2026-03-20 17:10", "Fine-tune on the chrome set is bad: recall 0.62, FPR 31%. The model calls every highlight a scratch.");
  b.msg("ml-research", "priya.n", "2026-03-20 17:30", "Not surprised. None of the few-shot papers test on specular surfaces. Let's see if synthetic highlights help.", t3);
  b.msg("ml-research", "mei.c", "2026-05-29 18:10", "Masking + prototypical head: recall 0.81, FPR 9%. Masking is doing most of the work. Still short of 0.90 recall.");
  b.msg("ml-research", "sam.r", "2026-05-30 09:05", "Good progress. Let's keep A2 going into Q3 with the extra 60 images.");

  // ---------- A3: Stripe billing (routine) ----------
  b.epic("LV-60", "Migrate billing to Stripe and add usage-based pricing", "dana.m", "2026-02-02 09:00",
    "Move invoicing from manual QuickBooks invoices to Stripe Billing. Add metered usage pricing per inspected part. Standard Stripe integration.");
  b.issue("LV-61", "LV-60", "Set up Stripe products and prices", "dana.m", "2026-02-05 10:00", "Create products, metered prices, tax settings for Ontario HST.", "task");
  b.issue("LV-62", "LV-60", "Report usage records nightly", "kev.o", "2026-02-12 10:00", "Nightly job sends inspected-part counts to Stripe usage records API.", "task");
  b.comment("LV-62", "kev.o", "2026-02-24 14:00", "Done following the Stripe docs example. Idempotency keys per customer per day.");
  b.issue("LV-63", "LV-60", "Customer portal link in settings", "felix.t", "2026-02-20 10:00", "Embed Stripe customer portal link.", "task");
  b.issue("LV-64", "LV-60", "Migrate 14 existing customers to Stripe", "dana.m", "2026-03-02 10:00", "Create customers and subscriptions, send notice emails.", "task");
  b.comment("LV-64", "dana.m", "2026-03-13 16:00", "All 14 customers migrated. One invoice had wrong HST, fixed manually.");
  b.msg("eng", "dana.m", "2026-02-24 14:30", "Stripe usage reporting is live in staging. Pretty much the textbook setup.");
  b.msg("eng", "kev.o", "2026-03-13 16:20", "Billing migration done. Closing LV-60 next week after first invoice run.");

  // ---------- A4: dashboard redesign (style change) ----------
  b.epic("LV-75", "Customer dashboard redesign", "jo.p", "2026-05-04 10:00",
    "Refresh the customer dashboard look and feel: new colour palette, typography, card layout and dark mode, based on customer feedback that it looks dated.");
  b.issue("LV-76", "LV-75", "New design system tokens", "jo.p", "2026-05-06 10:00", "Colours, type scale, spacing tokens in Figma.", "task");
  b.issue("LV-77", "LV-75", "Implement new dashboard layout", "felix.t", "2026-05-18 10:00", "Rebuild dashboard pages with the new cards and charts.", "task");
  b.comment("LV-77", "felix.t", "2026-06-12 15:00", "New layout shipped behind a flag. Dark mode done.");
  b.issue("LV-78", "LV-75", "Usability review with 3 customers", "zoe.l", "2026-06-15 10:00", "Walk 3 customers through the new dashboard.", "task");
  b.comment("LV-78", "zoe.l", "2026-06-25 11:00", "Customers liked the new look. Asked for bigger defect thumbnails.");
  b.msg("design", "jo.p", "2026-05-06 11:00", "Posted the new palette and type scale for the dashboard refresh. Going for calmer greys and one accent.");
  b.msg("design", "felix.t", "2026-06-12 15:10", "Dashboard redesign is behind the flag in prod. Dark mode too.");

  // ---------- A5: auto-labelling from customer feedback (borderline, thin) ----------
  b.epic("LV-90", "Auto-label images from customer feedback", "raj.s", "2026-06-15 10:00",
    "Use operator accept/reject clicks as weak labels to grow the training set automatically.");
  b.issue("LV-91", "LV-90", "Pipeline to export operator feedback as labels", "raj.s", "2026-06-17 10:00", "Nightly export of accept/reject events joined to images.", "task");
  b.comment("LV-91", "raj.s", "2026-07-20 15:00", "Spot check of 200 feedback labels against Ana's manual labels: about 12% disagree. Not sure yet if training on these helps or hurts.");
  b.msg("data", "raj.s", "2026-07-20 15:10", "Feedback labels are noisy, ~12% disagreement with manual labels. Unclear whether we can trust them for training. Might try a noise-robust loss later.");
  b.msg("data", "priya.n", "2026-07-21 09:00", "Let's park it until A2 is done. Keep the export running.");

  // ---------- Out-of-year item (must be filtered by date range) ----------
  b.msg("ml-edge", "priya.n", "2025-12-10 15:00", "Kickoff idea for next year: can we get the detector under 50 ms on the ARM board? Two pilots asked.");

  addNoise(b, "LV", 300, {
    support: ["tom.b"], sales: ["carla.d", "ben.h"], general: ["nina.v", "ben.h", "sam.r"], hiring: ["nina.v", "sam.r"],
    engineers: ["dana.m", "kev.o", "felix.t", "lucas.f", "zoe.l"],
    rd: ["priya.n", "li.w", "omar.k", "mei.c", "raj.s"],
  }, 2026, 7);
  return b;
}

export const lakeshore: CompanyFixture = {
  slug: "lakeshore-vision",
  company: {
    name: "Lakeshore Vision Inc.", industry: "Software: computer-vision quality inspection", city: "Toronto, ON", size: 18,
    fiscal_year_end: "12-31", description: "Computer-vision quality inspection software for small manufacturers. Synthetic demo company.",
  },
  people,
  build,
};
