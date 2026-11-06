import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Kanban } from '../../js/kanban.js';
import { rules } from '../../example_03/kanban/rules.js';

const root = process.cwd();
const boardMarkup = readFileSync(resolve(root, 'example_03/kanban/board.html'), 'utf8');
const tickets = JSON.parse(readFileSync(resolve(root, 'example_03/data/tickets.json'), 'utf8'));

function findPlacements(kanban, ticketId) {
  const placements = [];
  const board = kanban.getBoardElement();
  board.querySelectorAll('td[data-kb-col]').forEach((cell) => {
    const row = Number(cell.getAttribute('data-kb-row'));
    const col = Number(cell.getAttribute('data-kb-col'));
    if (Array.from(kanban.getTicketsFromCell(row, col)).some((ticket) => ticket.id === ticketId)) {
      placements.push({ row, col });
    }
  });
  return placements;
}

describe('Example 3 multi-tenant routing', () => {
  it('initializes the migrated table with its modular rules', () => {
    expect(() => new Kanban().init(boardMarkup, rules)).not.toThrow();
  });

  it('conserves a multi-solved-for ticket into multiple tenant cells', () => {
    const kanban = new Kanban();
    kanban.setDefaultTemplate('default');
    kanban.init(boardMarkup, rules);
    kanban.populate(tickets, true);

    expect(findPlacements(kanban, 3102).length).toBeGreaterThan(1);
  });
});
