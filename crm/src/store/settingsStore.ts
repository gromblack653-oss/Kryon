import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Протокол для click-to-call. MicroSIP реєструє sip:, деякі системи — tel:/callto:. */
export type DialProtocol = 'sip' | 'tel' | 'callto';

interface SettingsState {
  protocol: DialProtocol;
  agentName: string;
  setProtocol: (p: DialProtocol) => void;
  setAgentName: (n: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      protocol: 'sip', // MicroSIP за замовчуванням реєструє sip:
      agentName: '',
      setProtocol: (protocol) => set({ protocol }),
      setAgentName: (agentName) => set({ agentName }),
    }),
    { name: 'shopcore-crm-settings' },
  ),
);
