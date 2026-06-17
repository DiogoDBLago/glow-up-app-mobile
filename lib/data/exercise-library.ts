// Exercise library — 100+ entries. User-built plans select from this list.

export type WMuscle =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "core" | "abs" | "glutes" | "quads" | "hamstrings" | "calves" | "full_body";

export type WEquipment =
  | "bodyweight" | "dumbbells" | "barbells" | "machines" | "cables" | "bands" | "kettlebell";

export type WPlace = "home" | "gym" | "both";
export type WDifficulty = "beginner" | "intermediate" | "advanced";

export interface LibraryExercise {
  id: string;
  name: string;
  muscle: WMuscle;
  equipment: WEquipment;
  place: WPlace;
  difficulty: WDifficulty;
  kcalPerMin: number;        // rough estimate, used for session kcal
  image: string;
  cues: string[];
  defaultSets: number;
  defaultReps: string;
  defaultRestSec: number;
}

export const MUSCLE_LABELS: Record<WMuscle, string> = {
  chest: "Peito",
  back: "Costas",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraços",
  core: "Core",
  abs: "Abdômen",
  glutes: "Glúteos",
  quads: "Quadríceps",
  hamstrings: "Posteriores",
  calves: "Panturrilhas",
  full_body: "Corpo todo",
};

export const EQUIPMENT_LABELS: Record<WEquipment, string> = {
  bodyweight: "Peso do corpo",
  dumbbells: "Halteres",
  barbells: "Barra",
  machines: "Máquinas",
  cables: "Cabos",
  bands: "Elásticos",
  kettlebell: "Kettlebell",
};

export const DIFFICULTY_LABELS: Record<WDifficulty, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

// Image helper — Unsplash with stable IDs, grouped roughly by muscle theme
const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

const PIC = {
  chest: ["1583454110551-21f2fa2afe61", "1571019613454-1cb2f99b2d8b", "1574680178050-55c6a6a96e0a"],
  back: ["1581009146145-b5ef050c2e1e", "1534438327276-14e5300c3a48", "1583500178690-f7eb02bba0ad"],
  shoulders: ["1534258936925-c58bed479fcb", "1532029837206-abbe2b7620e3", "1581009146145-b5ef050c2e1e"],
  arms: ["1581009146145-b5ef050c2e1e", "1532029837206-abbe2b7620e3", "1583454110551-21f2fa2afe61"],
  glutes: ["1571019613454-1cb2f99b2d8b", "1518611012118-696072aa579a", "1599058917212-d750089bc07e", "1593079831268-3381b0db4a77"],
  legs: ["1574680096145-d05b474e2155", "1601422407692-ec4eeec1d9b3", "1517836357463-d25dfeac3438", "1540497077202-7c8a3999166f"],
  abs: ["1571902943202-507ec2618e8f", "1583454110551-21f2fa2afe61", "1607962837359-5e7e89f86776"],
  full: ["1538805060514-97d9cc17730c", "1518611012118-696072aa579a", "1545205597-3d9d02c29597"],
};
const pic = (cat: keyof typeof PIC, i: number) => img(PIC[cat][i % PIC[cat].length]);

// Small helper to keep entries compact
type ShortEx = Omit<LibraryExercise, "image"> & { _pic: [keyof typeof PIC, number] };
const ex = (e: ShortEx): LibraryExercise => {
  const { _pic, ...rest } = e;
  return { ...rest, image: pic(_pic[0], _pic[1]) };
};

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ============ CHEST (10) ============
  ex({ id: "push-up", name: "Push Up", muscle: "chest", equipment: "bodyweight", place: "both", difficulty: "beginner", kcalPerMin: 7, _pic: ["chest", 0], cues: ["Mãos um pouco mais largas que os ombros", "Corpo em linha reta", "Desça até o peito quase tocar o chão"], defaultSets: 3, defaultReps: "10-15", defaultRestSec: 45 }),
  ex({ id: "incline-push-up", name: "Push Up Inclinado", muscle: "chest", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 6, _pic: ["chest", 1], cues: ["Mãos em uma superfície elevada", "Cotovelos a 45°"], defaultSets: 3, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "decline-push-up", name: "Push Up Declinado", muscle: "chest", equipment: "bodyweight", place: "both", difficulty: "intermediate", kcalPerMin: 8, _pic: ["chest", 2], cues: ["Pés elevados", "Foco no peito superior"], defaultSets: 3, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "bench-press", name: "Supino Reto", muscle: "chest", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 8, _pic: ["chest", 0], cues: ["Escápulas retraídas", "Barra na linha do peito", "Pés firmes no chão"], defaultSets: 4, defaultReps: "8-12", defaultRestSec: 90 }),
  ex({ id: "incline-bench-press", name: "Supino Inclinado", muscle: "chest", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 8, _pic: ["chest", 1], cues: ["Banco a 30-45°", "Barra acima da clavícula"], defaultSets: 4, defaultReps: "8-12", defaultRestSec: 90 }),
  ex({ id: "decline-bench-press", name: "Supino Declinado", muscle: "chest", equipment: "barbells", place: "gym", difficulty: "advanced", kcalPerMin: 8, _pic: ["chest", 2], cues: ["Banco declinado", "Foco no peito inferior"], defaultSets: 4, defaultReps: "8-10", defaultRestSec: 90 }),
  ex({ id: "db-bench-press", name: "Supino com Halteres", muscle: "chest", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 7, _pic: ["chest", 0], cues: ["Movimento simétrico", "Desça controlado"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 75 }),
  ex({ id: "chest-fly", name: "Crucifixo", muscle: "chest", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 6, _pic: ["chest", 1], cues: ["Cotovelos levemente flexionados", "Abra os braços em arco"], defaultSets: 3, defaultReps: "12-15", defaultRestSec: 60 }),
  ex({ id: "machine-chest-press", name: "Supino na Máquina", muscle: "chest", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 7, _pic: ["chest", 2], cues: ["Costas apoiadas", "Empurre sem travar os cotovelos"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "cable-fly", name: "Crucifixo no Cabo", muscle: "chest", equipment: "cables", place: "gym", difficulty: "intermediate", kcalPerMin: 6, _pic: ["chest", 0], cues: ["Polias altas ou na altura do peito", "Junte as mãos à frente"], defaultSets: 3, defaultReps: "12-15", defaultRestSec: 60 }),

  // ============ BACK (10) ============
  ex({ id: "lat-pulldown", name: "Puxada Alta", muscle: "back", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 7, _pic: ["back", 0], cues: ["Pegada aberta", "Puxe até a altura do peito", "Escápulas para baixo"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 75 }),
  ex({ id: "pull-up", name: "Barra Fixa", muscle: "back", equipment: "bodyweight", place: "both", difficulty: "advanced", kcalPerMin: 9, _pic: ["back", 1], cues: ["Pegada pronada", "Puxe até o queixo passar da barra"], defaultSets: 4, defaultReps: "5-10", defaultRestSec: 90 }),
  ex({ id: "seated-row", name: "Remada Sentada", muscle: "back", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 7, _pic: ["back", 2], cues: ["Postura ereta", "Puxe ao abdômen", "Aperte as escápulas"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 75 }),
  ex({ id: "barbell-row", name: "Remada Curvada (Barra)", muscle: "back", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 8, _pic: ["back", 0], cues: ["Tronco a 45°", "Puxe a barra ao abdômen"], defaultSets: 4, defaultReps: "8-10", defaultRestSec: 90 }),
  ex({ id: "t-bar-row", name: "Remada T-Bar", muscle: "back", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 8, _pic: ["back", 1], cues: ["Pegada neutra", "Aperte as escápulas no topo"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 90 }),
  ex({ id: "machine-row", name: "Remada na Máquina", muscle: "back", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 6, _pic: ["back", 2], cues: ["Peito apoiado", "Puxe sem balançar"], defaultSets: 4, defaultReps: "12-15", defaultRestSec: 60 }),
  ex({ id: "db-row", name: "Remada Unilateral com Halter", muscle: "back", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 7, _pic: ["back", 0], cues: ["Apoie um joelho no banco", "Puxe o cotovelo ao teto"], defaultSets: 3, defaultReps: "10-12 cada", defaultRestSec: 60 }),
  ex({ id: "superman", name: "Superman", muscle: "back", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 4, _pic: ["back", 1], cues: ["De bruços, eleve braços e pernas", "Aperte a lombar"], defaultSets: 3, defaultReps: "15", defaultRestSec: 30 }),
  ex({ id: "band-pull-apart", name: "Pull Apart com Elástico", muscle: "back", equipment: "bands", place: "home", difficulty: "beginner", kcalPerMin: 4, _pic: ["back", 2], cues: ["Braços estendidos", "Abra puxando o elástico"], defaultSets: 3, defaultReps: "15-20", defaultRestSec: 30 }),
  ex({ id: "face-pull", name: "Face Pull no Cabo", muscle: "back", equipment: "cables", place: "gym", difficulty: "beginner", kcalPerMin: 5, _pic: ["back", 0], cues: ["Corda na altura dos olhos", "Puxe ao rosto, cotovelos altos"], defaultSets: 3, defaultReps: "15", defaultRestSec: 45 }),

  // ============ SHOULDERS (8) ============
  ex({ id: "shoulder-press-db", name: "Desenvolvimento com Halteres", muscle: "shoulders", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 7, _pic: ["shoulders", 0], cues: ["Cotovelos a 90°", "Suba sem travar"], defaultSets: 4, defaultReps: "8-12", defaultRestSec: 75 }),
  ex({ id: "shoulder-press-barbell", name: "Desenvolvimento Militar", muscle: "shoulders", equipment: "barbells", place: "gym", difficulty: "advanced", kcalPerMin: 8, _pic: ["shoulders", 1], cues: ["Core firme", "Barra à frente do rosto"], defaultSets: 4, defaultReps: "6-10", defaultRestSec: 90 }),
  ex({ id: "lateral-raise", name: "Elevação Lateral", muscle: "shoulders", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 5, _pic: ["shoulders", 2], cues: ["Suba até a altura dos ombros", "Cotovelos levemente flexionados"], defaultSets: 4, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "front-raise", name: "Elevação Frontal", muscle: "shoulders", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 5, _pic: ["shoulders", 0], cues: ["Suba até a altura dos ombros", "Movimento controlado"], defaultSets: 3, defaultReps: "12", defaultRestSec: 45 }),
  ex({ id: "rear-delt-fly", name: "Crucifixo Inverso", muscle: "shoulders", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 5, _pic: ["shoulders", 1], cues: ["Tronco inclinado", "Abra os braços, aperte as escápulas"], defaultSets: 3, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "arnold-press", name: "Arnold Press", muscle: "shoulders", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 7, _pic: ["shoulders", 2], cues: ["Comece com palmas para você", "Gire enquanto sobe"], defaultSets: 3, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "upright-row", name: "Remada Alta", muscle: "shoulders", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 6, _pic: ["shoulders", 0], cues: ["Pegada fechada", "Puxe até a altura do peito"], defaultSets: 3, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "band-lateral-raise", name: "Elevação Lateral com Elástico", muscle: "shoulders", equipment: "bands", place: "home", difficulty: "beginner", kcalPerMin: 4, _pic: ["shoulders", 1], cues: ["Pise no elástico", "Eleve até a altura dos ombros"], defaultSets: 3, defaultReps: "15", defaultRestSec: 30 }),

  // ============ BICEPS (7) ============
  ex({ id: "barbell-curl", name: "Rosca Direta (Barra)", muscle: "biceps", equipment: "barbells", place: "gym", difficulty: "beginner", kcalPerMin: 6, _pic: ["arms", 0], cues: ["Cotovelos colados ao corpo", "Sem balançar"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "hammer-curl", name: "Rosca Martelo", muscle: "biceps", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 6, _pic: ["arms", 1], cues: ["Palmas viradas para dentro", "Movimento controlado"], defaultSets: 3, defaultReps: "10-12", defaultRestSec: 45 }),
  ex({ id: "concentration-curl", name: "Rosca Concentrada", muscle: "biceps", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 5, _pic: ["arms", 2], cues: ["Cotovelo apoiado na coxa", "Suba até a contração máxima"], defaultSets: 3, defaultReps: "10 cada", defaultRestSec: 45 }),
  ex({ id: "cable-curl", name: "Rosca no Cabo", muscle: "biceps", equipment: "cables", place: "gym", difficulty: "beginner", kcalPerMin: 5, _pic: ["arms", 0], cues: ["Pegada supinada", "Tensão constante"], defaultSets: 3, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "db-curl", name: "Rosca Alternada", muscle: "biceps", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 6, _pic: ["arms", 1], cues: ["Alterne os braços", "Gire o pulso ao subir"], defaultSets: 3, defaultReps: "12 cada", defaultRestSec: 45 }),
  ex({ id: "preacher-curl", name: "Rosca Scott", muscle: "biceps", equipment: "machines", place: "gym", difficulty: "intermediate", kcalPerMin: 5, _pic: ["arms", 2], cues: ["Cotovelos apoiados no banco", "Não estenda totalmente"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "band-curl", name: "Rosca com Elástico", muscle: "biceps", equipment: "bands", place: "home", difficulty: "beginner", kcalPerMin: 4, _pic: ["arms", 0], cues: ["Pise no elástico", "Mantenha cotovelos fixos"], defaultSets: 3, defaultReps: "15", defaultRestSec: 30 }),

  // ============ TRICEPS (7) ============
  ex({ id: "tricep-pushdown", name: "Tríceps na Polia", muscle: "triceps", equipment: "cables", place: "gym", difficulty: "beginner", kcalPerMin: 6, _pic: ["arms", 1], cues: ["Cotovelos colados", "Estenda totalmente os braços"], defaultSets: 4, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "overhead-extension", name: "Tríceps Francês", muscle: "triceps", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 6, _pic: ["arms", 2], cues: ["Halter acima da cabeça", "Cotovelos fixos"], defaultSets: 3, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "skull-crusher", name: "Testa (Skull Crusher)", muscle: "triceps", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 6, _pic: ["arms", 0], cues: ["Deitada no banco", "Desça a barra à testa"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 75 }),
  ex({ id: "bench-dips", name: "Tríceps no Banco", muscle: "triceps", equipment: "bodyweight", place: "both", difficulty: "beginner", kcalPerMin: 6, _pic: ["arms", 1], cues: ["Mãos na borda do banco", "Desça com cotovelos para trás"], defaultSets: 3, defaultReps: "10-15", defaultRestSec: 45 }),
  ex({ id: "diamond-pushup", name: "Push Up Diamante", muscle: "triceps", equipment: "bodyweight", place: "home", difficulty: "advanced", kcalPerMin: 7, _pic: ["arms", 2], cues: ["Mãos formando diamante", "Cotovelos colados"], defaultSets: 3, defaultReps: "8-12", defaultRestSec: 60 }),
  ex({ id: "rope-pushdown", name: "Tríceps Corda", muscle: "triceps", equipment: "cables", place: "gym", difficulty: "beginner", kcalPerMin: 5, _pic: ["arms", 0], cues: ["Abra a corda ao final", "Cotovelos fixos"], defaultSets: 3, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "kickback", name: "Coice de Tríceps", muscle: "triceps", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 5, _pic: ["arms", 1], cues: ["Tronco inclinado", "Estenda o braço para trás"], defaultSets: 3, defaultReps: "12 cada", defaultRestSec: 45 }),

  // ============ FOREARMS (3) ============
  ex({ id: "wrist-curl", name: "Rosca de Punho", muscle: "forearms", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 4, _pic: ["arms", 0], cues: ["Antebraço apoiado", "Movimento só do punho"], defaultSets: 3, defaultReps: "15-20", defaultRestSec: 30 }),
  ex({ id: "reverse-wrist-curl", name: "Rosca Inversa de Punho", muscle: "forearms", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 4, _pic: ["arms", 1], cues: ["Palma para baixo", "Eleve o punho"], defaultSets: 3, defaultReps: "15", defaultRestSec: 30 }),
  ex({ id: "farmers-walk", name: "Farmer's Walk", muscle: "forearms", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 8, _pic: ["full", 0], cues: ["Carregue halteres pesados", "Postura ereta"], defaultSets: 3, defaultReps: "30s", defaultRestSec: 60 }),

  // ============ CORE (6) ============
  ex({ id: "plank", name: "Prancha", muscle: "core", equipment: "bodyweight", place: "both", difficulty: "beginner", kcalPerMin: 5, _pic: ["abs", 0], cues: ["Corpo em linha reta", "Abdômen contraído"], defaultSets: 3, defaultReps: "30-60s", defaultRestSec: 30 }),
  ex({ id: "side-plank", name: "Prancha Lateral", muscle: "core", equipment: "bodyweight", place: "both", difficulty: "intermediate", kcalPerMin: 5, _pic: ["abs", 1], cues: ["Quadril alinhado", "Aguente cada lado"], defaultSets: 3, defaultReps: "30s cada", defaultRestSec: 30 }),
  ex({ id: "dead-bug", name: "Dead Bug", muscle: "core", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 5, _pic: ["abs", 2], cues: ["Estenda braço e perna opostos", "Lombar no chão"], defaultSets: 3, defaultReps: "10 cada", defaultRestSec: 30 }),
  ex({ id: "bird-dog", name: "Bird Dog", muscle: "core", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 4, _pic: ["abs", 0], cues: ["Em 4 apoios, estenda braço e perna opostos"], defaultSets: 3, defaultReps: "10 cada", defaultRestSec: 30 }),
  ex({ id: "ab-wheel", name: "Roda Abdominal", muscle: "core", equipment: "bodyweight", place: "both", difficulty: "advanced", kcalPerMin: 7, _pic: ["abs", 1], cues: ["Role devagar", "Não arqueie a lombar"], defaultSets: 3, defaultReps: "8-12", defaultRestSec: 60 }),
  ex({ id: "pallof-press", name: "Pallof Press", muscle: "core", equipment: "cables", place: "gym", difficulty: "intermediate", kcalPerMin: 5, _pic: ["abs", 2], cues: ["Cabo lateralmente", "Estenda os braços à frente"], defaultSets: 3, defaultReps: "10 cada", defaultRestSec: 45 }),

  // ============ ABS (9) ============
  ex({ id: "crunch", name: "Abdominal Crunch", muscle: "abs", equipment: "bodyweight", place: "both", difficulty: "beginner", kcalPerMin: 6, _pic: ["abs", 0], cues: ["Eleve o tronco contraindo", "Queixo afastado do peito"], defaultSets: 3, defaultReps: "15-20", defaultRestSec: 30 }),
  ex({ id: "reverse-crunch", name: "Abdominal Reverso", muscle: "abs", equipment: "bodyweight", place: "both", difficulty: "beginner", kcalPerMin: 6, _pic: ["abs", 1], cues: ["Eleve o quadril em direção ao peito"], defaultSets: 3, defaultReps: "15", defaultRestSec: 30 }),
  ex({ id: "leg-raise-abs", name: "Elevação de Pernas", muscle: "abs", equipment: "bodyweight", place: "both", difficulty: "intermediate", kcalPerMin: 7, _pic: ["abs", 2], cues: ["Pernas estendidas", "Lombar pressionada ao chão"], defaultSets: 3, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "russian-twist", name: "Russian Twist", muscle: "abs", equipment: "bodyweight", place: "both", difficulty: "intermediate", kcalPerMin: 7, _pic: ["abs", 0], cues: ["Tronco inclinado", "Gire de um lado ao outro"], defaultSets: 3, defaultReps: "20 total", defaultRestSec: 30 }),
  ex({ id: "mountain-climber", name: "Mountain Climber", muscle: "abs", equipment: "bodyweight", place: "both", difficulty: "intermediate", kcalPerMin: 10, _pic: ["abs", 1], cues: ["Em prancha alta", "Alterne joelhos rápido"], defaultSets: 3, defaultReps: "30s", defaultRestSec: 30 }),
  ex({ id: "bicycle-crunch", name: "Abdominal Bicicleta", muscle: "abs", equipment: "bodyweight", place: "both", difficulty: "beginner", kcalPerMin: 7, _pic: ["abs", 2], cues: ["Alterne cotovelo e joelho opostos"], defaultSets: 3, defaultReps: "20 total", defaultRestSec: 30 }),
  ex({ id: "v-up", name: "V-Up", muscle: "abs", equipment: "bodyweight", place: "both", difficulty: "advanced", kcalPerMin: 8, _pic: ["abs", 0], cues: ["Toque os pés com as mãos", "Forme um V"], defaultSets: 3, defaultReps: "10-12", defaultRestSec: 45 }),
  ex({ id: "ab-machine", name: "Abdominal na Máquina", muscle: "abs", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 6, _pic: ["abs", 1], cues: ["Contraia o abdômen, não puxe com o pescoço"], defaultSets: 4, defaultReps: "15", defaultRestSec: 45 }),
  ex({ id: "cable-crunch", name: "Abdominal no Cabo", muscle: "abs", equipment: "cables", place: "gym", difficulty: "intermediate", kcalPerMin: 6, _pic: ["abs", 2], cues: ["De joelhos", "Flexione o tronco descendo a corda"], defaultSets: 4, defaultReps: "15", defaultRestSec: 45 }),

  // ============ GLUTES (12) ============
  ex({ id: "hip-thrust", name: "Hip Thrust", muscle: "glutes", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 8, _pic: ["glutes", 0], cues: ["Ombros no banco", "Suba contraindo no topo"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 90 }),
  ex({ id: "glute-bridge", name: "Ponte de Glúteo", muscle: "glutes", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 5, _pic: ["glutes", 1], cues: ["Suba o quadril", "Contraia 2s no topo"], defaultSets: 4, defaultReps: "15-20", defaultRestSec: 45 }),
  ex({ id: "cable-kickback", name: "Coice no Cabo", muscle: "glutes", equipment: "cables", place: "gym", difficulty: "beginner", kcalPerMin: 6, _pic: ["glutes", 2], cues: ["Caneleira no tornozelo", "Estenda a perna para trás"], defaultSets: 3, defaultReps: "12 cada", defaultRestSec: 45 }),
  ex({ id: "bulgarian-split", name: "Búlgaro", muscle: "glutes", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 9, _pic: ["glutes", 3], cues: ["Pé traseiro elevado", "Desça o joelho da frente alinhado"], defaultSets: 3, defaultReps: "10 cada", defaultRestSec: 75 }),
  ex({ id: "sumo-squat", name: "Agachamento Sumô", muscle: "glutes", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 8, _pic: ["glutes", 0], cues: ["Pés bem abertos, pontas para fora", "Desça profundo"], defaultSets: 4, defaultReps: "12-15", defaultRestSec: 60 }),
  ex({ id: "donkey-kick", name: "Coice 4 Apoios", muscle: "glutes", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 5, _pic: ["glutes", 1], cues: ["Em 4 apoios, eleve a perna", "Contraia o glúteo no topo"], defaultSets: 3, defaultReps: "15 cada", defaultRestSec: 30 }),
  ex({ id: "fire-hydrant", name: "Fire Hydrant", muscle: "glutes", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 5, _pic: ["glutes", 2], cues: ["Em 4 apoios, abra a perna lateralmente"], defaultSets: 3, defaultReps: "15 cada", defaultRestSec: 30 }),
  ex({ id: "abductor-machine", name: "Cadeira Abdutora", muscle: "glutes", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 6, _pic: ["glutes", 3], cues: ["Sente bem encostada", "Abra contra a resistência"], defaultSets: 4, defaultReps: "15", defaultRestSec: 45 }),
  ex({ id: "step-up", name: "Step Up", muscle: "glutes", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 8, _pic: ["glutes", 0], cues: ["Suba impulsionando com a perna da frente"], defaultSets: 3, defaultReps: "10 cada", defaultRestSec: 45 }),
  ex({ id: "single-leg-bridge", name: "Ponte Unilateral", muscle: "glutes", equipment: "bodyweight", place: "home", difficulty: "intermediate", kcalPerMin: 6, _pic: ["glutes", 1], cues: ["Suba apoiando em uma perna só"], defaultSets: 3, defaultReps: "12 cada", defaultRestSec: 45 }),
  ex({ id: "kb-swing", name: "Kettlebell Swing", muscle: "glutes", equipment: "kettlebell", place: "both", difficulty: "intermediate", kcalPerMin: 12, _pic: ["glutes", 2], cues: ["Impulsione com o quadril", "Não use os braços"], defaultSets: 4, defaultReps: "15-20", defaultRestSec: 60 }),
  ex({ id: "band-clamshell", name: "Clamshell com Elástico", muscle: "glutes", equipment: "bands", place: "home", difficulty: "beginner", kcalPerMin: 4, _pic: ["glutes", 3], cues: ["Deitada de lado, abra os joelhos"], defaultSets: 3, defaultReps: "15 cada", defaultRestSec: 30 }),

  // ============ QUADS (10) ============
  ex({ id: "squat", name: "Agachamento Livre", muscle: "quads", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 10, _pic: ["legs", 0], cues: ["Barra no trapézio", "Desça com o quadril", "Peito ereto"], defaultSets: 4, defaultReps: "8-12", defaultRestSec: 90 }),
  ex({ id: "bw-squat", name: "Agachamento Peso do Corpo", muscle: "quads", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 7, _pic: ["legs", 1], cues: ["Pés na largura dos ombros", "Desça até 90°"], defaultSets: 4, defaultReps: "15-20", defaultRestSec: 45 }),
  ex({ id: "hack-squat", name: "Hack Squat", muscle: "quads", equipment: "machines", place: "gym", difficulty: "intermediate", kcalPerMin: 9, _pic: ["legs", 2], cues: ["Costas apoiadas", "Desça profundo"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 90 }),
  ex({ id: "leg-press", name: "Leg Press 45°", muscle: "quads", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 9, _pic: ["legs", 3], cues: ["Pés na plataforma", "Não trave os joelhos"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 90 }),
  ex({ id: "leg-extension", name: "Cadeira Extensora", muscle: "quads", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 6, _pic: ["legs", 0], cues: ["Estenda contraindo o quadríceps"], defaultSets: 4, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "walking-lunge", name: "Avanço Caminhando", muscle: "quads", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 9, _pic: ["legs", 1], cues: ["Passos longos", "Joelho de trás quase tocando o chão"], defaultSets: 3, defaultReps: "12 cada", defaultRestSec: 60 }),
  ex({ id: "reverse-lunge", name: "Afundo Reverso", muscle: "quads", equipment: "bodyweight", place: "both", difficulty: "beginner", kcalPerMin: 7, _pic: ["legs", 2], cues: ["Passo para trás", "Desça controlada"], defaultSets: 3, defaultReps: "12 cada", defaultRestSec: 45 }),
  ex({ id: "wall-sit", name: "Cadeirinha na Parede", muscle: "quads", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 5, _pic: ["legs", 3], cues: ["Costas na parede", "Coxas paralelas ao chão"], defaultSets: 3, defaultReps: "40s", defaultRestSec: 45 }),
  ex({ id: "goblet-squat", name: "Goblet Squat", muscle: "quads", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 8, _pic: ["legs", 0], cues: ["Halter no peito", "Desça profundo"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "front-squat", name: "Agachamento Frontal", muscle: "quads", equipment: "barbells", place: "gym", difficulty: "advanced", kcalPerMin: 10, _pic: ["legs", 1], cues: ["Barra à frente", "Cotovelos altos"], defaultSets: 4, defaultReps: "6-10", defaultRestSec: 90 }),

  // ============ HAMSTRINGS (6) ============
  ex({ id: "romanian-deadlift", name: "Stiff (RDL)", muscle: "hamstrings", equipment: "barbells", place: "gym", difficulty: "intermediate", kcalPerMin: 8, _pic: ["legs", 2], cues: ["Joelhos semi-flexionados", "Barra rente às pernas"], defaultSets: 4, defaultReps: "10-12", defaultRestSec: 75 }),
  ex({ id: "leg-curl", name: "Mesa Flexora", muscle: "hamstrings", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 6, _pic: ["legs", 3], cues: ["Flexione trazendo calcanhares ao glúteo"], defaultSets: 4, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "seated-leg-curl", name: "Cadeira Flexora", muscle: "hamstrings", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 5, _pic: ["legs", 0], cues: ["Sente bem encostada", "Flexione os joelhos"], defaultSets: 4, defaultReps: "12-15", defaultRestSec: 45 }),
  ex({ id: "db-rdl", name: "Stiff com Halteres", muscle: "hamstrings", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 7, _pic: ["legs", 1], cues: ["Desça empurrando o quadril para trás"], defaultSets: 3, defaultReps: "10-12", defaultRestSec: 60 }),
  ex({ id: "single-leg-rdl", name: "Stiff Unilateral", muscle: "hamstrings", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 7, _pic: ["legs", 2], cues: ["Equilibre em uma perna", "Desça o tronco"], defaultSets: 3, defaultReps: "10 cada", defaultRestSec: 60 }),
  ex({ id: "good-morning", name: "Good Morning", muscle: "hamstrings", equipment: "barbells", place: "gym", difficulty: "advanced", kcalPerMin: 7, _pic: ["legs", 3], cues: ["Barra no trapézio", "Incline o tronco com quadril"], defaultSets: 3, defaultReps: "10", defaultRestSec: 75 }),

  // ============ CALVES (4) ============
  ex({ id: "standing-calf-raise", name: "Panturrilha em Pé", muscle: "calves", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 5, _pic: ["legs", 0], cues: ["Eleve no máximo na ponta dos pés", "Desça controlada"], defaultSets: 4, defaultReps: "15-20", defaultRestSec: 45 }),
  ex({ id: "seated-calf-raise", name: "Panturrilha Sentada", muscle: "calves", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 4, _pic: ["legs", 1], cues: ["Joelhos a 90°", "Foco no sóleo"], defaultSets: 4, defaultReps: "15-20", defaultRestSec: 45 }),
  ex({ id: "calf-raise-home", name: "Panturrilha em Pé (Casa)", muscle: "calves", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 4, _pic: ["legs", 2], cues: ["Sem aparelho", "Faça em um degrau para mais amplitude"], defaultSets: 4, defaultReps: "20", defaultRestSec: 30 }),
  ex({ id: "db-calf-raise", name: "Panturrilha com Halteres", muscle: "calves", equipment: "dumbbells", place: "both", difficulty: "beginner", kcalPerMin: 5, _pic: ["legs", 3], cues: ["Halteres ao lado do corpo", "Eleve no máximo"], defaultSets: 4, defaultReps: "15-20", defaultRestSec: 45 }),

  // ============ FULL BODY (8) ============
  ex({ id: "burpee", name: "Burpee", muscle: "full_body", equipment: "bodyweight", place: "both", difficulty: "advanced", kcalPerMin: 13, _pic: ["full", 0], cues: ["Agache, prancha, pula", "Mantenha ritmo"], defaultSets: 4, defaultReps: "10-15", defaultRestSec: 60 }),
  ex({ id: "jumping-jack", name: "Polichinelo", muscle: "full_body", equipment: "bodyweight", place: "home", difficulty: "beginner", kcalPerMin: 9, _pic: ["full", 1], cues: ["Salte abrindo braços e pernas"], defaultSets: 3, defaultReps: "30-60s", defaultRestSec: 30 }),
  ex({ id: "deadlift", name: "Levantamento Terra", muscle: "full_body", equipment: "barbells", place: "gym", difficulty: "advanced", kcalPerMin: 10, _pic: ["full", 2], cues: ["Costas neutras", "Empurre o chão com os pés"], defaultSets: 4, defaultReps: "5-8", defaultRestSec: 120 }),
  ex({ id: "thruster", name: "Thruster", muscle: "full_body", equipment: "dumbbells", place: "both", difficulty: "intermediate", kcalPerMin: 11, _pic: ["full", 0], cues: ["Agache e empurre os halteres acima"], defaultSets: 3, defaultReps: "10-12", defaultRestSec: 75 }),
  ex({ id: "clean-press", name: "Clean and Press", muscle: "full_body", equipment: "barbells", place: "gym", difficulty: "advanced", kcalPerMin: 12, _pic: ["full", 1], cues: ["Movimento explosivo do chão até acima"], defaultSets: 4, defaultReps: "5-8", defaultRestSec: 90 }),
  ex({ id: "kb-snatch", name: "Kettlebell Snatch", muscle: "full_body", equipment: "kettlebell", place: "both", difficulty: "advanced", kcalPerMin: 13, _pic: ["full", 2], cues: ["Movimento explosivo do chão à cima da cabeça"], defaultSets: 3, defaultReps: "8 cada", defaultRestSec: 75 }),
  ex({ id: "battle-rope", name: "Corda Naval", muscle: "full_body", equipment: "machines", place: "gym", difficulty: "intermediate", kcalPerMin: 12, _pic: ["full", 0], cues: ["Ondulação alternada", "Postura agachada"], defaultSets: 4, defaultReps: "30s", defaultRestSec: 45 }),
  ex({ id: "rowing-machine", name: "Remo Ergômetro", muscle: "full_body", equipment: "machines", place: "gym", difficulty: "beginner", kcalPerMin: 10, _pic: ["full", 1], cues: ["Empurre com as pernas, depois puxe com os braços"], defaultSets: 1, defaultReps: "5-10 min", defaultRestSec: 0 }),
];

export const EXERCISE_BY_ID = new Map(EXERCISE_LIBRARY.map(e => [e.id, e] as const));
export const getLibraryExercise = (id: string) => EXERCISE_BY_ID.get(id);

export const MUSCLE_GROUPS_V2: { id: WMuscle; label: string }[] =
  (Object.keys(MUSCLE_LABELS) as WMuscle[]).map(id => ({ id, label: MUSCLE_LABELS[id] }));
