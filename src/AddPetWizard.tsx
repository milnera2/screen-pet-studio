import { useState } from 'react';
import { X, Upload, Check } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { usePetStore } from './store';
import { toolCatalog, type ToolId, petDefaults } from './types';
import { saveAsset } from './lib/tauri';

export function AddPetWizard({ onClose }: { onClose: () => void }) {
  const addPet = usePetStore((s) => s.addPet);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [toolId, setToolId] = useState<ToolId>('focus');
  const [idlePath, setIdlePath] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(25);

  const choose = async (accept: string[]) => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'File', extensions: accept }],
      });
      if (typeof selected === 'string') {
        const saved = await saveAsset(selected);
        return saved;
      }
    } catch {
      // Dialog unavailable in browser preview
    }
    return undefined;
  };

  const chooseIdle = async () => {
    const saved = await choose(['gif', 'png', 'jpg', 'jpeg', 'webp']);
    if (saved) setIdlePath(saved);
  };

  const defaultMetric = petDefaults[toolId];
  const save = () => {
    if (!name.trim()) return;
    const id = `${toolId}-pet-${crypto.randomUUID()}`;
    addPet({
      id,
      toolId,
      name: name.trim(),
      iconPath: idlePath || undefined,
      assignedTools: [toolId],
      scale: 1,
      durationSeconds: toolId === 'focus' ? durationMinutes * 60 : undefined,
      enabled: true,
      position: { x: defaultMetric.x, y: defaultMetric.y },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl border-none">
        <div className="mb-6 flex justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-purple-600">
              Step {step} of 3
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Add Tool Pet</h2>
          </div>
           <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close pet wizard">
            <X />
          </button>
        </div>
        <div className="mb-7 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition ${n <= step ? 'bg-purple-600' : 'bg-purple-100'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <label className="mb-2 block text-sm text-slate-600">Pet name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mochi"
              className="mt-2 w-full rounded-xl border border-purple-100 bg-white/70 px-4 py-3 text-slate-900 outline-none focus:border-purple-500"
            />
            <p className="mb-3 mt-5 text-sm text-slate-500">Assign this companion to a tool.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {toolCatalog.map((tool) => (
                 <button
                   type="button"
                  key={tool.id}
                  onClick={() => setToolId(tool.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-left transition ${toolId === tool.id ? 'border-purple-400 bg-purple-50' : 'border-purple-100 bg-white/40'}`}
                >
                  <span className="text-xl">{tool.icon}</span>
                  <span className="text-xs font-medium text-slate-800">{tool.name}</span>
                  {toolId === tool.id && <Check size={14} className="text-emerald-500" />}
                </button>
              ))}
            </div>
            {toolId === 'focus' && (
              <div className="mt-5">
                <label className="mb-2 block text-sm text-slate-600">Timer length</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 1 && v <= 180) setDurationMinutes(v);
                    }}
                    className="w-24 rounded-xl border border-purple-100 bg-white/70 px-3 py-2 text-slate-900 outline-none focus:border-purple-500"
                  />
                  <span className="text-sm text-slate-500">minutes</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">How long the countdown runs for this pet.</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-sm text-slate-500">Choose an optional idle image for this pet.</p>
             <button
               type="button"
              onClick={chooseIdle}
              className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-purple-300 bg-purple-50 text-purple-600 hover:bg-purple-100"
            >
              <Upload size={24} />
              {idlePath ? 'Image selected' : 'Choose image'}
              <small className="text-slate-500">A placeholder is used when no image is selected.</small>
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="rounded-2xl bg-purple-50 p-4 text-sm text-purple-800">
              This pet will appear independently on your desktop and can be dragged to its own location.
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
           <button
             type="button"
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-purple-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
             <button
               type="button"
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep(step + 1)}
              className="purple-button"
            >
              Continue
            </button>
          ) : (
             <button type="button" onClick={save} className="purple-button">
              Save pet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
