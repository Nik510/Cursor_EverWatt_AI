export type ModuleStatusTag = 'stable' | 'beta' | 'labs';

export type ModuleDef = {
  /** Stable module id (used for env gating) */
  id: string;
  title: string;
  description: string;
  routeBase: string;
  enabledByDefault: boolean;
  /**
   * Optional env flag override; if omitted, computed as:
   * VITE_ENABLE_<MODULE_ID> where MODULE_ID is upper snake case.
   */
  flagKey?: string;
  statusTag?: ModuleStatusTag;
};

function toEnvKey(id: string): string {
  return `VITE_ENABLE_${String(id)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;
}

export function isModuleEnabled(def: ModuleDef, env: Record<string, any>, showLabs: boolean): boolean {
  const status = def.statusTag || 'stable';
  if (status === 'labs' && !showLabs) return false;

  const key = def.flagKey || toEnvKey(def.id);
  const raw = String((env as any)?.[key] ?? '').trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Default behavior when flag is not provided: enabledByDefault.
  return Boolean(def.enabledByDefault);
}

export const MODULES: ModuleDef[] = [
  {
    id: 'project_builder',
    title: 'Project Builder',
    description:
      'System of record for evidence + scope. Upload evidence into a Project Vault, review suggestions in Inbox, confirm into the Project Graph, and preserve an auditable Decision Ledger.',
    routeBase: '/project-builder',
    enabledByDefault: true,
    statusTag: 'beta',
  },
  {
    id: 'academy',
    title: 'Academy',
    description: 'Public training and enablement (no login).',
    routeBase: '/academy',
    enabledByDefault: true,
    statusTag: 'stable',
  },
  {
    id: 'ee_training',
    title: 'EE Training',
    description: 'Internal training paths and certification.',
    routeBase: '/ee-training',
    enabledByDefault: true,
    statusTag: 'beta',
  },
  {
    id: 'audit',
    title: 'Audit',
    description: 'Audit intake and forms.',
    routeBase: '/audit',
    enabledByDefault: true,
    statusTag: 'beta',
  },
  {
    id: 'monitoring',
    title: 'Monitoring',
    description: 'Monitoring dashboards and operational views.',
    routeBase: '/monitoring',
    enabledByDefault: true,
    statusTag: 'beta',
  },
  {
    id: 'calculator',
    title: 'Calculator',
    description: 'Run calculators and explore scenarios.',
    routeBase: '/calculator',
    enabledByDefault: true,
    statusTag: 'beta',
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Reporting generators and exports.',
    routeBase: '/reports',
    enabledByDefault: true,
    statusTag: 'beta',
  },
  {
    id: 'hvac_optimizer',
    title: 'HVAC Optimizer',
    description: 'HVAC optimization tools.',
    routeBase: '/hvac-optimizer',
    enabledByDefault: true,
    statusTag: 'beta',
  },
  {
    id: 'utilities',
    title: 'Utilities & Programs',
    description: 'Rates, programs, and OBF workflows.',
    routeBase: '/utilities',
    enabledByDefault: true,
    statusTag: 'beta',
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Admin dashboard.',
    routeBase: '/admin',
    enabledByDefault: false,
    statusTag: 'stable',
  },
];

