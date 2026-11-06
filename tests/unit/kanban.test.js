import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Kanban } from '../../js/kanban.js';

const boardHtml = readFileSync(resolve(process.cwd(), 'tests/fixtures/board-table.html'), 'utf8');

const rules = {
  todo: {
    match: (ticket) => ticket.status === 'todo',
    style: 'todo-style'
  },
  done: {
    match: (ticket) => ticket.status === 'done'
  },
  urgent: {
    match: (ticket) => ticket.priority === 'urgent'
  },
  normal: {
    match: (ticket) => ticket.priority === 'normal'
  }
};

describe('Kanban board', () => {
  let kanban;

  beforeEach(() => {
    document.body.innerHTML = '<div id="mount"></div>';
    kanban = new Kanban();
    kanban.init(boardHtml, rules);
  });

  it('routes tickets using inherited row and column rules and returns unmatched tickets', () => {
    const urgentTodo = { id: 'todo-1', status: 'todo', priority: 'urgent' };
    const normalDone = { id: 'done-1', status: 'done', priority: 'normal' };
    const normalBacklog = { id: 'backlog-1', status: 'blocked', priority: 'normal' };
    const unmatched = { id: 'unmatched-1', status: 'todo', priority: 'unknown' };

    const remaining = kanban.populate([urgentTodo, normalDone, normalBacklog, unmatched]);

    expect(Array.from(kanban.getTicketsFromCell(1, 2))).toEqual([urgentTodo]);
    expect(Array.from(kanban.getTicketsFromCell(2, 3))).toEqual([normalDone]);
    expect(Array.from(kanban.getTicketsFromCell(2, 1))).toEqual([normalBacklog]);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toBe(unmatched);
  });

  it('validates WIP limits over the configured inclusive area', () => {
    const tickets = [
      { id: 'todo-1', status: 'todo', priority: 'urgent' },
      { id: 'todo-2', status: 'todo', priority: 'normal' }
    ];

    kanban.populate(tickets, true);
    kanban.renderboard('#mount', {});

    const todoHeader = document.querySelectorAll('#board th')[2];
    expect(todoHeader.classList.contains('wip_high')).toBe(true);
    expect(todoHeader.textContent).toBe('2 / 1');
  });

  it('renders tickets with the selected template and rule styles', () => {
    kanban.setDefaultTemplate('ticket');
    kanban.init(boardHtml, rules);
    kanban.populate([{ id: 'todo-1', status: 'todo', priority: 'urgent' }]);

    kanban.renderboard('#mount', {
      ticket: (ticket, styles) => `<article class="${styles.join(' ')}">${ticket.id}</article>`
    });

    const rendered = document.querySelector('#mount article');
    expect(rendered.textContent).toBe('todo-1');
    expect(rendered.classList.contains('todo-style')).toBe(true);
  });

  it('clears assignments and rendered tickets on reset', () => {
    kanban.populate([{ id: 'todo-1', status: 'todo', priority: 'urgent' }]);
    kanban.renderboard('#mount', {});

    kanban.reset();

    expect(Array.from(kanban.getTicketsFromCell(1, 2))).toEqual([]);
    expect(document.querySelector('#mount td[data-kb-col]').textContent).toBe('');
  });
});