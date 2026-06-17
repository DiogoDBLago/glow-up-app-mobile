export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  place: "home" | "gym" | "both";
  equipment?: string;
  sets: number;
  reps: string;
  restSec: number;
  instructions: string;
  beginnerTip?: string;
  image: string;
}

const img = (q: string) =>
  `https://images.unsplash.com/photo-${q}?auto=format&fit=crop&w=800&q=70`;

// Distinct photo IDs per category — no repeating gym image everywhere
const IMG = {
  glutes: ["1571019613454-1cb2f99b2d8b", "1518611012118-696072aa579a", "1599058917212-d750089bc07e", "1593079831268-3381b0db4a77"],
  legs: ["1574680096145-d05b474e2155", "1601422407692-ec4eeec1d9b3", "1517836357463-d25dfeac3438", "1540497077202-7c8a3999166f"],
  abs: ["1571902943202-507ec2618e8f", "1599058917212-d750089bc07e", "1583454110551-21f2fa2afe61", "1607962837359-5e7e89f86776"],
  back: ["1581009146145-b5ef050c2e1e", "1534438327276-14e5300c3a48", "1556817411-31ae72fa3ea0", "1583500178690-f7eb02bba0ad"],
  chest: ["1583454110551-21f2fa2afe61", "1571019613454-1cb2f99b2d8b", "1574680178050-55c6a6a96e0a"],
  shoulders: ["1581009146145-b5ef050c2e1e", "1534258936925-c58bed479fcb", "1532029837206-abbe2b7620e3"],
  arms: ["1581009146145-b5ef050c2e1e", "1532029837206-abbe2b7620e3", "1583454110551-21f2fa2afe61"],
  cardio: ["1518611012118-696072aa579a", "1538805060514-97d9cc17730c", "1571902943202-507ec2618e8f"],
  mobility: ["1545205597-3d9d02c29597", "1599447421416-3414500d18a5", "1506629905607-c52b1c2e29d0"],
};

const pick = (arr: string[], i: number) => img(arr[i % arr.length]);

export const EXERCISES: Exercise[] = [
  // ============ GLUTES — home ============
  { id: "glute-bridge", name: "Ponte de glúteo", muscle: "glutes", place: "home", equipment: "Peso do corpo", sets: 4, reps: "15-20", restSec: 45, instructions: "Deitada, joelhos dobrados, eleve o quadril contraindo o glúteo no topo por 2s.", beginnerTip: "Mantenha a lombar neutra — sem arquear demais.", image: pick(IMG.glutes, 0) },
  { id: "hip-thrust-sofa", name: "Hip thrust no sofá", muscle: "glutes", place: "home", equipment: "Sofá ou banco", sets: 4, reps: "12-15", restSec: 60, instructions: "Apoie os ombros no sofá, pés firmes, eleve o quadril contraindo glúteos.", image: pick(IMG.glutes, 1) },
  { id: "donkey-kick", name: "Coice 4 apoios", muscle: "glutes", place: "home", equipment: "Tapete", sets: 3, reps: "15 por lado", restSec: 30, instructions: "Em 4 apoios, eleve a perna com joelho dobrado, contraia o glúteo.", image: pick(IMG.glutes, 2) },
  { id: "fire-hydrant", name: "Abdução 4 apoios (fire hydrant)", muscle: "glutes", place: "home", equipment: "Tapete", sets: 3, reps: "15 por lado", restSec: 30, instructions: "Em 4 apoios, abra a perna lateralmente como um leque.", image: pick(IMG.glutes, 3) },
  { id: "bulgarian-chair", name: "Búlgaro com cadeira", muscle: "glutes", place: "home", equipment: "Cadeira", sets: 3, reps: "10 por perna", restSec: 60, instructions: "Pé traseiro na cadeira, desça o quadril mantendo o joelho da frente alinhado.", image: pick(IMG.glutes, 0) },
  { id: "bw-squat", name: "Agachamento livre", muscle: "glutes", place: "home", equipment: "Peso do corpo", sets: 4, reps: "15", restSec: 45, instructions: "Pés na largura dos ombros, desça até 90°, joelhos alinhados aos pés.", image: pick(IMG.legs, 0) },

  // ============ GLUTES — gym ============
  { id: "hip-thrust-machine", name: "Hip Thrust Machine", muscle: "glutes", place: "gym", equipment: "Máquina Hip Thrust", sets: 4, reps: "10-12", restSec: 75, instructions: "Apoie os ombros, posicione a almofada no quadril, eleve contraindo glúteos.", image: pick(IMG.glutes, 1) },
  { id: "smith-squat", name: "Agachamento Smith", muscle: "glutes", place: "gym", equipment: "Smith Machine", sets: 4, reps: "10-12", restSec: 90, instructions: "Pés à frente, desça controlada até 90°, suba sem travar.", image: pick(IMG.glutes, 2) },
  { id: "leg-press-glute", name: "Leg Press 45° (foco glúteo)", muscle: "glutes", place: "gym", equipment: "Leg Press 45°", sets: 4, reps: "12", restSec: 75, instructions: "Pés altos e afastados na plataforma para ativar glúteo.", image: pick(IMG.glutes, 3) },
  { id: "cable-kickback", name: "Coice no cabo", muscle: "glutes", place: "gym", equipment: "Cabo polia baixa + caneleira", sets: 3, reps: "12 por lado", restSec: 45, instructions: "Caneleira no tornozelo, leve a perna para trás contraindo o glúteo.", image: pick(IMG.glutes, 0) },
  { id: "abductor-machine", name: "Cadeira abdutora", muscle: "glutes", place: "gym", equipment: "Cadeira abdutora", sets: 4, reps: "15", restSec: 45, instructions: "Sente bem encostada e abra as pernas contraindo o glúteo médio.", image: pick(IMG.glutes, 1) },
  { id: "romanian-deadlift", name: "Stiff (Romanian Deadlift)", muscle: "glutes", place: "gym", equipment: "Barra ou halteres", sets: 4, reps: "10-12", restSec: 75, instructions: "Joelhos semi-flexionados, desça a barra rente às pernas, sinta o posterior.", image: pick(IMG.glutes, 2) },
  { id: "barbell-squat", name: "Agachamento livre com barra", muscle: "glutes", place: "gym", equipment: "Barra + suporte", sets: 4, reps: "8-12", restSec: 90, instructions: "Barra no trapézio, desça com quadril, peito ereto.", image: pick(IMG.glutes, 3) },

  // ============ LEGS — home ============
  { id: "reverse-lunge", name: "Afundo reverso", muscle: "legs", place: "home", equipment: "Peso do corpo", sets: 3, reps: "12 por perna", restSec: 45, instructions: "Dê um passo para trás, desça o joelho quase ao chão, suba.", image: pick(IMG.legs, 1) },
  { id: "step-up-chair", name: "Step-up na cadeira", muscle: "legs", place: "home", equipment: "Cadeira firme", sets: 3, reps: "10 por perna", restSec: 45, instructions: "Suba na cadeira impulsionando com a perna da frente.", image: pick(IMG.legs, 2) },
  { id: "wall-sit", name: "Cadeirinha na parede", muscle: "legs", place: "home", equipment: "Parede", sets: 3, reps: "40s", restSec: 45, instructions: "Costas na parede, coxas paralelas ao chão.", image: pick(IMG.legs, 3) },
  { id: "calf-raise-home", name: "Panturrilha em pé", muscle: "calves", place: "home", equipment: "Peso do corpo", sets: 4, reps: "20", restSec: 30, instructions: "Eleve os calcanhares ao máximo e desça controlada.", image: pick(IMG.legs, 0) },
  { id: "lunge", name: "Afundo alternado", muscle: "legs", place: "both", equipment: "Peso do corpo / halteres", sets: 3, reps: "12 por perna", restSec: 45, instructions: "Passe uma perna à frente, desça até o joelho de trás quase tocar o chão.", image: pick(IMG.legs, 1) },

  // ============ LEGS — gym ============
  { id: "leg-press", name: "Leg Press 45°", muscle: "legs", place: "gym", equipment: "Leg Press 45°", sets: 4, reps: "10-12", restSec: 90, instructions: "Pés na plataforma, desça controlada, suba sem travar joelhos.", image: pick(IMG.legs, 2) },
  { id: "hack-squat", name: "Hack Squat", muscle: "quads", place: "gym", equipment: "Hack Machine", sets: 4, reps: "10", restSec: 90, instructions: "Costas apoiadas, desça até 90° e suba forte.", image: pick(IMG.legs, 3) },
  { id: "leg-extension", name: "Cadeira extensora", muscle: "quads", place: "gym", equipment: "Cadeira extensora", sets: 4, reps: "12", restSec: 45, instructions: "Estenda os joelhos contraindo o quadríceps no topo.", image: pick(IMG.legs, 0) },
  { id: "leg-curl", name: "Mesa flexora", muscle: "hamstrings", place: "gym", equipment: "Mesa flexora", sets: 4, reps: "12", restSec: 45, instructions: "Flexione os joelhos trazendo calcanhares ao glúteo.", image: pick(IMG.legs, 1) },
  { id: "standing-calf", name: "Panturrilha em pé na máquina", muscle: "calves", place: "gym", equipment: "Máquina de panturrilha", sets: 4, reps: "15-20", restSec: 45, instructions: "Eleve no máximo da ponta dos pés.", image: pick(IMG.legs, 2) },
  { id: "smith-lunge", name: "Afundo no Smith", muscle: "legs", place: "gym", equipment: "Smith Machine", sets: 3, reps: "10 por perna", restSec: 60, instructions: "Posição de afundo, desça vertical no smith.", image: pick(IMG.legs, 3) },

  // ============ ABS / CORE ============
  { id: "plank", name: "Prancha", muscle: "abs", place: "both", equipment: "Tapete", sets: 3, reps: "40s", restSec: 30, instructions: "Antebraços e pés no chão, corpo reto, abdômen contraído.", image: pick(IMG.abs, 0) },
  { id: "crunch", name: "Abdominal supra", muscle: "abs", place: "both", equipment: "Tapete", sets: 3, reps: "20", restSec: 30, instructions: "Deitada, joelhos dobrados, eleve o tronco contraindo o abdômen.", image: pick(IMG.abs, 1) },
  { id: "bicycle", name: "Abdominal bicicleta", muscle: "abs", place: "both", equipment: "Tapete", sets: 3, reps: "20", restSec: 30, instructions: "Alterne cotovelo e joelho opostos em pedalada.", image: pick(IMG.abs, 2) },
  { id: "leg-raise", name: "Elevação de pernas", muscle: "abs", place: "both", equipment: "Tapete", sets: 3, reps: "15", restSec: 45, instructions: "Deitada, eleve as pernas estendidas até 90°.", image: pick(IMG.abs, 3) },
  { id: "mountain-climber", name: "Escalador", muscle: "hiit", place: "both", equipment: "Peso do corpo", sets: 4, reps: "40s", restSec: 20, instructions: "Em prancha alta, alterne joelhos ao peito rapidamente.", image: pick(IMG.cardio, 0) },
  { id: "ab-machine", name: "Abdominal na máquina", muscle: "abs", place: "gym", equipment: "Abdominal Crunch Machine", sets: 4, reps: "15", restSec: 45, instructions: "Sente bem encostada, contraia o abdômen flexionando o tronco.", image: pick(IMG.abs, 0) },
  { id: "cable-crunch", name: "Abdominal no cabo", muscle: "abs", place: "gym", equipment: "Polia alta + corda", sets: 4, reps: "15", restSec: 45, instructions: "De joelhos, flexione o tronco descendo a corda.", image: pick(IMG.abs, 1) },
  { id: "hanging-knee", name: "Elevação de joelhos suspensa", muscle: "abs", place: "gym", equipment: "Barra fixa", sets: 3, reps: "12", restSec: 60, instructions: "Pendurada, eleve os joelhos contraindo o abdômen.", image: pick(IMG.abs, 2) },

  // ============ BACK ============
  { id: "superman", name: "Superman", muscle: "back", place: "home", equipment: "Tapete", sets: 3, reps: "15", restSec: 30, instructions: "Deitada de bruços, eleve braços e pernas simultaneamente.", image: pick(IMG.back, 0) },
  { id: "backpack-row", name: "Remada com mochila", muscle: "back", place: "home", equipment: "Mochila com peso", sets: 3, reps: "12", restSec: 45, instructions: "Tronco inclinado, puxe a mochila ao abdômen, cotovelos colados.", image: pick(IMG.back, 1) },
  { id: "lat-pulldown", name: "Puxada alta", muscle: "back", place: "gym", equipment: "Lat Pulldown Machine", sets: 4, reps: "10-12", restSec: 60, instructions: "Puxe a barra ao peito, ombros para baixo e trás.", image: pick(IMG.back, 2) },
  { id: "seated-row", name: "Remada sentada", muscle: "back", place: "gym", equipment: "Seated Row Machine", sets: 4, reps: "10-12", restSec: 60, instructions: "Puxe ao abdômen mantendo postura ereta.", image: pick(IMG.back, 3) },
  { id: "cable-row", name: "Remada cabo baixo", muscle: "back", place: "gym", equipment: "Cabo polia baixa + triângulo", sets: 4, reps: "12", restSec: 60, instructions: "Puxe o triângulo ao abdômen, escápulas retraídas.", image: pick(IMG.back, 0) },
  { id: "assisted-pullup", name: "Barra assistida", muscle: "back", place: "gym", equipment: "Máquina de barra assistida", sets: 3, reps: "8-10", restSec: 75, instructions: "Pegada aberta, puxe até o queixo passar a barra.", image: pick(IMG.back, 1) },
  { id: "dumbbell-row", name: "Remada unilateral com halter", muscle: "back", place: "gym", equipment: "Halter + banco", sets: 4, reps: "10 por lado", restSec: 45, instructions: "Apoie joelho e mão no banco, puxe o halter ao quadril.", image: pick(IMG.back, 2) },

  // ============ CHEST ============
  { id: "knee-pushup", name: "Flexão com joelhos", muscle: "chest", place: "home", equipment: "Tapete", sets: 3, reps: "10-15", restSec: 45, instructions: "Joelhos apoiados, desça o peito até quase tocar o chão.", image: pick(IMG.chest, 0) },
  { id: "pushup", name: "Flexão de braço", muscle: "chest", place: "home", equipment: "Peso do corpo", sets: 3, reps: "10-15", restSec: 45, instructions: "Mãos na largura dos ombros, corpo alinhado, desça e suba.", image: pick(IMG.chest, 1) },
  { id: "chest-press", name: "Chest Press Machine", muscle: "chest", place: "gym", equipment: "Chest Press Machine", sets: 4, reps: "10-12", restSec: 60, instructions: "Empurre as pegadoras até quase estender os cotovelos.", image: pick(IMG.chest, 2) },
  { id: "incline-db-press", name: "Supino inclinado halter", muscle: "chest", place: "gym", equipment: "Banco inclinado + halteres", sets: 4, reps: "10", restSec: 75, instructions: "Banco a 30°, empurre os halteres para cima.", image: pick(IMG.chest, 0) },
  { id: "pec-deck", name: "Voador (Pec Deck)", muscle: "chest", place: "gym", equipment: "Pec Deck Machine", sets: 4, reps: "12", restSec: 45, instructions: "Junte os braços à frente sem flexionar cotovelos.", image: pick(IMG.chest, 1) },
  { id: "cable-fly", name: "Crossover (cabo)", muscle: "chest", place: "gym", equipment: "Cross-over de polias altas", sets: 3, reps: "12-15", restSec: 45, instructions: "Cruze as mãos à frente do corpo contraindo o peitoral.", image: pick(IMG.chest, 2) },
  { id: "bench-press", name: "Supino reto", muscle: "chest", place: "gym", equipment: "Barra + banco", sets: 4, reps: "8-10", restSec: 90, instructions: "Desça a barra controlada até o peito, suba contraindo.", image: pick(IMG.chest, 0) },

  // ============ SHOULDERS ============
  { id: "shoulder-taps", name: "Toques no ombro em prancha", muscle: "shoulders", place: "home", equipment: "Tapete", sets: 3, reps: "20", restSec: 30, instructions: "Em prancha alta, toque o ombro oposto sem girar o quadril.", image: pick(IMG.shoulders, 0) },
  { id: "arm-circles", name: "Círculos de braço", muscle: "shoulders", place: "home", equipment: "Peso do corpo", sets: 2, reps: "30s", restSec: 15, instructions: "Braços abertos, faça círculos pequenos para frente e trás.", image: pick(IMG.shoulders, 1) },
  { id: "lateral-raise", name: "Elevação lateral", muscle: "shoulders", place: "both", equipment: "Halteres", sets: 4, reps: "12", restSec: 45, instructions: "Eleve os halteres lateralmente até a altura dos ombros.", image: pick(IMG.shoulders, 2) },
  { id: "shoulder-press-machine", name: "Desenvolvimento na máquina", muscle: "shoulders", place: "gym", equipment: "Shoulder Press Machine", sets: 4, reps: "10", restSec: 60, instructions: "Empurre as pegadoras acima da cabeça sem travar.", image: pick(IMG.shoulders, 0) },
  { id: "cable-lateral", name: "Elevação lateral no cabo", muscle: "shoulders", place: "gym", equipment: "Polia baixa", sets: 4, reps: "12 por lado", restSec: 45, instructions: "Eleve o braço lateralmente puxando o cabo.", image: pick(IMG.shoulders, 1) },
  { id: "rear-delt-machine", name: "Voador inverso (Rear Delt)", muscle: "shoulders", place: "gym", equipment: "Rear Delt Machine", sets: 4, reps: "12", restSec: 45, instructions: "Abra os braços para trás contraindo o deltoide posterior.", image: pick(IMG.shoulders, 2) },
  { id: "shoulder-press", name: "Desenvolvimento com halteres", muscle: "shoulders", place: "both", equipment: "Halteres", sets: 4, reps: "10", restSec: 60, instructions: "Empurre os halteres acima da cabeça sem travar cotovelos.", image: pick(IMG.shoulders, 0) },

  // ============ ARMS — biceps / triceps ============
  { id: "bicep-curl", name: "Rosca direta", muscle: "biceps", place: "both", equipment: "Halteres", sets: 3, reps: "12", restSec: 45, instructions: "Cotovelos fixos, flexione antebraços trazendo halteres ao ombro.", image: pick(IMG.arms, 0) },
  { id: "preacher-curl", name: "Rosca Scott", muscle: "biceps", place: "gym", equipment: "Banco Scott + barra W", sets: 4, reps: "10", restSec: 60, instructions: "Apoie os tríceps no banco e flexione os cotovelos.", image: pick(IMG.arms, 1) },
  { id: "tricep-dip", name: "Mergulho no banco", muscle: "triceps", place: "home", equipment: "Cadeira ou banco", sets: 3, reps: "12", restSec: 45, instructions: "Mãos no banco atrás, desça flexionando cotovelos.", image: pick(IMG.arms, 2) },
  { id: "cable-tricep", name: "Tríceps pulley", muscle: "triceps", place: "gym", equipment: "Polia alta + corda", sets: 4, reps: "12", restSec: 45, instructions: "Cotovelos colados, estenda os antebraços para baixo.", image: pick(IMG.arms, 0) },
  { id: "tricep-extension", name: "Extensão tríceps na máquina", muscle: "triceps", place: "gym", equipment: "Triceps Extension Machine", sets: 4, reps: "12", restSec: 45, instructions: "Estenda os braços controlada para baixo.", image: pick(IMG.arms, 1) },

  // ============ CARDIO / HIIT ============
  { id: "jumping-jack", name: "Polichinelo", muscle: "cardio", place: "both", equipment: "Peso do corpo", sets: 4, reps: "45s", restSec: 15, instructions: "Salte abrindo e fechando braços e pernas.", image: pick(IMG.cardio, 1) },
  { id: "high-knees", name: "Corrida elevando joelhos", muscle: "cardio", place: "both", equipment: "Peso do corpo", sets: 4, reps: "40s", restSec: 20, instructions: "Eleve os joelhos na altura do quadril alternando rapidamente.", image: pick(IMG.cardio, 2) },
  { id: "burpee", name: "Burpee", muscle: "hiit", place: "both", equipment: "Peso do corpo", sets: 4, reps: "10", restSec: 30, instructions: "Agachamento, prancha, salto vertical em sequência.", image: pick(IMG.cardio, 0) },
  { id: "burpee-easy", name: "Burpee iniciante", muscle: "hiit", place: "home", equipment: "Peso do corpo", sets: 4, reps: "8", restSec: 30, instructions: "Sem salto: agache, vá para prancha, volte, levante.", image: pick(IMG.cardio, 1) },
  { id: "skater", name: "Skater (passada lateral)", muscle: "cardio", place: "home", equipment: "Peso do corpo", sets: 4, reps: "40s", restSec: 20, instructions: "Salte de um lado ao outro alternando o apoio.", image: pick(IMG.cardio, 2) },
  { id: "fast-march", name: "Marcha estacionária", muscle: "cardio", place: "home", equipment: "Peso do corpo", sets: 3, reps: "60s", restSec: 20, instructions: "Marche elevando bem os joelhos no lugar.", image: pick(IMG.cardio, 0) },

  // ============ MOBILITY / STRETCH ============
  { id: "cat-cow", name: "Gato e vaca", muscle: "mobility", place: "home", equipment: "Tapete", sets: 2, reps: "10", restSec: 20, instructions: "Em 4 apoios, alterne arredondar e arquear a coluna.", image: pick(IMG.mobility, 0) },
  { id: "hip-opener", name: "Abertura de quadril", muscle: "mobility", place: "home", equipment: "Tapete", sets: 2, reps: "30s por lado", restSec: 15, instructions: "Posição de afundo profundo, abra o quadril alongando.", image: pick(IMG.mobility, 1) },
  { id: "child-pose", name: "Postura da criança", muscle: "stretch", place: "home", equipment: "Tapete", sets: 1, reps: "60s", restSec: 0, instructions: "Sente sobre os calcanhares, braços à frente, respire.", image: pick(IMG.mobility, 2) },
  { id: "hamstring-stretch", name: "Alongamento posterior", muscle: "stretch", place: "home", equipment: "Tapete", sets: 2, reps: "30s por lado", restSec: 10, instructions: "Sentada, estenda uma perna e incline o tronco ao pé.", image: pick(IMG.mobility, 0) },
  { id: "shoulder-mobility", name: "Mobilidade de ombro", muscle: "mobility", place: "home", equipment: "Peso do corpo", sets: 2, reps: "10 círculos", restSec: 15, instructions: "Círculos amplos com os braços para soltar os ombros.", image: pick(IMG.mobility, 1) },
];

// Muscle group filter list (matches user spec). Aliases map sub-groups into main filter buckets.
export const MUSCLE_GROUPS = [
  { id: "fullbody", label: "Full body" },
  { id: "glutes", label: "Glúteos" },
  { id: "legs", label: "Pernas" },
  { id: "quads", label: "Quadríceps" },
  { id: "hamstrings", label: "Posterior" },
  { id: "calves", label: "Panturrilha" },
  { id: "abs", label: "Abdômen" },
  { id: "back", label: "Costas" },
  { id: "chest", label: "Peito" },
  { id: "shoulders", label: "Ombros" },
  { id: "biceps", label: "Bíceps" },
  { id: "triceps", label: "Tríceps" },
  { id: "arms", label: "Braços" },
  { id: "cardio", label: "Cardio" },
  { id: "hiit", label: "HIIT" },
  { id: "mobility", label: "Mobilidade" },
  { id: "stretch", label: "Alongamento" },
];

// For filter logic — some buckets include related sub-muscles.
export function exerciseMatchesMuscle(exMuscle: string, filter: string): boolean {
  if (filter === "all" || filter === exMuscle) return true;
  if (filter === "legs") return ["legs", "quads", "hamstrings", "calves"].includes(exMuscle);
  if (filter === "arms") return ["biceps", "triceps", "arms"].includes(exMuscle);
  if (filter === "abs") return exMuscle === "abs";
  if (filter === "cardio") return ["cardio", "hiit"].includes(exMuscle);
  if (filter === "hiit") return ["hiit", "cardio"].includes(exMuscle);
  if (filter === "mobility") return ["mobility", "stretch"].includes(exMuscle);
  if (filter === "stretch") return ["stretch", "mobility"].includes(exMuscle);
  if (filter === "fullbody") return true;
  return false;
}

export function exerciseById(id: string) {
  return EXERCISES.find(e => e.id === id);
}

const MUSCLE_LABEL: Record<string, string> = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.id, g.label]));
export function muscleLabel(id: string): string {
  return MUSCLE_LABEL[id] ?? id;
}

// Generic execution tips per muscle/category (used when an exercise has no custom commonMistakes)
export function commonMistakesFor(ex: Exercise): string[] {
  const base: Record<string, string[]> = {
    glutes: ["Arquear demais a lombar no topo do movimento", "Não contrair o glúteo no pico — segure 1-2s", "Joelhos caindo para dentro"],
    legs: ["Joelho ultrapassando muito a ponta do pé", "Calcanhar saindo do chão no agachamento", "Descer rápido demais sem controle"],
    quads: ["Travar o joelho na extensão", "Carga acima do controle, perdendo amplitude"],
    hamstrings: ["Hiperestender a lombar", "Não controlar a fase excêntrica"],
    calves: ["Amplitude curta — suba e desça completo", "Apoio instável no antepé"],
    abs: ["Puxar o pescoço com as mãos", "Apneia — lembre de expirar na contração", "Tirar os pés do chão sem controle do core"],
    back: ["Subir o ombro junto com o braço", "Usar muito impulso de tronco", "Não retrair as escápulas no fim do movimento"],
    chest: ["Cotovelos abertos a 90° demais", "Não tocar o peito no fundo (amplitude curta)", "Ombro elevado encostando na orelha"],
    shoulders: ["Subir trapézio junto com o ombro", "Carga pesada demais perdendo postura", "Não estabilizar o core durante o movimento"],
    biceps: ["Balançar o tronco para subir", "Não estender o braço completamente no fim"],
    triceps: ["Abrir os cotovelos para fora", "Não fixar o cotovelo durante a extensão"],
    arms: ["Balançar o tronco para impulsionar", "Não estender o braço completamente"],
    cardio: ["Aterrissar de pernas duras (impacto forte)", "Respirar curto — mantenha respiração ritmada"],
    hiit: ["Sacrificar técnica pela velocidade", "Não respeitar o tempo de descanso"],
    mobility: ["Forçar amplitude com dor", "Movimento brusco — respire e vá no tempo"],
    stretch: ["Saltar a respiração — inspire fundo no alongamento", "Forçar até dor aguda em vez de leve desconforto"],
  };
  return base[ex.muscle] ?? ["Mantenha postura ereta e o core ativado", "Movimento controlado — sem balanceio"];
}
