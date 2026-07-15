/**
 * Движок сумісності комплектуючих (чиста функція — без БД, легко тестується).
 *
 * Правила перевіряють лише те, для чого є дані в характеристиках:
 *   CPU ↔ материнка   — сокет
 *   RAM ↔ материнка   — тип пам'яті (DDR4/DDR5) і кількість модулів vs слотів
 *   материнка ↔ корпус — форм-фактор
 *   GPU ↔ корпус      — довжина карти vs макс. довжина корпуса
 *   БЖ ↔ корпус       — SFX-корпус не бере ATX-блок
 *   БЖ ↔ споживання   — сумарний TDP + запас
 */

export type PartType = 'cpu' | 'mobo' | 'ram' | 'gpu' | 'psu' | 'case';

/** Комплектуюча у вигляді, потрібному движку: id/назва + плоскі характеристики. */
export interface BuildPart {
  id: string;
  title: string;
  price_cents: number;
  attrs: Record<string, string | number>;
}

export type BuildSelection = Partial<Record<PartType, BuildPart>>;

export interface Issue {
  level: 'error' | 'warning';
  parts: PartType[]; // яких слотів стосується — щоб підсвітити в UI
  message: string;
}

export interface BuildReport {
  issues: Issue[];
  /** Оцінка споживання системи, Вт (CPU + GPU + база на решту). */
  estimatedWatts: number;
  /** Рекомендована потужність БЖ із запасом ~30%, округлена вгору до 50 Вт. */
  recommendedPsuWatts: number;
  totalCents: number;
  /** Чи є хоч одна помилка (не попередження). */
  hasErrors: boolean;
}

/** Споживання решти системи (плата, пам'ять, накопичувачі, вентилятори), Вт. */
const BASE_SYSTEM_WATTS = 90;
/** Запас потужності БЖ понад пікове споживання. */
const PSU_HEADROOM = 1.3;

const num = (p: BuildPart | undefined, key: string): number | undefined => {
  const v = p?.attrs[key];
  const n = typeof v === 'number' ? v : Number(v);
  return v === undefined || Number.isNaN(n) ? undefined : n;
};
const str = (p: BuildPart | undefined, key: string): string | undefined => {
  const v = p?.attrs[key];
  return v === undefined ? undefined : String(v);
};

/** Які форм-фактори плат вміщує корпус (виводимо з розміру корпуса). */
function moboFitsCase(caseForm: string, moboForm: string): boolean {
  const big = ['ATX', 'microATX', 'Mini-ITX'];
  const supported: Record<string, string[]> = {
    'Full Tower': big,
    'Mid Tower': big,
    'Mini-ITX': ['Mini-ITX'],
  };
  return (supported[caseForm] ?? big).includes(moboForm);
}

export function checkBuild(sel: BuildSelection): BuildReport {
  const issues: Issue[] = [];
  const { cpu, mobo, ram, gpu, psu, case: pcCase } = sel;

  // --- CPU ↔ материнська плата: сокет ---
  const cpuSocket = str(cpu, 'socket');
  const moboSocket = str(mobo, 'socket');
  if (cpuSocket && moboSocket && cpuSocket !== moboSocket) {
    issues.push({
      level: 'error',
      parts: ['cpu', 'mobo'],
      message: `Процесор має сокет ${cpuSocket}, а плата — ${moboSocket}. Вони несумісні.`,
    });
  }

  // --- RAM ↔ материнська плата: тип пам'яті та кількість слотів ---
  const ramType = str(ram, 'mem_type');
  const moboMem = str(mobo, 'mem_type');
  if (ramType && moboMem && ramType !== moboMem) {
    issues.push({
      level: 'error',
      parts: ['ram', 'mobo'],
      message: `Пам'ять ${ramType} не підходить до плати з ${moboMem}. Тип пам'яті мусить збігатися.`,
    });
  }
  const modules = num(ram, 'modules');
  const memSlots = num(mobo, 'mem_slots');
  if (modules && memSlots && modules > memSlots) {
    issues.push({
      level: 'error',
      parts: ['ram', 'mobo'],
      message: `У комплекті ${modules} модулі(в), а на платі лише ${memSlots} слоти(ів) пам'яті.`,
    });
  }

  // --- Материнська плата ↔ корпус: форм-фактор ---
  const moboForm = str(mobo, 'form_factor');
  const caseForm = str(pcCase, 'form_factor');
  if (moboForm && caseForm && !moboFitsCase(caseForm, moboForm)) {
    issues.push({
      level: 'error',
      parts: ['mobo', 'case'],
      message: `Плата формату ${moboForm} не поміститься в корпус ${caseForm}.`,
    });
  }

  // --- GPU ↔ корпус: довжина ---
  const gpuLen = num(gpu, 'length_mm');
  const maxLen = num(pcCase, 'max_gpu_len');
  if (gpuLen && maxLen && gpuLen > maxLen) {
    issues.push({
      level: 'error',
      parts: ['gpu', 'case'],
      message: `Відеокарта завдовжки ${gpuLen} мм не влізе: корпус тримає максимум ${maxLen} мм.`,
    });
  } else if (gpuLen && maxLen && maxLen - gpuLen < 20) {
    issues.push({
      level: 'warning',
      parts: ['gpu', 'case'],
      message: `Запас лише ${maxLen - gpuLen} мм — карта стане впритул, кабелі живлення можуть заважати.`,
    });
  }

  // --- БЖ ↔ корпус: форм-фактор ---
  const psuForm = str(psu, 'form_factor');
  if (psuForm && caseForm === 'Mini-ITX' && psuForm !== 'SFX') {
    issues.push({
      level: 'error',
      parts: ['psu', 'case'],
      message: `Компактний корпус вимагає блок живлення SFX, а обраний — ${psuForm}.`,
    });
  }

  // --- Потужність БЖ ---
  const cpuTdp = num(cpu, 'tdp') ?? 0;
  const gpuTdp = num(gpu, 'tdp') ?? 0;
  const estimatedWatts = cpuTdp + gpuTdp + BASE_SYSTEM_WATTS;
  const recommendedPsuWatts = Math.ceil((estimatedWatts * PSU_HEADROOM) / 50) * 50;

  const psuWatts = num(psu, 'wattage');
  if (psuWatts && (cpu || gpu)) {
    if (psuWatts < estimatedWatts) {
      issues.push({
        level: 'error',
        parts: ['psu'],
        message: `Блок на ${psuWatts} Вт слабший за споживання збірки (~${estimatedWatts} Вт). Потрібно від ${recommendedPsuWatts} Вт.`,
      });
    } else if (psuWatts < recommendedPsuWatts) {
      issues.push({
        level: 'warning',
        parts: ['psu'],
        message: `Блок на ${psuWatts} Вт працюватиме без запасу. Рекомендуємо від ${recommendedPsuWatts} Вт.`,
      });
    }
  }

  const totalCents = (Object.values(sel) as BuildPart[]).reduce((s, p) => s + (p?.price_cents ?? 0), 0);

  return {
    issues,
    estimatedWatts,
    recommendedPsuWatts,
    totalCents,
    hasErrors: issues.some((i) => i.level === 'error'),
  };
}

/** Слоти збірки в порядку показу. */
export const BUILD_SLOTS: Array<{ type: PartType; label: string; required: boolean }> = [
  { type: 'cpu', label: 'Процесор', required: true },
  { type: 'mobo', label: 'Материнська плата', required: true },
  { type: 'ram', label: "Оперативна пам'ять", required: true },
  { type: 'gpu', label: 'Відеокарта', required: false },
  { type: 'psu', label: 'Блок живлення', required: true },
  { type: 'case', label: 'Корпус', required: true },
];
