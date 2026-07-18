export interface NpCity {
  ref: string;
  name: string;
  area: string;
}

export interface NpWarehouse {
  ref: string;
  cityRef: string;
  number: number;
  name: string;
  address: string;
  maxWeightKg: number;
}

export const npCities: NpCity[] = [
  { ref: 'db5c88f0-391c-11dd-90d9-001a92567626', name: 'Київ', area: 'Київська' },
  { ref: 'db5c88d0-391c-11dd-90d9-001a92567626', name: 'Харків', area: 'Харківська' },
  { ref: 'db5c88f5-391c-11dd-90d9-001a92567626', name: 'Львів', area: 'Львівська' },
  { ref: 'db5c88de-391c-11dd-90d9-001a92567626', name: 'Одеса', area: 'Одеська' },
  { ref: 'db5c8892-391c-11dd-90d9-001a92567626', name: 'Дніпро', area: 'Дніпропетровська' },
  { ref: 'db5c8903-391c-11dd-90d9-001a92567626', name: 'Запоріжжя', area: 'Запорізька' },
  { ref: 'db5c8913-391c-11dd-90d9-001a92567626', name: 'Вінниця', area: 'Вінницька' },
  { ref: 'db5c8927-391c-11dd-90d9-001a92567626', name: 'Полтава', area: 'Полтавська' },
  { ref: 'db5c8938-391c-11dd-90d9-001a92567626', name: 'Івано-Франківськ', area: 'Івано-Франківська' },
  { ref: 'db5c8945-391c-11dd-90d9-001a92567626', name: 'Тернопіль', area: 'Тернопільська' },
  { ref: 'db5c8951-391c-11dd-90d9-001a92567626', name: 'Чернівці', area: 'Чернівецька' },
  { ref: 'db5c8967-391c-11dd-90d9-001a92567626', name: 'Житомир', area: 'Житомирська' },
  { ref: 'db5c8974-391c-11dd-90d9-001a92567626', name: 'Ужгород', area: 'Закарпатська' },
  { ref: 'db5c8981-391c-11dd-90d9-001a92567626', name: 'Черкаси', area: 'Черкаська' },
  { ref: 'db5c8995-391c-11dd-90d9-001a92567626', name: 'Рівне', area: 'Рівненська' },
  { ref: 'db5c89a2-391c-11dd-90d9-001a92567626', name: 'Луцьк', area: 'Волинська' },
  { ref: 'db5c89b7-391c-11dd-90d9-001a92567626', name: 'Хмельницький', area: 'Хмельницька' },
  { ref: 'db5c89c4-391c-11dd-90d9-001a92567626', name: 'Миколаїв', area: 'Миколаївська' },
  { ref: 'db5c89d1-391c-11dd-90d9-001a92567626', name: 'Суми', area: 'Сумська' },
  { ref: 'db5c89e6-391c-11dd-90d9-001a92567626', name: 'Кропивницький', area: 'Кіровоградська' },
];

const STREETS = [
  'вул. Соборна',
  'вул. Незалежності',
  'просп. Свободи',
  'вул. Шевченка',
  'вул. Героїв',
  'просп. Миру',
  'вул. Гагаріна',
  'вул. Сагайдачного',
];

export const npWarehouses: NpWarehouse[] = npCities.flatMap((city, ci) => {
  const count = ci === 0 ? 12 : ci < 5 ? 8 : 4;
  return Array.from({ length: count }, (_, i) => {
    const number = i + 1;
    const street = STREETS[(ci + i) % STREETS.length];
    return {
      ref: `${city.ref.slice(0, 8)}-wh${String(number).padStart(3, '0')}`,
      cityRef: city.ref,
      number,
      name: `Відділення №${number}`,
      address: `${city.name}, ${street}, ${((ci * 7 + number * 3) % 90) + 1}`,
      maxWeightKg: number % 3 === 0 ? 1100 : 30,
    };
  });
});
