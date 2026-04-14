/**
 * GetHayatCodingStandards Handler
 *
 * Returns Hayat Holding ABAP development standards from the bundled resource file.
 * This tool should be called before every development request to ensure compliance.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type AxiosResponse, return_response } from '../../../lib/utils';

export const TOOL_DEFINITION = {
  name: 'GetHayatCodingStandards',
  available_in: ['onprem', 'cloud', 'legacy'] as const,
  description:
    '[read-only] Hayat Holding ABAP geliştirme standartlarını döndürür. Her geliştirme talebi öncesinde çağrılmalıdır. Naming conventions, coding rules, exit/BAdI framework, utility classes ve agent davranış kurallarını içerir.',
  inputSchema: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        enum: [
          'all',
          'naming',
          'coding',
          'exit',
          'prompt',
          'examples',
          'behavior',
        ],
        description:
          'Which section to return. "all" returns the full document. "naming" = A1 naming patterns, "coding" = A2 coding rules + A3 header + A4 utilities, "exit" = A5 exit/BAdI framework, "prompt" = B questions to ask, "examples" = C real system examples, "behavior" = D agent behavior rules. Default: all',
      },
    },
    required: [],
  },
} as const;

interface GetHayatCodingStandardsArgs {
  section?:
    | 'all'
    | 'naming'
    | 'coding'
    | 'exit'
    | 'prompt'
    | 'examples'
    | 'behavior';
}

// Section markers in the markdown file
const SECTION_MAP: Record<string, { start: string; end?: string }> = {
  naming: { start: '### A1. İSİMLENDİRME PATTERN', end: '### A2.' },
  coding: { start: '### A2. KODLAMA KURALLARI', end: '### A5.' },
  exit: { start: '### A5. HAYAT EXIT/BADI FRAMEWORK', end: '## B.' },
  prompt: { start: '## B. HER GELİŞTİRMEDE', end: '## C.' },
  examples: { start: '## C. GERÇEK SİSTEM ÖRNEKLERİ', end: '## D.' },
  behavior: { start: '## D. AGENT DAVRANIŞ KURALLARI' },
};

function extractSection(content: string, section: string): string {
  const mapping = SECTION_MAP[section];
  if (!mapping) return content;

  const startIdx = content.indexOf(mapping.start);
  if (startIdx === -1) return `Section "${section}" not found in document.`;

  let endIdx: number;
  if (mapping.end) {
    endIdx = content.indexOf(mapping.end, startIdx);
    if (endIdx === -1) endIdx = content.length;
  } else {
    endIdx = content.length;
  }

  return content.substring(startIdx, endIdx).trim();
}

/**
 * Main handler for GetHayatCodingStandards MCP tool
 */
export async function handleGetHayatCodingStandards(
  _context: HandlerContext,
  args: GetHayatCodingStandardsArgs,
) {
  try {
    const section = args?.section ?? 'all';

    // Resolve path relative to compiled output: dist/handlers/system/readonly/ -> project root
    const resourcePath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'resources',
      'hayat-agent-memory.md',
    );

    if (!fs.existsSync(resourcePath)) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Resource file not found: ${resourcePath}`,
          },
        ],
      };
    }

    const fullContent = fs.readFileSync(resourcePath, 'utf-8');

    const result =
      section === 'all' ? fullContent : extractSection(fullContent, section);

    return return_response({
      data: result,
    } as AxiosResponse);
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error reading Hayat coding standards: ${error.message}`,
        },
      ],
    };
  }
}
