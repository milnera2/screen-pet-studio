import { useEffect, useState } from 'react';
import { Minus, Maximize2, X, Plus, Power, Trash2 } from 'lucide-react';
import { usePetStore } from './store';
import { toolCatalog, type ToolId, type ToolPet } from './types';
import { AddPetWizard } from './AddPetWizard';
import { broadcast, closePetWindow, createPetWindow, mainWindowAction, setPetWindowState } from './lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';
import { saveAsset } from './lib/tauri';
import { convertFileSrc } from '@tauri-apps/api/core';

const toolColor = (id: ToolId): string => {
  const tool = toolCatalog.find((t) => t.id === id);
  switch (tool?.color) {
    case 'emerald': return 'text-emerald-600 border-emerald-100';
    case 'blue': return 'text-blue-600 border-blue-100';
    case 'violet': return 'text-violet-600 border-violet-100';
    case 'amber': return 'text-amber-600 border-amber-100';
    case 'orange': return 'text-orange-600 border-orange-100';
    default: return 'text-slate-600 border-slate-100';
  }
};

const saveAssetUrl = (path: string) => convertFileSrc(path);

export function Dashboard() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const {
    isPetActive,
    setPetActive,
    pets,
    deletePet,
    updatePet,
  } = usePetStore();

  useEffect(() => {
    for (const pet of Object.values(pets)) {
      if (!pet.enabled || (pet.toolId !== 'focus' && pet.toolId !== 'battery')) continue;
      void createPetWindow(pet).catch((error) => console.warn('Pet window creation failed:', error));
    }
  }, [pets]);
  const togglePower = () => {
    const next = !isPetActive;
    setPetActive(next);
    for (const pet of Object.values(pets)) {
      void setPetWindowState(pet, next && pet.enabled)
        .catch((error) => console.warn('Pet power update failed:', error));
    }
    void broadcast('pet-power-changed', next);
  };

  const changeIcon = async (petId: string) => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Pet image', extensions: ['gif', 'png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (typeof selected === 'string') {
        const saved = await saveAsset(selected);
        if (petId) updatePet(petId, { iconPath: saved });
      }
    } catch {
      // Dialog unavailable in browser preview
    }
  };

  const togglePet = (pet: ToolPet) => {
    const enabled = !pet.enabled;
    updatePet(pet.id, { enabled });
    usePetStore.setState((state) => ({
      pets: {
        ...state.pets,
        [pet.id]: { ...state.pets[pet.id], enabled },
      },
    }));
    void setPetWindowState(pet, enabled && isPetActive)
      .catch((error) => console.warn('Pet visibility update failed:', error));
    void broadcast('pet-state-changed', { id: pet.id, enabled });
  };

  const removePet = (pet: { id: string; name: string }) => {
    if (!window.confirm(`Delete ${pet.name}? This cannot be undone.`)) return;
    deletePet(pet.id);
    void closePetWindow(pet.id).catch(() => undefined);
    void broadcast('pet-deleted', { id: pet.id });
  };

  return (
    <div className="dashboard-shell min-h-screen px-8 py-7 text-slate-900 md:px-12 md:py-9">
      <header className="mx-auto flex max-w-7xl items-start justify-between border-b border-slate-200 pb-8">
        <div data-tauri-drag-region className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[.3em] text-slate-500">
            Screen Pet Studio
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black">
            Your desktop, brought to life.
          </h1>
        </div>
        <div className="ml-6 flex items-center gap-2">
           <button
             type="button"
            onClick={() => setWizardOpen(true)}
            className="purple-button flex items-center gap-2"
          >
            <Plus size={17} /> Create Pet
          </button>
           <button
             type="button"
             onClick={() => void mainWindowAction('minimize').catch((error) => console.warn('Minimize failed:', error))}
            aria-label="Minimize"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <Minus size={17} />
          </button>
           <button
             type="button"
             onClick={() => void mainWindowAction('toggle-maximize').catch((error) => console.warn('Maximize failed:', error))}
            aria-label="Maximize"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <Maximize2 size={16} />
          </button>
           <button
             type="button"
             onClick={() => void mainWindowAction('hide').catch((error) => console.warn('Hide failed:', error))}
            aria-label="Close to tray"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-black">Your pets</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create companions and assign each one to a background tool.
            </p>
          </div>
           <button
             type="button"
            onClick={togglePower}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span className={`h-2 w-2 rounded-full ${isPetActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <Power size={15} />
            {isPetActive ? 'Pets active' : 'Pets sleeping'}
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.values(pets).map((pet) => {
            const tool = toolCatalog.find((item) => item.id === pet.toolId);
            if (!tool) return null;
            return (
              <article
                key={pet.id}
                className={`glass rounded-2xl p-5 transition hover:border-slate-300 hover:shadow-md ${toolColor(tool.id)}`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <button
                    type="button"
                    title="Change pet icon"
                    onClick={() => void changeIcon(pet.id)}
                    className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-3xl text-slate-800 hover:bg-slate-200"
                  >
                    {pet.iconPath ? (
                      <img src={saveAssetUrl(pet.iconPath)} alt={`${pet.name} icon`} className="h-full w-full object-contain" />
                    ) : (
                      tool.icon
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-semibold text-black">{pet.name}</h3>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${pet.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{tool.description}</p>
                  </div>
                </div>

                 <div className="mt-4 flex items-center gap-2">
                   <button
                     type="button"
                     onClick={() => togglePet(pet)}
                     className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-black"
                   >
                     {pet.enabled ? 'Disable pet' : 'Enable pet'}
                   </button>
                    <button
                      type="button"
                     onClick={() => removePet(pet)}
                     className="rounded-lg border border-red-100 p-2 text-red-500 transition hover:bg-red-50"
                     title="Delete pet"
                     aria-label={`Delete ${pet.name}`}
                   >
                     <Trash2 size={15} />
                   </button>
                 </div>
              </article>
            );
          })}
           <button
             type="button"
            onClick={() => setWizardOpen(true)}
            className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 text-sm font-semibold text-slate-500 transition hover:border-slate-500 hover:bg-slate-50"
          >
            <Plus size={20} className="mb-2" />
            Create another pet
          </button>
        </div>
      </main>

      {wizardOpen && <AddPetWizard onClose={() => setWizardOpen(false)} />}
    </div>
  );
}
