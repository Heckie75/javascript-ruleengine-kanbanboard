import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Kanban } from '../../js/kanban.js';
import { rules } from '../../example_02/kanban/rules.js';

const root = process.cwd();
const tickets = JSON.parse(readFileSync(resolve(root, 'example_02/data/tickets.json'), 'utf8'));
const boardHtml = readFileSync(resolve(root, 'example_02/kanban/board.html'), 'utf8');
const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));

describe('Example 2 sample tickets', () => {
  it('initializes the complete board with the current data-kb attributes', () => {
    expect(() => new Kanban().init(boardHtml, rules)).not.toThrow();
  });

  it('routes ticket records into cells for Vue component rendering', () => {
    const kanban = new Kanban();
    kanban.setDefaultTemplate('default');
    kanban.init(boardHtml, rules);
    kanban.populate(tickets, true);

    const table = kanban.getBoardElement();
    const routedTicketIds = Array.from(table.querySelectorAll('td[data-kb-col]')).flatMap((cell) => {
      const row = Number(cell.getAttribute('data-kb-row'));
      const col = Number(cell.getAttribute('data-kb-col'));
      return Array.from(kanban.getTicketsFromCell(row, col), (ticket) => ticket.id);
    });
    expect(routedTicketIds).toContain(2101);
    expect(routedTicketIds).toContain(2123);
  });

  it('resolves inherited rules for the Analysis drop cell', () => {
    const kanban = new Kanban();
    kanban.init(boardHtml, rules);
    kanban.populate(tickets, true);
    expect(kanban.getRuleNamesFromCell(8, 5)).toContain('rule_progress_analysis');
  });

  it('uses unique numeric IDs and includes renderer-required ticket fields', () => {
    expect(ticketById.size).toBe(tickets.length);
    expect(tickets.every((ticket) => Number.isInteger(ticket.id) && ticket.summary && ticket.owner && ticket.reporter)).toBe(true);
  });

  it.each([
    ['rule_progress_fastlane', 2101],
    ['rule_class_support', 2103],
    ['rule_class_accelerated', 2102],
    ['rule_class_fixed_date', 2104],
    ['rule_class_feature', 2105],
    ['rule_class_trivial', 2118],
    ['rule_progress_analysis', 2106],
    ['rule_progress_clearing', 2107],
    ['rule_progress_impl', 2109],
    ['rule_progress_qa_ready', 2110],
    ['rule_progress_qa_failed', 2111],
    ['rule_progress_liveqa_backlog', 2113],
    ['rule_progress_liveqa_ready', 2114],
    ['rule_progress_liveqa_failed', 2115],
    ['rule_progress_liveqa_passed', 2123],
    ['rule_progress_closed', 2116],
    ['rule_progress_on_hold', 2117],
    ['rule_req_or_solve_tenant_d', 2119],
    ['rule_req_or_solve_tenant_b', 2120],
    ['rule_req_or_solve_tenant_a', 2121]
  ])('%s matches ticket %i', (ruleName, ticketId) => {
    expect(rules[ruleName].match(ticketById.get(ticketId))).toBe(true);
  });
});