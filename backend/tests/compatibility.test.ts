import { checkBuild, type BuildPart, type BuildSelection } from '../src/modules/builder/compatibility';

const part = (title: string, attrs: Record<string, string | number>, price = 100000): BuildPart => ({
  id: title,
  title,
  price_cents: price,
  attrs,
});

// Базові сумісні комплектуючі (AM5 + DDR5 + Mid Tower).
const cpuAm5 = part('Ryzen 7 9800X3D', { socket: 'AM5', tdp: 120 });
const moboAm5 = part('MSI B650 Tomahawk', {
  socket: 'AM5',
  mem_type: 'DDR5',
  mem_slots: 4,
  form_factor: 'ATX',
});
const ramDdr5 = part('Kingston Fury 32GB', { mem_type: 'DDR5', modules: 2 });
const gpuMid = part('RTX 4070', { tdp: 200, length_mm: 285 });
const psu850 = part('Corsair RM850e', { wattage: 850, form_factor: 'ATX' });
const caseMid = part('NZXT H7 Flow', { form_factor: 'Mid Tower', max_gpu_len: 400 });

const goodBuild: BuildSelection = {
  cpu: cpuAm5,
  mobo: moboAm5,
  ram: ramDdr5,
  gpu: gpuMid,
  psu: psu850,
  case: caseMid,
};

describe('checkBuild — движок сумісності', () => {
  it('сумісна збірка не має помилок', () => {
    const r = checkBuild(goodBuild);
    expect(r.hasErrors).toBe(false);
    expect(r.issues).toHaveLength(0);
  });

  it('рахує споживання і рекомендовану потужність БЖ', () => {
    const r = checkBuild(goodBuild);
    // 120 (CPU) + 200 (GPU) + 90 (база) = 410 Вт; 410 * 1.3 = 533 → округлення вгору до 550.
    expect(r.estimatedWatts).toBe(410);
    expect(r.recommendedPsuWatts).toBe(550);
    expect(r.totalCents).toBe(600000);
  });

  it('ловить невідповідність сокета CPU і плати', () => {
    const r = checkBuild({ ...goodBuild, cpu: part('Core i5-13400F', { socket: 'LGA1700', tdp: 65 }) });
    expect(r.hasErrors).toBe(true);
    expect(r.issues[0].parts).toEqual(['cpu', 'mobo']);
    expect(r.issues[0].message).toContain('LGA1700');
  });

  it('ловить невідповідність типу пам’яті', () => {
    const r = checkBuild({ ...goodBuild, ram: part('Corsair LPX 16GB', { mem_type: 'DDR4', modules: 2 }) });
    expect(r.issues.some((i) => i.level === 'error' && i.parts.includes('ram'))).toBe(true);
  });

  it('ловить брак слотів пам’яті на платі', () => {
    const itxMobo = part('B650I ITX', {
      socket: 'AM5',
      mem_type: 'DDR5',
      mem_slots: 2,
      form_factor: 'Mini-ITX',
    });
    const r = checkBuild({
      ...goodBuild,
      mobo: itxMobo,
      ram: part('4×16 ГБ', { mem_type: 'DDR5', modules: 4 }),
    });
    expect(r.issues.some((i) => i.message.includes('слоти'))).toBe(true);
  });

  it('ловить занадто довгу відеокарту для корпуса', () => {
    const r = checkBuild({
      ...goodBuild,
      gpu: part('RTX 5090', { tdp: 575, length_mm: 360 }),
      case: part('Fractal Meshify 2', { form_factor: 'Mid Tower', max_gpu_len: 315 }),
    });
    expect(r.hasErrors).toBe(true);
    expect(r.issues.some((i) => i.parts.includes('gpu') && i.parts.includes('case'))).toBe(true);
  });

  it('попереджає, коли карта стає впритул', () => {
    const r = checkBuild({
      ...goodBuild,
      case: part('Тісний корпус', { form_factor: 'Mid Tower', max_gpu_len: 295 }),
    });
    const warn = r.issues.find((i) => i.level === 'warning' && i.parts.includes('gpu'));
    expect(warn).toBeDefined();
    expect(r.hasErrors).toBe(false);
  });

  it('ловить ATX-плату в Mini-ITX корпусі', () => {
    const r = checkBuild({
      ...goodBuild,
      case: part('Lian Li A4-H2O', { form_factor: 'Mini-ITX', max_gpu_len: 322 }),
      psu: part('ASUS ROG Loki SFX', { wattage: 850, form_factor: 'SFX' }),
    });
    expect(r.issues.some((i) => i.parts.includes('mobo') && i.parts.includes('case'))).toBe(true);
  });

  it('ловить ATX-блок живлення в Mini-ITX корпусі', () => {
    const itxMobo = part('B650I ITX', {
      socket: 'AM5',
      mem_type: 'DDR5',
      mem_slots: 2,
      form_factor: 'Mini-ITX',
    });
    const r = checkBuild({
      ...goodBuild,
      mobo: itxMobo,
      case: part('Lian Li A4-H2O', { form_factor: 'Mini-ITX', max_gpu_len: 322 }),
    });
    expect(r.issues.some((i) => i.parts.includes('psu') && i.message.includes('SFX'))).toBe(true);
  });

  it('ловить недостатню потужність БЖ', () => {
    const r = checkBuild({
      ...goodBuild,
      gpu: part('RTX 5090', { tdp: 575, length_mm: 360 }),
      case: part('HAF 700', { form_factor: 'Full Tower', max_gpu_len: 490 }),
      psu: part('Deepcool PK550D', { wattage: 550, form_factor: 'ATX' }),
    });
    // 120 + 575 + 90 = 785 Вт > 550 Вт
    expect(r.hasErrors).toBe(true);
    expect(r.issues.some((i) => i.parts.includes('psu') && i.level === 'error')).toBe(true);
  });

  it('попереджає про БЖ без запасу потужності', () => {
    const r = checkBuild({
      ...goodBuild,
      gpu: part('RTX 4080', { tdp: 320, length_mm: 336 }),
      psu: part('Seasonic Focus GX-650', { wattage: 650, form_factor: 'ATX' }),
    });
    // 120 + 320 + 90 = 530 Вт; рекомендація 700 Вт, БЖ 650 → попередження, не помилка.
    expect(r.hasErrors).toBe(false);
    expect(r.issues.some((i) => i.level === 'warning' && i.parts.includes('psu'))).toBe(true);
  });

  it('часткова збірка не падає і не вигадує помилок', () => {
    const r = checkBuild({ cpu: cpuAm5 });
    expect(r.issues).toHaveLength(0);
    expect(r.estimatedWatts).toBe(210); // 120 + база 90
    expect(r.hasErrors).toBe(false);
  });

  it('порожня збірка повертає нульові підсумки', () => {
    const r = checkBuild({});
    expect(r.totalCents).toBe(0);
    expect(r.estimatedWatts).toBe(90);
    expect(r.hasErrors).toBe(false);
  });
});
