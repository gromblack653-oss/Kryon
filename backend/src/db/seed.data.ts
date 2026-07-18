/**
 * Демо-дані магазину відеокарт Kryon.
 * Реальні моделі, випущені починаючи з 2019 року (NVIDIA, AMD, Intel).
 * Ціни — у копійках (грн × 100), орієнтовні для українського ринку.
 */

export interface SeedCategory {
  name: string;
  slug: string;
}

export interface SeedProduct {
  title: string;
  slug: string;
  price: number; // копійки
  stock: number;
  cat: string; // slug категорії
  desc: string;
}

// Категорії = покоління/серії GPU для зручної фільтрації.
export const categories: SeedCategory[] = [
  { name: 'GeForce RTX 50', slug: 'rtx-50' },
  { name: 'GeForce RTX 40', slug: 'rtx-40' },
  { name: 'GeForce RTX 30', slug: 'rtx-30' },
  { name: 'GeForce RTX 20 / GTX 16', slug: 'rtx-20-gtx-16' },
  { name: 'Radeon RX 9000', slug: 'rx-9000' },
  { name: 'Radeon RX 7000', slug: 'rx-7000' },
  { name: 'Radeon RX 6000', slug: 'rx-6000' },
  { name: 'Radeon RX 5000', slug: 'rx-5000' },
  { name: 'Intel Arc', slug: 'intel-arc' },
];

export const products: SeedProduct[] = [
  // ===== NVIDIA GeForce RTX 50 (Blackwell, 2025) =====
  { title: 'NVIDIA GeForce RTX 5090', slug: 'rtx-5090', price: 9999900, stock: 4, cat: 'rtx-50', desc: '32 ГБ GDDR7, 512-біт. Флагман Blackwell 2025 року з DLSS 4 та ray tracing 4-го покоління.' },
  { title: 'NVIDIA GeForce RTX 5080', slug: 'rtx-5080', price: 5499900, stock: 8, cat: 'rtx-50', desc: '16 ГБ GDDR7, 256-біт. Топова карта для 4K-геймінгу, 2025 рік.' },
  { title: 'NVIDIA GeForce RTX 5070 Ti', slug: 'rtx-5070-ti', price: 4199900, stock: 12, cat: 'rtx-50', desc: '16 ГБ GDDR7, 256-біт. Потужна карта для 1440p/4K, 2025 рік.' },
  { title: 'NVIDIA GeForce RTX 5070', slug: 'rtx-5070', price: 2899900, stock: 18, cat: 'rtx-50', desc: '12 ГБ GDDR7, 192-біт. Оптимальна для QHD-геймінгу з DLSS 4.' },
  { title: 'NVIDIA GeForce RTX 5060 Ti 16GB', slug: 'rtx-5060-ti-16gb', price: 2199900, stock: 22, cat: 'rtx-50', desc: '16 ГБ GDDR7, 128-біт. Збалансована карта для 1440p, 2025 рік.' },
  { title: 'NVIDIA GeForce RTX 5060', slug: 'rtx-5060', price: 1499900, stock: 30, cat: 'rtx-50', desc: '8 ГБ GDDR7, 128-біт. Доступна карта покоління Blackwell для Full HD.' },
  { title: 'NVIDIA GeForce RTX 5050', slug: 'rtx-5050', price: 1099900, stock: 26, cat: 'rtx-50', desc: '8 ГБ GDDR6, 128-біт. Бюджетний вхід у RTX 50 для Full HD-геймінгу.' },

  // ===== NVIDIA GeForce RTX 40 (Ada Lovelace, 2022–2024) =====
  { title: 'NVIDIA GeForce RTX 4090', slug: 'rtx-4090', price: 8499900, stock: 5, cat: 'rtx-40', desc: '24 ГБ GDDR6X, 384-біт. Флагман Ada Lovelace 2022 року, лідер для 4K та AI.' },
  { title: 'NVIDIA GeForce RTX 4080 SUPER', slug: 'rtx-4080-super', price: 4999900, stock: 9, cat: 'rtx-40', desc: '16 ГБ GDDR6X, 256-біт. Оновлена версія 4080, початок 2024 року.' },
  { title: 'NVIDIA GeForce RTX 4080', slug: 'rtx-4080', price: 4699900, stock: 7, cat: 'rtx-40', desc: '16 ГБ GDDR6X, 256-біт. Висока продуктивність у 4K, 2022 рік.' },
  { title: 'NVIDIA GeForce RTX 4070 Ti SUPER', slug: 'rtx-4070-ti-super', price: 3999900, stock: 11, cat: 'rtx-40', desc: '16 ГБ GDDR6X, 256-біт. Розширена памʼять проти 4070 Ti, 2024 рік.' },
  { title: 'NVIDIA GeForce RTX 4070 Ti', slug: 'rtx-4070-ti', price: 3699900, stock: 10, cat: 'rtx-40', desc: '12 ГБ GDDR6X, 192-біт. Швидка карта для QHD/4K, 2023 рік.' },
  { title: 'NVIDIA GeForce RTX 4070 SUPER', slug: 'rtx-4070-super', price: 2899900, stock: 16, cat: 'rtx-40', desc: '12 ГБ GDDR6X, 192-біт. Більше CUDA-ядер за ту ж ціну, 2024 рік.' },
  { title: 'NVIDIA GeForce RTX 4070', slug: 'rtx-4070', price: 2599900, stock: 20, cat: 'rtx-40', desc: '12 ГБ GDDR6X, 192-біт. Популярний вибір для 1440p, 2023 рік.' },
  { title: 'NVIDIA GeForce RTX 4060 Ti 16GB', slug: 'rtx-4060-ti-16gb', price: 2099900, stock: 18, cat: 'rtx-40', desc: '16 ГБ GDDR6, 128-біт. Версія з подвійною памʼяттю для важких текстур.' },
  { title: 'NVIDIA GeForce RTX 4060 Ti', slug: 'rtx-4060-ti', price: 1799900, stock: 28, cat: 'rtx-40', desc: '8 ГБ GDDR6, 128-біт. Ефективна карта для 1080p/1440p, 2023 рік.' },
  { title: 'NVIDIA GeForce RTX 4060', slug: 'rtx-4060', price: 1399900, stock: 40, cat: 'rtx-40', desc: '8 ГБ GDDR6, 128-біт. Найпопулярніша бюджетна RTX 40 для Full HD.' },

  // ===== NVIDIA GeForce RTX 30 (Ampere, 2020–2022) =====
  { title: 'NVIDIA GeForce RTX 3090 Ti', slug: 'rtx-3090-ti', price: 3999900, stock: 3, cat: 'rtx-30', desc: '24 ГБ GDDR6X, 384-біт. Найпотужніша Ampere, весна 2022 року.' },
  { title: 'NVIDIA GeForce RTX 3090', slug: 'rtx-3090', price: 3499900, stock: 5, cat: 'rtx-30', desc: '24 ГБ GDDR6X, 384-біт. Топова карта 2020 року для 8K та рендерингу.' },
  { title: 'NVIDIA GeForce RTX 3080 Ti', slug: 'rtx-3080-ti', price: 2999900, stock: 6, cat: 'rtx-30', desc: '12 ГБ GDDR6X, 384-біт. Майже рівень 3090 за меншу ціну, 2021 рік.' },
  { title: 'NVIDIA GeForce RTX 3080', slug: 'rtx-3080', price: 2499900, stock: 9, cat: 'rtx-30', desc: '10 ГБ GDDR6X, 320-біт. Легендарна карта для 4K, 2020 рік.' },
  { title: 'NVIDIA GeForce RTX 3070 Ti', slug: 'rtx-3070-ti', price: 1999900, stock: 12, cat: 'rtx-30', desc: '8 ГБ GDDR6X, 256-біт. Прискорена версія 3070, 2021 рік.' },
  { title: 'NVIDIA GeForce RTX 3070', slug: 'rtx-3070', price: 1799900, stock: 15, cat: 'rtx-30', desc: '8 ГБ GDDR6, 256-біт. Продуктивність рівня 2080 Ti, 2020 рік.' },
  { title: 'NVIDIA GeForce RTX 3060 Ti', slug: 'rtx-3060-ti', price: 1499900, stock: 20, cat: 'rtx-30', desc: '8 ГБ GDDR6, 256-біт. Відмінний вибір для 1440p, 2020 рік.' },
  { title: 'NVIDIA GeForce RTX 3060', slug: 'rtx-3060', price: 1199900, stock: 30, cat: 'rtx-30', desc: '12 ГБ GDDR6, 192-біт. Популярна карта для Full HD з великою памʼяттю.' },
  { title: 'NVIDIA GeForce RTX 3050', slug: 'rtx-3050', price: 899900, stock: 34, cat: 'rtx-30', desc: '8 ГБ GDDR6, 128-біт. Бюджетна RTX для Full HD, 2022 рік.' },

  // ===== NVIDIA RTX 20 / GTX 16 (Turing, 2019) =====
  { title: 'NVIDIA GeForce RTX 2080 SUPER', slug: 'rtx-2080-super', price: 1899900, stock: 6, cat: 'rtx-20-gtx-16', desc: '8 ГБ GDDR6, 256-біт. Оновлений флагман Turing, липень 2019 року.' },
  { title: 'NVIDIA GeForce RTX 2070 SUPER', slug: 'rtx-2070-super', price: 1599900, stock: 8, cat: 'rtx-20-gtx-16', desc: '8 ГБ GDDR6, 256-біт. Потужна карта для 1440p, 2019 рік.' },
  { title: 'NVIDIA GeForce RTX 2060 SUPER', slug: 'rtx-2060-super', price: 1199900, stock: 12, cat: 'rtx-20-gtx-16', desc: '8 ГБ GDDR6, 256-біт. Ray tracing за помірну ціну, 2019 рік.' },
  { title: 'NVIDIA GeForce RTX 2060', slug: 'rtx-2060', price: 899900, stock: 16, cat: 'rtx-20-gtx-16', desc: '6 ГБ GDDR6, 192-біт. Перша доступна RTX, січень 2019 року.' },
  { title: 'NVIDIA GeForce GTX 1660 Ti', slug: 'gtx-1660-ti', price: 749900, stock: 18, cat: 'rtx-20-gtx-16', desc: '6 ГБ GDDR6, 192-біт. Швидка карта без RT, лютий 2019 року.' },
  { title: 'NVIDIA GeForce GTX 1660 SUPER', slug: 'gtx-1660-super', price: 699900, stock: 24, cat: 'rtx-20-gtx-16', desc: '6 ГБ GDDR6, 192-біт. Популярна бюджетна карта, жовтень 2019 року.' },
  { title: 'NVIDIA GeForce GTX 1660', slug: 'gtx-1660', price: 649900, stock: 20, cat: 'rtx-20-gtx-16', desc: '6 ГБ GDDR5, 192-біт. Надійна карта для Full HD, березень 2019 року.' },
  { title: 'NVIDIA GeForce GTX 1650 SUPER', slug: 'gtx-1650-super', price: 549900, stock: 28, cat: 'rtx-20-gtx-16', desc: '4 ГБ GDDR6, 128-біт. Доступна карта для кіберспорту, листопад 2019 року.' },
  { title: 'NVIDIA GeForce GTX 1650', slug: 'gtx-1650', price: 499900, stock: 32, cat: 'rtx-20-gtx-16', desc: '4 ГБ GDDR5, 128-біт. Енергоефективна карта без додаткового живлення, 2019 рік.' },

  // ===== AMD Radeon RX 9000 (RDNA 4, 2025) =====
  { title: 'AMD Radeon RX 9070 XT', slug: 'rx-9070-xt', price: 3199900, stock: 10, cat: 'rx-9000', desc: '16 ГБ GDDR6, 256-біт. Флагман RDNA 4 для 4K-геймінгу, 2025 рік.' },
  { title: 'AMD Radeon RX 9070', slug: 'rx-9070', price: 2699900, stock: 14, cat: 'rx-9000', desc: '16 ГБ GDDR6, 256-біт. Потужна карта для QHD/4K із FSR 4, 2025 рік.' },
  { title: 'AMD Radeon RX 9060 XT 16GB', slug: 'rx-9060-xt-16gb', price: 1799900, stock: 24, cat: 'rx-9000', desc: '16 ГБ GDDR6, 128-біт. Збалансована карта середнього класу, 2025 рік.' },
  { title: 'AMD Radeon RX 9060 XT 8GB', slug: 'rx-9060-xt-8gb', price: 1499900, stock: 26, cat: 'rx-9000', desc: '8 ГБ GDDR6, 128-біт. Доступна версія RDNA 4 для Full HD, 2025 рік.' },

  // ===== AMD Radeon RX 7000 (RDNA 3, 2022–2024) =====
  { title: 'AMD Radeon RX 7900 XTX', slug: 'rx-7900-xtx', price: 4499900, stock: 7, cat: 'rx-7000', desc: '24 ГБ GDDR6, 384-біт. Флагман RDNA 3, грудень 2022 року.' },
  { title: 'AMD Radeon RX 7900 XT', slug: 'rx-7900-xt', price: 3799900, stock: 9, cat: 'rx-7000', desc: '20 ГБ GDDR6, 320-біт. Топова карта для 4K, 2022 рік.' },
  { title: 'AMD Radeon RX 7900 GRE', slug: 'rx-7900-gre', price: 2599900, stock: 12, cat: 'rx-7000', desc: '16 ГБ GDDR6, 256-біт. Golden Rabbit Edition для 1440p/4K, 2024 рік.' },
  { title: 'AMD Radeon RX 7800 XT', slug: 'rx-7800-xt', price: 2299900, stock: 18, cat: 'rx-7000', desc: '16 ГБ GDDR6, 256-біт. Відмінна карта для QHD, вересень 2023 року.' },
  { title: 'AMD Radeon RX 7700 XT', slug: 'rx-7700-xt', price: 1899900, stock: 20, cat: 'rx-7000', desc: '12 ГБ GDDR6, 192-біт. Продуктивна карта для 1440p, 2023 рік.' },
  { title: 'AMD Radeon RX 7600 XT', slug: 'rx-7600-xt', price: 1499900, stock: 24, cat: 'rx-7000', desc: '16 ГБ GDDR6, 128-біт. Full HD/QHD з великою памʼяттю, 2024 рік.' },
  { title: 'AMD Radeon RX 7600', slug: 'rx-7600', price: 1199900, stock: 30, cat: 'rx-7000', desc: '8 ГБ GDDR6, 128-біт. Доступна карта для Full HD, травень 2023 року.' },

  // ===== AMD Radeon RX 6000 (RDNA 2, 2020–2022) =====
  { title: 'AMD Radeon RX 6950 XT', slug: 'rx-6950-xt', price: 2799900, stock: 6, cat: 'rx-6000', desc: '16 ГБ GDDR6, 256-біт. Оновлений флагман RDNA 2, травень 2022 року.' },
  { title: 'AMD Radeon RX 6900 XT', slug: 'rx-6900-xt', price: 2499900, stock: 7, cat: 'rx-6000', desc: '16 ГБ GDDR6, 256-біт. Топова карта 2020 року для 4K.' },
  { title: 'AMD Radeon RX 6800 XT', slug: 'rx-6800-xt', price: 2199900, stock: 10, cat: 'rx-6000', desc: '16 ГБ GDDR6, 256-біт. Конкурент RTX 3080, 2020 рік.' },
  { title: 'AMD Radeon RX 6800', slug: 'rx-6800', price: 1899900, stock: 12, cat: 'rx-6000', desc: '16 ГБ GDDR6, 256-біт. Потужна карта для 1440p/4K, 2020 рік.' },
  { title: 'AMD Radeon RX 6750 XT', slug: 'rx-6750-xt', price: 1599900, stock: 16, cat: 'rx-6000', desc: '12 ГБ GDDR6, 192-біт. Розігнана версія 6700 XT, 2022 рік.' },
  { title: 'AMD Radeon RX 6700 XT', slug: 'rx-6700-xt', price: 1499900, stock: 20, cat: 'rx-6000', desc: '12 ГБ GDDR6, 192-біт. Чудовий вибір для 1440p, 2021 рік.' },
  { title: 'AMD Radeon RX 6650 XT', slug: 'rx-6650-xt', price: 1199900, stock: 22, cat: 'rx-6000', desc: '8 ГБ GDDR6, 128-біт. Оновлена 6600 XT для Full HD, 2022 рік.' },
  { title: 'AMD Radeon RX 6600 XT', slug: 'rx-6600-xt', price: 1099900, stock: 24, cat: 'rx-6000', desc: '8 ГБ GDDR6, 128-біт. Швидка карта для 1080p, серпень 2021 року.' },
  { title: 'AMD Radeon RX 6600', slug: 'rx-6600', price: 899900, stock: 30, cat: 'rx-6000', desc: '8 ГБ GDDR6, 128-біт. Енергоефективна карта для Full HD, 2021 рік.' },
  { title: 'AMD Radeon RX 6500 XT', slug: 'rx-6500-xt', price: 549900, stock: 34, cat: 'rx-6000', desc: '4 ГБ GDDR6, 64-біт. Бюджетна карта для кіберспорту, 2022 рік.' },

  // ===== AMD Radeon RX 5000 (RDNA, 2019–2020) =====
  { title: 'AMD Radeon RX 5700 XT', slug: 'rx-5700-xt', price: 1099900, stock: 10, cat: 'rx-5000', desc: '8 ГБ GDDR6, 256-біт. Перша карта на RDNA, липень 2019 року.' },
  { title: 'AMD Radeon RX 5700', slug: 'rx-5700', price: 949900, stock: 12, cat: 'rx-5000', desc: '8 ГБ GDDR6, 256-біт. Потужна карта для 1440p, 2019 рік.' },
  { title: 'AMD Radeon RX 5600 XT', slug: 'rx-5600-xt', price: 799900, stock: 16, cat: 'rx-5000', desc: '6 ГБ GDDR6, 192-біт. Оптимальна для Full HD, січень 2020 року.' },
  { title: 'AMD Radeon RX 5500 XT 8GB', slug: 'rx-5500-xt-8gb', price: 649900, stock: 20, cat: 'rx-5000', desc: '8 ГБ GDDR6, 128-біт. Доступна карта для Full HD, грудень 2019 року.' },
  { title: 'AMD Radeon RX 5500 XT 4GB', slug: 'rx-5500-xt-4gb', price: 549900, stock: 22, cat: 'rx-5000', desc: '4 ГБ GDDR6, 128-біт. Бюджетний варіант RDNA, 2019 рік.' },

  // ===== Intel Arc (Alchemist 2022 + Battlemage 2024–2025) =====
  { title: 'Intel Arc B580', slug: 'arc-b580', price: 1399900, stock: 20, cat: 'intel-arc', desc: '12 ГБ GDDR6, 192-біт. Battlemage для 1440p за привабливу ціну, грудень 2024 року.' },
  { title: 'Intel Arc B570', slug: 'arc-b570', price: 1199900, stock: 24, cat: 'intel-arc', desc: '10 ГБ GDDR6, 160-біт. Доступна карта Battlemage для Full HD, січень 2025 року.' },
  { title: 'Intel Arc A770 16GB', slug: 'arc-a770', price: 1299900, stock: 14, cat: 'intel-arc', desc: '16 ГБ GDDR6, 256-біт. Флагман Alchemist із великою памʼяттю, жовтень 2022 року.' },
  { title: 'Intel Arc A750', slug: 'arc-a750', price: 999900, stock: 18, cat: 'intel-arc', desc: '8 ГБ GDDR6, 256-біт. Конкурент RTX 3060 для 1440p, 2022 рік.' },
  { title: 'Intel Arc A580', slug: 'arc-a580', price: 799900, stock: 20, cat: 'intel-arc', desc: '8 ГБ GDDR6, 256-біт. Карта для Full HD-геймінгу, 2023 рік.' },
  { title: 'Intel Arc A380', slug: 'arc-a380', price: 549900, stock: 26, cat: 'intel-arc', desc: '6 ГБ GDDR6, 96-біт. Бюджетна карта з апаратним AV1-кодеком, 2022 рік.' },
];

/** Телефон стандартного покупця user@kryon.ua. */
export const defaultCustomerPhone = '+380501112233';

/** Тип компонента (поки один — відеокарти; фундамент під БЖ/корпуси/CPU). */
export const gpuType = { key: 'gpu', name: 'Відеокарти', icon: '🎮', position: 1 };

/** Схема характеристик відеокарти (для spec-таблиць і faceted-фільтрів). */
export const gpuAttributes: Array<{
  key: string;
  label: string;
  unit?: string;
  dataType: 'text' | 'number' | 'enum' | 'bool';
  filterable: boolean;
  showOnCard?: boolean;
  position: number;
}> = [
  { key: 'brand', label: 'Виробник', dataType: 'enum', filterable: true, position: 1 },
  { key: 'vram_gb', label: "Відеопам'ять", unit: 'ГБ', dataType: 'number', filterable: true, showOnCard: true, position: 2 },
  { key: 'memory_type', label: "Тип пам'яті", dataType: 'enum', filterable: true, showOnCard: true, position: 3 },
  { key: 'bus_bits', label: 'Шина пам’яті', unit: 'біт', dataType: 'number', filterable: true, position: 4 },
  { key: 'release_year', label: 'Рік випуску', dataType: 'number', filterable: true, position: 5 },
  // Потрібні PC Builder: розрахунок БЖ і перевірка габаритів корпуса.
  { key: 'tdp', label: 'Споживання (TDP)', unit: 'Вт', dataType: 'number', filterable: true, position: 6 },
  { key: 'length_mm', label: 'Довжина', unit: 'мм', dataType: 'number', filterable: false, position: 7 },
];

/** Додаткові тестові покупці (пароль у всіх — User123!). */
export const extraCustomers = [
  { email: 'olena@kryon.ua', name: 'Олена Коваль', phone: '+380671234567' },
  { email: 'ihor@kryon.ua', name: 'Ігор Мельник', phone: '+380931112244' },
  { email: 'maria@kryon.ua', name: 'Марія Шевченко', phone: '+380637778899' },
];

/** Працівник CRM (роль agent). Пароль — Agent123!. */
export const agentUser = { email: 'agent@kryon.ua', name: 'Андрій Оператор' };

/** Демо-дзвінки (customerIdx — індекс серед покупців у порядку створення). */
export const demoCalls: Array<{
  customerIdx: number;
  direction: 'outbound' | 'inbound';
  outcome: 'answered' | 'no_answer' | 'busy' | 'voicemail' | 'failed';
  durationSeconds: number;
  note: string;
  recording?: boolean; // прикріпити демо-аудіозапис
}> = [
  { customerIdx: 0, direction: 'outbound', outcome: 'answered', durationSeconds: 245, note: 'Уточнили доставку RTX 4070 Super, клієнт задоволений.', recording: true },
  { customerIdx: 1, direction: 'inbound', outcome: 'answered', durationSeconds: 132, note: 'Питання щодо сумісності RX 9070 XT з БЖ 650W.', recording: true },
  { customerIdx: 1, direction: 'outbound', outcome: 'no_answer', durationSeconds: 0, note: 'Не відповів, передзвонити після 18:00.' },
  { customerIdx: 2, direction: 'outbound', outcome: 'voicemail', durationSeconds: 30, note: 'Залишив голосове: замовлення очікує оплати.' },
  { customerIdx: 3, direction: 'inbound', outcome: 'answered', durationSeconds: 410, note: 'Скасування замовлення RTX 5090 — повернення коштів.', recording: true },
];

/** Демо-відгуки: slug товару, індекс покупця, оцінка, текст. */
export const demoReviews: Array<{
  slug: string;
  customerIdx: number;
  rating: number;
  body: string;
}> = [
  { slug: 'rtx-5090', customerIdx: 0, rating: 5, body: 'Монстр. 4K на максималках без компромісів, але потрібен потужний БЖ.' },
  { slug: 'rtx-5090', customerIdx: 1, rating: 4, body: 'Продуктивність шалена, проте ціна кусається і карта займає три слоти.' },
  { slug: 'rtx-4070-super', customerIdx: 0, rating: 5, body: 'Ідеальний баланс ціни та продуктивності для 1440p. Тиха й холодна.' },
  { slug: 'rtx-4070-super', customerIdx: 2, rating: 4, body: 'Все чудово, але 12 ГБ памʼяті вже трохи замало на перспективу.' },
  { slug: 'rx-9070-xt', customerIdx: 1, rating: 5, body: 'Чудова карта за свої гроші, FSR 4 приємно здивував.' },
  { slug: 'rx-9070-xt', customerIdx: 3, rating: 3, body: 'Драйвери спочатку глючили, після оновлення стало нормально.' },
  { slug: 'arc-b580', customerIdx: 2, rating: 4, body: 'Несподівано добре для Intel. 12 ГБ за такі гроші — топ.' },
  { slug: 'ryzen-7-9800x3d', customerIdx: 0, rating: 5, body: 'Найкращий ігровий процесор, крапка. Тримає низькі температури.' },
  { slug: 'ryzen-7-9800x3d', customerIdx: 1, rating: 5, body: 'Апгрейд з 5600 — приріст у CPU-залежних іграх колосальний.' },
  { slug: 'corsair-rm850e', customerIdx: 0, rating: 5, body: 'Тихий, модульний, кабель 12VHPWR у комплекті. Рекомендую.' },
  { slug: 'corsair-rm850e', customerIdx: 2, rating: 4, body: 'Гарний БЖ, але кабелі жорсткуваті — прокладати незручно.' },
  { slug: 'lianli-o11-dynamic-evo', customerIdx: 1, rating: 5, body: 'Найкрасивіший корпус, збірка виглядає як витвір мистецтва.' },
  { slug: 'lianli-o11-dynamic-evo', customerIdx: 3, rating: 4, body: 'Вентилятори доведеться купувати окремо — у комплекті їх немає.' },
  { slug: 'kingston-fury-beast-32-ddr5', customerIdx: 2, rating: 5, body: 'EXPO завівся з першого разу, 6000 МГц стабільно.' },
  { slug: 'core-i5-14600k', customerIdx: 3, rating: 4, body: 'Швидкий, але гріється — потрібне пристойне охолодження.' },
];

/** Демо-нотатки / активності по клієнтах. */
export const demoNotes: Array<{
  customerIdx: number;
  type: 'note' | 'task' | 'meeting' | 'email';
  body: string;
}> = [
  { customerIdx: 0, type: 'note', body: 'VIP-клієнт, регулярні покупки топових карт.' },
  { customerIdx: 0, type: 'task', body: 'Запропонувати апгрейд до RTX 5080 у наступному кварталі.' },
  { customerIdx: 1, type: 'meeting', body: 'Онлайн-консультація щодо збірки ПК на 15:00.' },
  { customerIdx: 3, type: 'email', body: 'Надіслано інструкцію з повернення коштів.' },
];

/** Демо-замовлення (за slug товарів) для наповнення історії покупок. */
export const demoOrders: Array<{
  customerIdx: number; // індекс серед усіх покупців
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  lines: Array<{ slug: string; qty: number }>;
}> = [
  { customerIdx: 0, status: 'delivered', lines: [{ slug: 'rtx-4070-super', qty: 1 }, { slug: 'rx-7600', qty: 1 }] },
  { customerIdx: 0, status: 'paid', lines: [{ slug: 'rtx-5070-ti', qty: 1 }] },
  { customerIdx: 1, status: 'shipped', lines: [{ slug: 'rx-9070-xt', qty: 1 }, { slug: 'arc-b580', qty: 2 }] },
  { customerIdx: 2, status: 'pending', lines: [{ slug: 'rtx-3060', qty: 1 }] },
  { customerIdx: 3, status: 'cancelled', lines: [{ slug: 'rtx-5090', qty: 1 }] },
  { customerIdx: 1, status: 'delivered', lines: [{ slug: 'gtx-1660-super', qty: 2 }, { slug: 'rx-6600', qty: 1 }] },
];
