export type ToolId = 'focus' | 'battery';

export type PetPosition = { x: number; y: number };

export type PetMetric = {
  label: string;
  value: string;
  status: 'safe' | 'warning' | 'critical' | 'neutral';
  color: string;
};

export type ToolPet = {
  id: string;
  toolId: ToolId;
  name: string;
  iconPath?: string;
  assignedTools: ToolId[];
  scale: number;
  position: PetPosition;
  durationSeconds?: number;
  enabled: boolean;
};

export type GlobalSettings = {
  scale: number;
  volume: number;
  launchOnBoot: boolean;
};

export const toolCatalog: {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  color: string;
}[] = [
  {
    id: 'focus',
    name: 'Timer',
    description: 'A focused Pomodoro countdown timer.',
    icon: '◷',
    color: 'amber',
  },
  {
    id: 'battery',
    name: 'Battery Fatigue',
    description: 'Shows battery level and health.',
    icon: '▰',
    color: 'orange',
  },
];

export const petDefaults: Record<
  ToolId,
  { name: string; x: number; y: number; metric: PetMetric }
> = {
  focus: {
    name: 'Timer',
    x: 660,
    y: 160,
    metric: { label: 'Focus', value: '25:00', status: 'neutral', color: 'bg-amber-500' },
  },
  battery: {
    name: 'Spark',
    x: 820,
    y: 120,
    metric: { label: 'Battery', value: '--%', status: 'neutral', color: 'bg-orange-500' },
  },
};
