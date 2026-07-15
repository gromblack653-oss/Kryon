/**
 * Енергоспоживання (TDP) і габаритна довжина відеокарт.
 * Потрібні для PC Builder: розрахунок потрібної потужності БЖ та
 * перевірка, чи влізе карта в корпус (case.max_gpu_len).
 * Довжина — типова для AIB-моделей середнього класу (не референс).
 */
export interface GpuPower {
  tdp: number; // Вт
  length: number; // мм
}

export const gpuPower: Record<string, GpuPower> = {
  // NVIDIA GeForce RTX 50 (Blackwell)
  'rtx-5090': { tdp: 575, length: 360 },
  'rtx-5080': { tdp: 360, length: 340 },
  'rtx-5070-ti': { tdp: 300, length: 330 },
  'rtx-5070': { tdp: 250, length: 305 },
  'rtx-5060-ti-16gb': { tdp: 180, length: 245 },
  'rtx-5060': { tdp: 145, length: 240 },
  'rtx-5050': { tdp: 130, length: 220 },

  // NVIDIA GeForce RTX 40 (Ada Lovelace)
  'rtx-4090': { tdp: 450, length: 356 },
  'rtx-4080-super': { tdp: 320, length: 336 },
  'rtx-4080': { tdp: 320, length: 336 },
  'rtx-4070-ti-super': { tdp: 285, length: 310 },
  'rtx-4070-ti': { tdp: 285, length: 305 },
  'rtx-4070-super': { tdp: 220, length: 290 },
  'rtx-4070': { tdp: 200, length: 285 },
  'rtx-4060-ti-16gb': { tdp: 165, length: 250 },
  'rtx-4060-ti': { tdp: 160, length: 240 },
  'rtx-4060': { tdp: 115, length: 230 },

  // NVIDIA GeForce RTX 30 (Ampere)
  'rtx-3090-ti': { tdp: 450, length: 336 },
  'rtx-3090': { tdp: 350, length: 336 },
  'rtx-3080-ti': { tdp: 350, length: 320 },
  'rtx-3080': { tdp: 320, length: 320 },
  'rtx-3070-ti': { tdp: 290, length: 300 },
  'rtx-3070': { tdp: 220, length: 290 },
  'rtx-3060-ti': { tdp: 200, length: 280 },
  'rtx-3060': { tdp: 170, length: 250 },
  'rtx-3050': { tdp: 130, length: 220 },

  // NVIDIA GeForce RTX 20 / GTX 16 (Turing)
  'rtx-2080-super': { tdp: 250, length: 267 },
  'rtx-2070-super': { tdp: 215, length: 267 },
  'rtx-2060-super': { tdp: 175, length: 229 },
  'rtx-2060': { tdp: 160, length: 229 },
  'gtx-1660-ti': { tdp: 120, length: 229 },
  'gtx-1660-super': { tdp: 125, length: 229 },
  'gtx-1660': { tdp: 120, length: 229 },
  'gtx-1650-super': { tdp: 100, length: 200 },
  'gtx-1650': { tdp: 75, length: 200 },

  // AMD Radeon RX 9000 (RDNA 4)
  'rx-9070-xt': { tdp: 304, length: 330 },
  'rx-9070': { tdp: 220, length: 305 },
  'rx-9060-xt-16gb': { tdp: 160, length: 250 },
  'rx-9060-xt-8gb': { tdp: 150, length: 250 },

  // AMD Radeon RX 7000 (RDNA 3)
  'rx-7900-xtx': { tdp: 355, length: 340 },
  'rx-7900-xt': { tdp: 315, length: 330 },
  'rx-7900-gre': { tdp: 260, length: 300 },
  'rx-7800-xt': { tdp: 263, length: 300 },
  'rx-7700-xt': { tdp: 245, length: 290 },
  'rx-7600-xt': { tdp: 190, length: 250 },
  'rx-7600': { tdp: 165, length: 240 },

  // AMD Radeon RX 6000 (RDNA 2)
  'rx-6950-xt': { tdp: 335, length: 330 },
  'rx-6900-xt': { tdp: 300, length: 320 },
  'rx-6800-xt': { tdp: 300, length: 320 },
  'rx-6800': { tdp: 250, length: 300 },
  'rx-6750-xt': { tdp: 250, length: 290 },
  'rx-6700-xt': { tdp: 230, length: 280 },
  'rx-6650-xt': { tdp: 180, length: 250 },
  'rx-6600-xt': { tdp: 160, length: 250 },
  'rx-6600': { tdp: 132, length: 240 },
  'rx-6500-xt': { tdp: 107, length: 200 },

  // AMD Radeon RX 5000 (RDNA)
  'rx-5700-xt': { tdp: 225, length: 280 },
  'rx-5700': { tdp: 180, length: 270 },
  'rx-5600-xt': { tdp: 150, length: 250 },
  'rx-5500-xt-8gb': { tdp: 130, length: 220 },
  'rx-5500-xt-4gb': { tdp: 130, length: 220 },

  // Intel Arc
  'arc-b580': { tdp: 190, length: 272 },
  'arc-b570': { tdp: 150, length: 250 },
  'arc-a770': { tdp: 225, length: 280 },
  'arc-a750': { tdp: 225, length: 270 },
  'arc-a580': { tdp: 185, length: 250 },
  'arc-a380': { tdp: 75, length: 200 },
};
