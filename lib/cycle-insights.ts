// Pure helpers + constants for the Cycle Insights module.
// All calculations consume real rows from `cycle_daily_logs`.

export const MOODS = [
  { id: "feliz", label: "Feliz", emoji: "😊" },
  { id: "motivada", label: "Motivada", emoji: "💪" },
  { id: "calma", label: "Calma", emoji: "🌿" },
  { id: "sensivel", label: "Sensível", emoji: "🥺" },
  { id: "ansiosa", label: "Ansiosa", emoji: "😟" },
  { id: "irritada", label: "Irritada", emoji: "😠" },
  { id: "triste", label: "Triste", emoji: "😢" },
  { id: "cansada", label: "Cansada", emoji: "😴" },
] as const;

export const SYMPTOMS = [
  { id: "colicas", label: "Cólicas" },
  { id: "inchaco", label: "Inchaço" },
  { id: "dor_cabeca", label: "Dor de cabeça" },
  { id: "acne", label: "Acne" },
  { id: "fome", label: "Fome" },
  { id: "ansiedade", label: "Ansiedade" },
  { id: "irritacao", label: "Irritação" },
  { id: "sens_seios", label: "Sensibilidade nos seios" },
  { id: "dor_costas", label: "Dor nas costas" },
  { id: "cansaco", label: "Cansaço" },
] as const;

export const ENERGY_LEVELS = [
  { id: "baixa", label: "Baixa", emoji: "🪫" },
  { id: "media", label: "Média", emoji: "🔋" },
  { id: "alta", label: "Alta", emoji: "⚡" },
] as const;

export const FLOWS = [
  { id: "nenhum", label: "Nenhum" },
  { id: "leve", label: "Leve" },
  { id: "moderado", label: "Moderado" },
  { id: "intenso", label: "Intenso" },
] as const;

export const PHASE_LABEL_PT: Record<string, string> = {
  menstrual: "Menstrual",
  follicular: "Folicular",
  ovulation: "Ovulação",
  luteal: "Lútea",
};

export interface CycleLogRow {
  id: string;
  user_id: string;
  date: string;
  cycle_day: number | null;
  cycle_phase: string | null;
  mood: string | null;
  symptoms: string[] | null;
  energy_level: string | null;
  menstrual_flow: string | null;
  notes: string | null;
}

export function labelForSymptom(id: string): string {
  return SYMPTOMS.find((s) => s.id === id)?.label ?? id;
}

export function labelForMood(id: string): string {
  return MOODS.find((m) => m.id === id)?.label ?? id;
}

export function emojiForMood(id: string): string {
  return MOODS.find((m) => m.id === id)?.emoji ?? "💗";
}

export function labelForEnergy(id: string): string {
  return ENERGY_LEVELS.find((e) => e.id === id)?.label ?? id;
}

/** Filter logs to a specific month (YYYY-MM). */
export function filterByMonth(logs: CycleLogRow[], year: number, month: number) {
  const pad = String(month).padStart(2, "0");
  const prefix = `${year}-${pad}`;
  return logs.filter((l) => l.date.startsWith(prefix));
}

/** Aggregate symptom counts across logs. */
export function countSymptoms(logs: CycleLogRow[]): { id: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of logs) {
    for (const s of l.symptoms ?? []) map.set(s, (map.get(s) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

export function countMoods(logs: CycleLogRow[]): { id: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of logs) {
    if (l.mood) map.set(l.mood, (map.get(l.mood) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

export function countEnergy(logs: CycleLogRow[]): { id: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of logs) {
    if (l.energy_level) map.set(l.energy_level, (map.get(l.energy_level) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

/** Phase where a symptom appears most often. */
export function phaseForSymptom(logs: CycleLogRow[], symptomId: string): string | null {
  const map = new Map<string, number>();
  for (const l of logs) {
    if (!l.cycle_phase) continue;
    if ((l.symptoms ?? []).includes(symptomId)) {
      map.set(l.cycle_phase, (map.get(l.cycle_phase) ?? 0) + 1);
    }
  }
  if (map.size === 0) return null;
  const [phase] = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  return phase;
}

export interface MonthlyReport {
  month: number;
  year: number;
  logsCount: number;
  periodDays: number;
  commonSymptoms: { id: string; count: number }[];
  commonMood: string | null;
  averageEnergy: string | null;
  energyByPhase: Record<string, string | null>;
}

export function buildMonthlyReport(
  logs: CycleLogRow[],
  year: number,
  month: number,
): MonthlyReport {
  const monthLogs = filterByMonth(logs, year, month);
  const periodDays = monthLogs.filter(
    (l) => l.menstrual_flow && l.menstrual_flow !== "nenhum",
  ).length;
  const symptoms = countSymptoms(monthLogs).slice(0, 3);
  const moods = countMoods(monthLogs);
  const energies = countEnergy(monthLogs);

  const energyByPhase: Record<string, string | null> = {};
  for (const phase of ["menstrual", "follicular", "ovulation", "luteal"]) {
    const phaseLogs = monthLogs.filter((l) => l.cycle_phase === phase);
    const phaseEnergies = countEnergy(phaseLogs);
    energyByPhase[phase] = phaseEnergies[0]?.id ?? null;
  }

  return {
    month,
    year,
    logsCount: monthLogs.length,
    periodDays,
    commonSymptoms: symptoms,
    commonMood: moods[0]?.id ?? null,
    averageEnergy: energies[0]?.id ?? null,
    energyByPhase,
  };
}

export const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
