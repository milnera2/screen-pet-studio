import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauriRuntime } from './lib/tauri';
import { Dashboard } from './Dashboard';
import { PetWindow } from './PetWindow';
import { usePetStore } from './store';
import type { ToolId } from './types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { broadcast } from './lib/tauri';

const toolIds: ToolId[] = ['focus', 'battery'];

const detectPetWindow = (): { toolId: ToolId; petId: string } | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get('pet');
    const petId = params.get('id');
    if (queryValue && petId && toolIds.includes(queryValue as ToolId)) {
      return { toolId: queryValue as ToolId, petId };
    }
    const label = getCurrentWindow().label;
    const labelValue = label.replace(/^pet-/, '') as ToolId;
    return label.startsWith('pet-') && toolIds.includes(labelValue)
      ? { toolId: labelValue, petId: label }
      : null;
  } catch {
    return null;
  }
};

export function App() {
  const [petWindow] = useState(detectPetWindow);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const offPower = listen<boolean>('pet-power-changed', (e) =>
      usePetStore.setState({ isPetActive: e.payload })
    );
    const offTray = listen('tray-power-toggle', () => {
      const next = !usePetStore.getState().isPetActive;
      usePetStore.getState().setPetActive(next);
      void broadcast('pet-power-changed', next);
    });
    const offPet = listen<{ id: string; enabled: boolean }>('pet-state-changed', (e) =>
      usePetStore.getState().updatePet(e.payload.id, { enabled: e.payload.enabled })
    );
    const offDeletedPet = listen<{ id: string }>('pet-deleted', (e) =>
      usePetStore.getState().deletePet(e.payload.id)
    );
    return () => {
      void offPower.then((fn) => fn());
      void offTray.then((fn) => fn());
      void offPet.then((fn) => fn());
      void offDeletedPet.then((fn) => fn());
    };
  }, []);

  return petWindow ? <PetWindow toolId={petWindow.toolId} petId={petWindow.petId} /> : <Dashboard />;
}
