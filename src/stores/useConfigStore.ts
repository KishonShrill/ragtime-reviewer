import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
    backendUrl: string;
    setBackendUrl: (url: string) => void;
}

export const useConfigStore = create<ConfigState>()(
    persist(
        (set) => ({
            // Default value if nothing is in localStorage yet
            backendUrl: "http://0.0.0.0:8000",
            setBackendUrl: (url) => set({ backendUrl: url }),
        }),
        {
            name: 'quiz-server-config', // The key it will use in localStorage
        }
    )
);
