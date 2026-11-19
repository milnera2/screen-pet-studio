import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PhysicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { setIgnoreCursorEvents } from './lib/tauri';
import { usePetStore } from './store';
import { toolCatalog, type ToolId, PetMetric } from './types';

type BatteryInfo = { level: number; charging: boolean };
type BatteryManagerLike = BatteryInfo & {
  addEventListener?: (name: string, callback: () => void) => void;
  removeEventListener?: (name: string, callback: () => void) => void;
};

const batteryColor = (level: number | null): string => {
  if (level === null) return 'bg-slate-400';
  if (level < 0.2) return 'bg-red-500';
  if (level < 0.5) return 'bg-amber-400';
  return 'bg-emerald-500';
};

type PetState = 'idle' | 'active';

const petMetric = (
  toolId: ToolId,
  state: PetState,
  battery: BatteryInfo | null,
  focusSeconds: number,
  durationSeconds: number
): PetMetric => {
  const base = (
    status: PetMetric['status'],
    color: string,
    value: string,
    label: string
  ) => ({ label, value, status, color });

  if (toolId === 'battery') {
    const level = battery ? Math.round(battery.level * 100) : null;
    const status: PetMetric['status'] =
      level === null ? 'neutral' : level < 0.2 ? 'critical' : level < 0.5 ? 'warning' : 'safe';
    const charging = battery?.charging ? ' \u26A1' : '';
    return base(status, batteryColor(level), `${level ?? '--'}%${charging}`, 'Battery');
  }

  if (toolId === 'focus') {
    const m = Math.floor(focusSeconds / 60);
    const s = focusSeconds % 60;
    if (focusSeconds > 0) {
      return base('neutral', 'bg-amber-500', `${m}:${s.toString().padStart(2, '0')}`, 'Timer');
    }
    const dm = Math.floor(durationSeconds / 60);
    const ds = durationSeconds % 60;
    return base('neutral', 'bg-slate-400', `${dm}:${ds.toString().padStart(2, '0')}`, 'Focus');
  }

  return base('neutral', 'bg-slate-400', '--', 'Status');
};

const PET_WINDOW_WIDTH = 220;
const PET_WINDOW_HEIGHT = 220;
const PET_SPRITE_SIZE = 96;

export function PetWindow({ toolId, petId }: { toolId: ToolId; petId: string }) {
  const pet = usePetStore((state) => state.pets[petId]);
  const active = usePetStore((state) => state.isPetActive && Boolean(pet?.enabled));
  const updatePet = usePetStore((state) => state.updatePet);
  const [state, setState] = useState<PetState>('idle');
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const durationSeconds = pet?.durationSeconds ?? 1500;
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const tool = toolCatalog.find((item) => item.id === toolId)!;
  const currentWindow = getCurrentWindow();

  useEffect(() => {
    document.documentElement.classList.add('pet-document');
    document.body.classList.add('pet-document');

    const syncWindow = async () => {
      if (!pet) return;
      const windowWidth = PET_WINDOW_WIDTH;
      const windowHeight = PET_WINDOW_HEIGHT;
      try {
        await currentWindow.setPosition(new PhysicalPosition(pet.position.x, pet.position.y));
      } catch (err) {
        console.warn('Pet window position failed:', err);
      }
      try {
        await currentWindow.setSize(new LogicalSize(windowWidth, windowHeight));
      } catch (err) {
        console.warn('Pet window size failed:', err);
      }
      try {
        if (active) {
          await currentWindow.show();
          await setIgnoreCursorEvents(false);
        } else {
          await setIgnoreCursorEvents(true);
          await currentWindow.hide();
        }
      } catch (err) {
        console.warn('Pet window show/hide failed:', err);
      }
    };
    void syncWindow();

    const moved = currentWindow.onMoved(({ payload }) =>
      updatePet(petId, { position: { x: payload.x, y: payload.y } })
    );

    const offPower = listen<boolean>('pet-power-changed', (event) =>
      usePetStore.getState().setPetActive(event.payload)
    );

    return () => {
      document.documentElement.classList.remove('pet-document');
      document.body.classList.remove('pet-document');
      void moved.then((off) => off());
      void offPower.then((off) => off());
    };
  }, [active, currentWindow, petId, toolId, updatePet, pet]);

  // Battery monitoring (Web Battery API)
  useEffect(() => {
    if (toolId !== 'battery') return;
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav?.getBattery) return;
    let manager: BatteryManagerLike | undefined;
    const read = () => {
      if (manager) setBattery({ level: manager.level, charging: manager.charging });
    };
    void nav.getBattery().then((m) => {
      manager = m;
      read();
      void m.addEventListener?.('levelchange', read);
      void m.addEventListener?.('chargingchange', read);
    });
    return () => {
      manager?.removeEventListener?.('levelchange', read);
      manager?.removeEventListener?.('chargingchange', read);
    };
  }, [toolId]);

  // Focus / Pomodoro countdown timer
  useEffect(() => {
    if (toolId !== 'focus' || !active) return;

    if (focusSeconds === 0) {
      const start = window.setTimeout(() => setFocusSeconds(durationSeconds), 1000);
      return () => window.clearTimeout(start);
    }

    const timer = window.setInterval(() => setFocusSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [active, toolId, focusSeconds]);

  if (!pet || !active) return null;

  const metric = petMetric(toolId, state, battery, focusSeconds, durationSeconds);

  const handlePetClick = () => {
    setState('active');
    window.setTimeout(() => setState('idle'), 2000);
  };
  const spriteSize = PET_SPRITE_SIZE;
  const imageSize = 80;

  return (
    <main className="relative flex h-full w-full items-center justify-center bg-transparent">
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: state === 'active' ? 0.92 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        role="button"
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pointerStart.current = { x: e.clientX, y: e.clientY };
          dragging.current = false;
        }}
        onPointerMove={(e) => {
          if (!pointerStart.current || dragging.current) return;
          const dx = e.clientX - pointerStart.current.x;
          const dy = e.clientY - pointerStart.current.y;
          if (Math.hypot(dx, dy) > 6) {
            dragging.current = true;
            void currentWindow.startDragging().catch(() => undefined);
          }
        }}
        onPointerUp={(e) => {
          if (e.button !== 0) return;
          if (!dragging.current) handlePetClick();
          pointerStart.current = null;
          dragging.current = false;
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handlePetClick();
        }}
        onMouseEnter={() => {
          if (active) void setIgnoreCursorEvents(false);
        }}
        onMouseLeave={() => {
          if (active) void setIgnoreCursorEvents(true);
        }}
        aria-label={`Interact with ${pet.name}`}
        style={{ width: spriteSize, height: spriteSize }}
        className="flex shrink-0 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(15,23,42,.18)] cursor-grab active:cursor-grabbing"
      >
        {pet.iconPath ? (
          <img src={convertFileSrc(pet.iconPath)} alt={pet.name} style={{ width: imageSize, height: imageSize }} className="rounded-full object-contain" />
        ) : (
          <span className={`flex items-center justify-center rounded-full ${metric.color} text-2xl text-white shadow-lg`} style={{ width: imageSize, height: imageSize }}>
            {tool.icon}
          </span>
        )}
      </motion.div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm whitespace-nowrap border border-slate-100">
        {metric.value || pet.name}
      </span>
    </main>
  );
}
