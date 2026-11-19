import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { GlobalSettings, ToolId, ToolPet } from './types';
import { petDefaults } from './types';

type State = {
  isPetActive: boolean;
  pets: Record<string, ToolPet>;
  globalSettings: GlobalSettings;
  setPetActive: (active: boolean) => void;
  setSettings: (settings: Partial<GlobalSettings>) => void;
  addPet: (pet: ToolPet) => void;
  deletePet: (id: string) => void;
  updatePet: (id: string, update: Partial<ToolPet>) => void;
};

const buildDefaultPets = (): Record<string, ToolPet> => {
  const pets: Record<string, ToolPet> = {};
  for (const toolId of Object.keys(petDefaults) as ToolId[]) {
    const def = petDefaults[toolId];
    const id = `${toolId}-pet-${crypto.randomUUID()}`;
    pets[id] = {
      id,
      toolId,
      name: def.name,
      assignedTools: [toolId],
      scale: 1,
      position: { x: def.x, y: def.y },
      durationSeconds: toolId === 'focus' ? 1500 : undefined,
      enabled: true,
    };
  }
  return pets;
};

const defaultPets = buildDefaultPets();

export const usePetStore = create<State>()(
  devtools(
    persist(
      (set) => ({
        isPetActive: true,
        pets: defaultPets,
        globalSettings: { scale: 1, volume: 0.6, launchOnBoot: false },
        setPetActive: (isPetActive) => set({ isPetActive }, false, 'setPetActive'),
        setSettings: (settings) =>
          set((s) => ({ globalSettings: { ...s.globalSettings, ...settings } }), false, 'setSettings'),
        addPet: (pet) =>
          set((s) => ({
            pets: { ...s.pets, [pet.id]: pet },
          }),
          false,
          'addPet'),
        deletePet: (id) =>
          set((s) => {
            const pet = s.pets[id];
            if (!pet) return s;
            const pets = { ...s.pets };
            delete pets[id];
            return { pets };
          }, false, 'deletePet'),
        updatePet: (id, update) =>
          set(
            (s) => {
              if (!s.pets[id]) return s;
              return {
                pets: { ...s.pets, [id]: { ...s.pets[id], ...update } },
              };
            },
            false,
            'updatePet'
          ),
      }),
      {
        name: 'screen-pet-storage',
        partialize: (s) => ({
          pets: s.pets,
          globalSettings: s.globalSettings,
          isPetActive: s.isPetActive,
        }),
        version: 2,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            const oldPets = persistedState.pets as Record<ToolId, ToolPet> | undefined;
            if (oldPets) {
              const newPets: Record<string, ToolPet> = {};
              for (const [toolId, pet] of Object.entries(oldPets)) {
                const id = `${toolId}-pet-migrated`;
                newPets[id] = { ...pet, id, enabled: pet.enabled ?? true };
              }
              return {
                ...persistedState,
                pets: newPets,
              };
            }
          }
          if (persistedState?.pets) {
            return {
              ...persistedState,
              pets: Object.fromEntries(
                Object.entries(persistedState.pets).map(([id, pet]) => [
                  id,
                  { ...(pet as ToolPet), enabled: (pet as ToolPet).enabled ?? true },
                ])
              ),
            };
          }
          return persistedState;
        },
      }
    )
  )
);
