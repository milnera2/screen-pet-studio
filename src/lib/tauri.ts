import { emit } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const isTauriRuntime = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const broadcast = (event: string, payload: unknown) => {
  if (!isTauriRuntime()) return Promise.resolve();
  return emit(event, payload).catch(() => undefined);
};

export const setIgnoreCursorEvents = async (ignore: boolean) => {
  if (!isTauriRuntime()) return;
  try {
    const win = getCurrentWindow();
    await invoke('set_ignore_cursor_events', { window_label: win.label, ignore });
  } catch {
    // ignore
  }
};

export const saveAsset = (sourcePath: string) => {
  if (!isTauriRuntime()) return Promise.reject(new Error('Tauri runtime unavailable'));
  return invoke<string>('save_asset', { sourcePath });
};

export const createPetWindow = (pet: { id: string; toolId: string; position: { x: number; y: number } }) => {
  if (!isTauriRuntime()) return Promise.reject(new Error('Tauri runtime unavailable'));
  return invoke('create_pet_window', {
    petId: pet.id,
    toolId: pet.toolId,
    x: pet.position.x,
    y: pet.position.y,
  });
};

export const closePetWindow = (petId: string) => {
  if (!isTauriRuntime()) return Promise.resolve();
  return invoke('close_pet_window', { petId });
};

export const setPetWindowState = (pet: { id: string; toolId: string; position: { x: number; y: number } }, visible: boolean) => {
  if (!isTauriRuntime()) return Promise.resolve();
  return invoke('set_pet_window_state', {
    petId: pet.id,
    toolId: pet.toolId,
    x: pet.position.x,
    y: pet.position.y,
    visible,
  });
};

export const mainWindowAction = (action: 'minimize' | 'toggle-maximize' | 'hide') => {
  if (!isTauriRuntime()) return Promise.reject(new Error('Tauri runtime unavailable'));
  return invoke<void>('main_window_action', { action });
};

export type MonitorBounds = { left: number; top: number; width: number; height: number };

export const monitorBounds = async (): Promise<MonitorBounds | null> => {
  if (!isTauriRuntime()) return null;
  try {
    const win = getCurrentWindow();
    const [left, top, width, height] = await invoke<[number, number, number, number]>('monitor_bounds', {
      window_label: win.label,
    });
    return { left, top, width, height };
  } catch {
    return null;
  }
};
