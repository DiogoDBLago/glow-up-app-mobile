import { EXERCISES, exerciseMatchesMuscle, type Exercise } from "./exercises";

export interface Workout {
  id: string;
  slug: string;
  title: string;
  objective: string;
  place: "home" | "gym" | "both";
  difficulty: "Iniciante" | "Intermediário" | "Avançado";
  durationMin: number;
  muscles: string[];
  exerciseIds: string[];
  image: string;
  description?: string;
}

export type WorkoutExerciseDetail = Exercise & {
  rest: number;
  machineName?: string;
  targetMuscle: string;
};

const wimg = (q: string) => `https://images.unsplash.com/photo-${q}?auto=format&fit=crop&w=900&q=75`;

// Distinct images per workout category
const COVER = {
  glutesHome: "1571019613454-1cb2f99b2d8b",
  glutesGym: "1593079831268-3381b0db4a77",
  legsHome: "1517836357463-d25dfeac3438",
  legsGym: "1540497077202-7c8a3999166f",
  absHome: "1571902943202-507ec2618e8f",
  absGym: "1583454110551-21f2fa2afe61",
  backGym: "1581009146145-b5ef050c2e1e",
  chestGym: "1574680178050-55c6a6a96e0a",
  shouldersGym: "1532029837206-abbe2b7620e3",
  armsHome: "1599058917212-d750089bc07e",
  armsGym: "1581009146145-b5ef050c2e1e",
  fullHome: "1518611012118-696072aa579a",
  fullGym: "1534438327276-14e5300c3a48",
  hiit: "1538805060514-97d9cc17730c",
  cardioLight: "1545205597-3d9d02c29597",
  mobility: "1506629905607-c52b1c2e29d0",
  stretch: "1599447421416-3414500d18a5",
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const BASE_WORKOUTS: Omit<Workout, "slug" | "description">[] = [
  // ===== Glutes =====
  { id: "glutes-home", title: "Glúteos esculpidos em casa", objective: "Tonificar e modelar glúteos sem equipamento", place: "home", difficulty: "Iniciante", durationMin: 25, muscles: ["glutes"], exerciseIds: ["glute-bridge", "hip-thrust-sofa", "donkey-kick", "fire-hydrant", "bw-squat"], image: wimg(COVER.glutesHome) },
  { id: "glutes-home-adv", title: "Glúteos avançado em casa", objective: "Intensidade alta com cadeira e mochila", place: "home", difficulty: "Intermediário", durationMin: 35, muscles: ["glutes"], exerciseIds: ["bulgarian-chair", "hip-thrust-sofa", "donkey-kick", "fire-hydrant", "reverse-lunge"], image: wimg(COVER.glutesGym) },
  { id: "glutes-gym", title: "Glúteos volume", objective: "Hipertrofia de glúteos na academia", place: "gym", difficulty: "Intermediário", durationMin: 45, muscles: ["glutes"], exerciseIds: ["hip-thrust-machine", "leg-press-glute", "cable-kickback", "abductor-machine", "romanian-deadlift"], image: wimg(COVER.glutesGym) },
  { id: "glutes-gym-power", title: "Glúteos força", objective: "Força e definição com barra livre", place: "gym", difficulty: "Avançado", durationMin: 55, muscles: ["glutes"], exerciseIds: ["barbell-squat", "romanian-deadlift", "hip-thrust-machine", "abductor-machine"], image: wimg(COVER.glutesHome) },

  // ===== Legs =====
  { id: "legs-home", title: "Pernas fortes em casa", objective: "Força e definição com peso do corpo", place: "home", difficulty: "Iniciante", durationMin: 25, muscles: ["legs", "quads", "calves"], exerciseIds: ["bw-squat", "reverse-lunge", "step-up-chair", "wall-sit", "calf-raise-home"], image: wimg(COVER.legsHome) },
  { id: "legs-gym", title: "Pernas completas", objective: "Quadríceps, posterior e panturrilha", place: "gym", difficulty: "Avançado", durationMin: 50, muscles: ["legs", "quads", "hamstrings", "calves"], exerciseIds: ["leg-press", "hack-squat", "leg-extension", "leg-curl", "standing-calf"], image: wimg(COVER.legsGym) },
  { id: "quads-gym", title: "Quadríceps definido", objective: "Foco em quadríceps", place: "gym", difficulty: "Intermediário", durationMin: 35, muscles: ["quads"], exerciseIds: ["hack-squat", "leg-extension", "smith-lunge"], image: wimg(COVER.legsGym) },
  { id: "hamstrings-gym", title: "Posterior de coxa", objective: "Tonificar o posterior", place: "gym", difficulty: "Intermediário", durationMin: 30, muscles: ["hamstrings"], exerciseIds: ["leg-curl", "romanian-deadlift"], image: wimg(COVER.legsHome) },

  // ===== Abs / Core =====
  { id: "abs-home", title: "Barriga sequinha", objective: "Core e definição abdominal", place: "home", difficulty: "Iniciante", durationMin: 15, muscles: ["abs"], exerciseIds: ["plank", "crunch", "bicycle", "leg-raise"], image: wimg(COVER.absHome) },
  { id: "abs-intermediate", title: "Core forte", objective: "Estabilidade e força do core", place: "both", difficulty: "Intermediário", durationMin: 20, muscles: ["abs"], exerciseIds: ["plank", "leg-raise", "bicycle", "crunch", "mountain-climber"], image: wimg(COVER.absHome) },
  { id: "abs-gym", title: "Abdômen definido (academia)", objective: "Hipertrofia abdominal com máquinas", place: "gym", difficulty: "Intermediário", durationMin: 25, muscles: ["abs"], exerciseIds: ["ab-machine", "cable-crunch", "hanging-knee", "plank"], image: wimg(COVER.absGym) },

  // ===== Back =====
  { id: "back-home", title: "Costas e postura em casa", objective: "Postura e tonificação", place: "home", difficulty: "Iniciante", durationMin: 20, muscles: ["back"], exerciseIds: ["superman", "backpack-row", "shoulder-mobility"], image: wimg(COVER.backGym) },
  { id: "back-gym", title: "Costas e postura", objective: "Largura e definição das costas", place: "gym", difficulty: "Intermediário", durationMin: 40, muscles: ["back"], exerciseIds: ["lat-pulldown", "seated-row", "cable-row", "assisted-pullup", "dumbbell-row"], image: wimg(COVER.backGym) },

  // ===== Chest =====
  { id: "chest-home", title: "Peito em casa", objective: "Tonificar com flexões", place: "home", difficulty: "Iniciante", durationMin: 20, muscles: ["chest"], exerciseIds: ["knee-pushup", "pushup", "shoulder-taps"], image: wimg(COVER.chestGym) },
  { id: "chest-gym", title: "Peito definido", objective: "Volume e definição peitoral", place: "gym", difficulty: "Intermediário", durationMin: 35, muscles: ["chest"], exerciseIds: ["chest-press", "incline-db-press", "pec-deck", "cable-fly"], image: wimg(COVER.chestGym) },

  // ===== Shoulders =====
  { id: "shoulders-gym", title: "Ombros sequinhos", objective: "Definição de ombro 3D", place: "gym", difficulty: "Intermediário", durationMin: 30, muscles: ["shoulders"], exerciseIds: ["shoulder-press-machine", "lateral-raise", "cable-lateral", "rear-delt-machine"], image: wimg(COVER.shouldersGym) },
  { id: "shoulders-home", title: "Ombros em casa", objective: "Tonificar com halteres ou garrafas", place: "home", difficulty: "Iniciante", durationMin: 20, muscles: ["shoulders"], exerciseIds: ["lateral-raise", "shoulder-press", "arm-circles", "shoulder-taps"], image: wimg(COVER.shouldersGym) },

  // ===== Arms =====
  { id: "arms-home", title: "Braços femininos em casa", objective: "Tonificar bíceps e tríceps", place: "home", difficulty: "Iniciante", durationMin: 20, muscles: ["biceps", "triceps", "arms"], exerciseIds: ["bicep-curl", "tricep-dip", "arm-circles"], image: wimg(COVER.armsHome) },
  { id: "arms-gym", title: "Braços torneados", objective: "Definição de bíceps e tríceps", place: "gym", difficulty: "Intermediário", durationMin: 30, muscles: ["biceps", "triceps", "arms"], exerciseIds: ["bicep-curl", "preacher-curl", "cable-tricep", "tricep-extension"], image: wimg(COVER.armsGym) },

  // ===== Full body =====
  { id: "fullbody-home", title: "Full body em casa", objective: "Corpo todo em 30 minutos", place: "home", difficulty: "Intermediário", durationMin: 30, muscles: ["fullbody"], exerciseIds: ["bw-squat", "knee-pushup", "reverse-lunge", "plank", "jumping-jack", "glute-bridge"], image: wimg(COVER.fullHome) },
  { id: "fullbody-beginner", title: "Full body iniciante", objective: "Comece sem equipamento", place: "home", difficulty: "Iniciante", durationMin: 20, muscles: ["fullbody"], exerciseIds: ["bw-squat", "knee-pushup", "glute-bridge", "plank", "fast-march"], image: wimg(COVER.fullHome) },
  { id: "fullbody-gym", title: "Full body academia", objective: "Treino global na academia", place: "gym", difficulty: "Avançado", durationMin: 55, muscles: ["fullbody"], exerciseIds: ["barbell-squat", "chest-press", "seated-row", "shoulder-press-machine", "plank"], image: wimg(COVER.fullGym) },

  // ===== HIIT / Cardio =====
  { id: "hiit-fatburn", title: "HIIT queima total", objective: "Acelerar metabolismo em 20 min", place: "both", difficulty: "Intermediário", durationMin: 20, muscles: ["hiit", "cardio"], exerciseIds: ["jumping-jack", "burpee", "mountain-climber", "high-knees"], image: wimg(COVER.hiit) },
  { id: "hiit-easy", title: "HIIT iniciante", objective: "Cardio intenso sem impacto alto", place: "home", difficulty: "Iniciante", durationMin: 15, muscles: ["hiit", "cardio"], exerciseIds: ["jumping-jack", "burpee-easy", "skater", "high-knees"], image: wimg(COVER.hiit) },
  { id: "cardio-light", title: "Cardio leve", objective: "Cardio em dias de pouca energia", place: "home", difficulty: "Iniciante", durationMin: 15, muscles: ["cardio"], exerciseIds: ["fast-march", "jumping-jack", "skater"], image: wimg(COVER.cardioLight) },

  // ===== Mobility / Stretch =====
  { id: "mobility-day", title: "Mobilidade e respiração", objective: "Recuperação e mobilidade articular", place: "home", difficulty: "Iniciante", durationMin: 15, muscles: ["mobility"], exerciseIds: ["cat-cow", "hip-opener", "shoulder-mobility"], image: wimg(COVER.mobility) },
  { id: "stretch-period", title: "Alongamento para o ciclo", objective: "Conforto durante a menstruação", place: "home", difficulty: "Iniciante", durationMin: 15, muscles: ["stretch", "mobility"], exerciseIds: ["child-pose", "cat-cow", "hamstring-stretch", "hip-opener"], image: wimg(COVER.stretch) },
];

export const WORKOUTS: Workout[] = BASE_WORKOUTS.map((workout) => ({
  ...workout,
  slug: slugify(workout.title),
  description: workout.place === "gym"
    ? "Treino guiado para academia, com máquinas, cargas controladas e foco em técnica segura."
    : workout.place === "home"
      ? "Treino guiado para fazer em casa, com instruções simples e pouco ou nenhum equipamento."
      : "Treino flexível para adaptar entre casa e academia conforme sua rotina.",
}));

export function exercisesFor(w: Workout): Exercise[] {
  return w.exerciseIds.map(id => EXERCISES.find(e => e.id === id)!).filter(Boolean);
}

export function workoutBySlug(slugOrId: string): Workout | undefined {
  return WORKOUTS.find(w => w.slug === slugOrId || w.id === slugOrId);
}

export function detailedExercisesFor(w: Workout): WorkoutExerciseDetail[] {
  return exercisesFor(w).map((exercise) => ({
    ...exercise,
    rest: exercise.restSec,
    machineName: exercise.place === "gym" ? exercise.equipment : undefined,
    targetMuscle: exercise.muscle,
  }));
}

export function workoutsByPlace(place: "home" | "gym" | "both"): Workout[] {
  if (place === "both") return WORKOUTS;
  return WORKOUTS.filter(w => w.place === place || w.place === "both");
}

export function workoutsByMuscle(muscle: string, place: "home" | "gym" | "both" = "both"): Workout[] {
  const base = workoutsByPlace(place);
  if (muscle === "fullbody") return base.filter(w => w.muscles.includes("fullbody"));
  return base.filter(w => w.muscles.some(m => m === muscle || exerciseMatchesMuscle(m, muscle)));
}
