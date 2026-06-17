import type { Goal } from "../store";

export type MealType = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "supper";
export type MealGoal = "lose" | "gain" | "maintain" | "bloat" | "energy" | "pms";

export const MEAL_TYPES: { id: MealType; label: string; emoji: string; time: string }[] = [
  { id: "breakfast",        label: "Café da manhã",   emoji: "☀️", time: "06h–09h" },
  { id: "morning_snack",    label: "Lanche da manhã", emoji: "🍎", time: "10h–11h" },
  { id: "lunch",            label: "Almoço",          emoji: "🍽️", time: "12h–14h" },
  { id: "afternoon_snack",  label: "Lanche da tarde", emoji: "🥪", time: "15h–17h" },
  { id: "dinner",           label: "Jantar",          emoji: "🌙", time: "19h–21h" },
  { id: "supper",           label: "Ceia",            emoji: "🌌", time: "21h–23h" },
];

export const MEAL_GOALS: { id: MealGoal; label: string; emoji: string }[] = [
  { id: "lose",     label: "Emagrecimento", emoji: "🔥" },
  { id: "gain",     label: "Ganho de massa", emoji: "💪" },
  { id: "maintain", label: "Manutenção",     emoji: "⚖️" },
  { id: "bloat",    label: "Desinchar",      emoji: "💧" },
  { id: "energy",   label: "Energia",        emoji: "⚡" },
  { id: "pms",      label: "TPM",            emoji: "🌸" },
];

export interface SuggestedMeal {
  id: string;
  type: MealType;
  goal: MealGoal;
  name: string;
  foodIds: string[]; // refs to FOODS
  why: string;
  bestTime: string;
  image: string;
}

const img = (q: string) => `https://images.unsplash.com/photo-${q}?auto=format&fit=crop&w=900&q=75`;

export const SUGGESTED_MEALS: SuggestedMeal[] = [
  // Café da manhã
  { id: "bf-yogurt-berries", type: "breakfast", goal: "lose", name: "Bowl de iogurte e frutas vermelhas",
    foodIds: ["yogurt","berries","chia","granola"],
    why: "Combina proteína, antioxidantes e fibras — sacia sem pesar.", bestTime: "06h–09h",
    image: img("1488477181946-6428a0291777") },
  { id: "bf-tapioca", type: "breakfast", goal: "gain", name: "Tapioca com frango e queijo",
    foodIds: ["tapioca","chicken","cottage"],
    why: "Energia + proteína de qualidade para começar o dia com força.", bestTime: "06h–09h",
    image: img("1528207776546-365bb710ee93") },
  { id: "bf-oats", type: "breakfast", goal: "energy", name: "Aveia overnight com banana",
    foodIds: ["oats","banana","peanut","cinnamon","veg-milk"],
    why: "Carbo de absorção lenta + magnésio para energia estável.", bestTime: "06h–09h",
    image: img("1505252585461-04db1eb84625") },
  { id: "bf-eggs", type: "breakfast", goal: "maintain", name: "Ovos mexidos com pão integral e abacate",
    foodIds: ["egg","wheat-bread","avocado","tomato"],
    why: "Proteína completa + gordura boa = saciedade longa.", bestTime: "06h–09h",
    image: img("1525351484163-7529414344d8") },

  // Almoço


  // Jantar
  { id: "dn-omelet", type: "dinner", goal: "lose", name: "Omelete de vegetais",
    foodIds: ["egg","spinach","tomato","zucchini","olive-oil"],
    why: "Leve, proteico e sem carbo refinado pra dormir bem.", bestTime: "19h–21h",
    image: img("1525351484163-7529414344d8") },
  { id: "dn-salmon", type: "dinner", goal: "pms", name: "Salmão com legumes",
    foodIds: ["salmon","sweet-potato","broccoli","olive-oil"],
    why: "Ômega-3 anti-inflamatório, ideal pra TPM.", bestTime: "19h–21h",
    image: img("1467003909585-2f8a72700288") },
  { id: "dn-soup", type: "dinner", goal: "bloat", name: "Sopa leve de abobrinha",
    foodIds: ["zucchini","carrot","chicken","olive-oil"],
    why: "Quente, leve e digestiva para desinchar à noite.", bestTime: "19h–21h",
    image: img("1547592180-85f173990554") },

];

export const MEAL_BY_ID: Record<string, SuggestedMeal> = Object.fromEntries(SUGGESTED_MEALS.map(m => [m.id, m]));

export function mealTypeLabel(t: MealType) { return MEAL_TYPES.find(x => x.id === t)?.label ?? t; }
export function mealGoalLabel(g: MealGoal) { return MEAL_GOALS.find(x => x.id === g)?.label ?? g; }

// Personalization: pick a daily plan based on profile/state context
export function planForGoal(g: string | undefined | null): MealGoal {
  if (g === "lose") return "lose";
  if (g === "gain_muscle") return "gain";
  if (g === "reduce_pms" || g === "bloat") return "bloat";
  if (g === "energy" || g === "routine") return "energy";
  return "maintain";
}


export function pickDailyPlan(opts: {
  baseGoal: MealGoal;
  mood?: string;
  cyclePhase?: string;
  trainedToday?: boolean;
}): SuggestedMeal[] {
  const order: MealType[] = ["breakfast","lunch","dinner"];
  return order.map(t => {
    let goalForMeal: MealGoal = opts.baseGoal;
    if (opts.mood === "bloated") goalForMeal = "bloat";
    else if (opts.cyclePhase === "menstrual" || opts.cyclePhase === "luteal") goalForMeal = "pms";
    else if (opts.trainedToday && t === "lunch") goalForMeal = "gain";

    const candidates = SUGGESTED_MEALS.filter(m => m.type === t && m.goal === goalForMeal);
    if (candidates.length) return candidates[0];
    // fallback to any meal of this type
    return SUGGESTED_MEALS.find(m => m.type === t) as SuggestedMeal;
  }).filter(Boolean);
}
