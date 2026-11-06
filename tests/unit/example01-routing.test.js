import { describe, expect, it } from 'vitest';
import tickets from '../../example_01/data/tickets.json';
import { board } from '../../example_01/src/board.js';
import { routeTickets } from '../../example_01/src/routing.js';
import { rules } from '../../example_01/src/rules.js';

describe('Vue Example 1 board routing', () => {
  it('routes each sample ticket to its status column and service row', () => {
    const { cells, unassigned } = routeTickets(tickets, board, rules);

    expect(cells.standard.done.map((ticket) => ticket.id)).toEqual(['#1']);
    expect(cells.standard.work.map((ticket) => ticket.id)).toEqual(['#3']);
    expect(cells.standard.todo.map((ticket) => ticket.id)).toEqual(['#9']);
    expect(cells.standard.backlog.map((ticket) => ticket.id)).toEqual(['#42']);
    expect(cells.blocker.backlog.map((ticket) => ticket.id)).toEqual(['#75']);
    expect(unassigned).toEqual([]);
  });
});