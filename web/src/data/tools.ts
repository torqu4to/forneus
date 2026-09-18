/**
 * The tool registry, mirroring `forneus_core/registry.py`.
 *
 * The landing page renders from this list, so announcing a new tool is one
 * entry here plus its translation keys — never a hardcoded card in a page.
 *
 * When the FastAPI backend lands, this is replaced by a build-time fetch of
 * `/api/tools`, which serves exactly these fields.
 */
import type { UIKey } from '../i18n/ui';

export type ToolStatus = 'available' | 'planned';

export interface Tool {
  /** URL slug; matches the Python ToolSpec name. */
  name: string;
  titleKey: UIKey;
  /** Short label for the top nav — never derived from titleKey. */
  navKey: UIKey;
  descriptionKey: UIKey;
  status: ToolStatus;
  beta?: boolean;
  /** Short mono chips shown next to an available tool. Not translated: they
   *  are proper nouns or format names. */
  tags?: string[];
}

export const tools: Tool[] = [
  {
    name: 'amigatos',
    titleKey: 'tool.amigatos.title',
    navKey: 'nav.tool.amigatos',
    descriptionKey: 'tool.amigatos.description',
    status: 'available',
    beta: true,
    tags: ['KNAPSACK EXATO', 'CSV / JSON', 'PERFIS'],
  },
  {
    name: 'fantasmas',
    titleKey: 'tool.fantasmas.title',
    navKey: 'nav.tool.fantasmas',
    descriptionKey: 'tool.fantasmas.description',
    status: 'planned',
  },
  {
    name: 'florais',
    titleKey: 'tool.florais.title',
    navKey: 'nav.tool.florais',
    descriptionKey: 'tool.florais.description',
    status: 'planned',
  },
];

export const availableTools = tools.filter((tool) => tool.status === 'available');
export const plannedTools = tools.filter((tool) => tool.status === 'planned');
