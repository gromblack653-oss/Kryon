import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      protocol: 'sip',
      agentName: '',
      setProtocol: (protocol) => set({ protocol }),
      setAgentName: (agentName) => set({ agentName }),
    }),
    { name: 'shopcore-crm-settings' },
  ),
);
