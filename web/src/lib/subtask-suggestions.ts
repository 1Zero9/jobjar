const SUGGESTION_MAP: Array<{ keywords: string[]; steps: string[] }> = [
  {
    keywords: ["paint", "painting", "repaint"],
    steps: ["Clear furniture", "Tape edges", "Apply primer", "First coat", "Second coat", "Touch up", "Clean up"],
  },
  {
    keywords: ["decorate", "decorating"],
    steps: ["Clear room", "Fill & sand walls", "Apply undercoat", "Paint walls", "Paint trim", "Replace fixtures"],
  },
  {
    keywords: ["deep clean", "spring clean"],
    steps: ["Declutter", "Dust high surfaces", "Clean windows", "Scrub bathroom", "Vacuum throughout", "Mop floors"],
  },
  {
    keywords: ["clean", "cleaning", "tidy", "tidying", "hoover", "vacuum"],
    steps: ["Declutter", "Dust surfaces", "Vacuum", "Mop floors", "Wipe down", "Put away"],
  },
  {
    keywords: ["fix", "repair", "mend", "patch"],
    steps: ["Assess the problem", "Source materials", "Do the repair", "Test & check"],
  },
  {
    keywords: ["install", "fit", "mount", "hang"],
    steps: ["Measure up", "Buy materials", "Prepare the area", "Install", "Check & finish"],
  },
  {
    keywords: ["build", "assemble", "flat pack"],
    steps: ["Read instructions", "Sort parts", "Assemble frame", "Fit panels", "Check stability"],
  },
  {
    keywords: ["garden", "gardening", "lawn", "mow", "plant", "weed"],
    steps: ["Clear weeds", "Mow lawn", "Edge borders", "Trim hedges", "Water plants", "Tidy up"],
  },
  {
    keywords: ["move", "moving", "pack", "packing"],
    steps: ["Declutter first", "Buy boxes", "Pack room by room", "Label boxes", "Load van", "Unpack essentials"],
  },
  {
    keywords: ["bathroom", "shower", "toilet"],
    steps: ["Clean toilet", "Clean sink & taps", "Clean shower/bath", "Wipe tiles", "Mop floor", "Restock supplies"],
  },
  {
    keywords: ["kitchen"],
    steps: ["Clear worktops", "Clean oven", "Wipe surfaces", "Clean sink", "Mop floor", "Restock"],
  },
  {
    keywords: ["diy", "project"],
    steps: ["Plan the work", "Get materials", "Do the work", "Tidy up", "Final check"],
  },
];

export function getSuggestedSteps(title: string): string[] {
  const lower = title.toLowerCase();
  // Check multi-word keywords first so "deep clean" beats "clean"
  for (const entry of SUGGESTION_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.steps;
    }
  }
  return [];
}
