const path = require('node:path');
const { readFileSync } = require('node:fs');
const { expect, test } = require('@playwright/test');
const boardHtml = readFileSync(path.resolve(__dirname, '../fixtures/drag-board.html'), 'utf8');

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/host.html');
  await page.addScriptTag({
    type: 'module',
    content: 'import { Kanban } from "/js/kanban.js"; window.Kanban = Kanban;'
  });
  await page.evaluate(({ boardHtml }) => {
    const rules = {
      normal: { match: (ticket) => ticket.priority === 'normal' },
      todo: {
        match: (ticket) => ticket.status === 'todo',
        transition: (ticket, transitions) => { transitions.push('todo'); return true; }
      },
      blocked: {
        match: (ticket) => ticket.status === 'todo',
        transition: (ticket, transitions) => { transitions.push('blocked'); return true; }
      }
    };
    const templates = {
      ticket: (ticket) => '<article data-kb-ticket-id="' + ticket.id + '">' + ticket.id + '</article>'
    };
    const kanban = new Kanban();
    kanban.setDefaultTemplate('ticket');
    kanban.setTicketSelector((ticketId, ticket) => ticket.id === ticketId);
    kanban.setDropAction((ticket, transitions) => !transitions.includes('blocked'));
    kanban.init(boardHtml, rules);
    kanban.populate([{ id: 'ticket-1', status: 'todo', priority: 'normal' }]);
    kanban.renderboard('#mount', templates);
  }, { boardHtml });
});

test('allows a drag to a destination accepted by its transition rules', async ({ page }) => {
  const source = page.locator('#mount td[data-kb-col]').nth(0).locator('[data-kb-ticket-id]');
  const target = page.locator('#mount td[data-kb-col]').nth(1);

  await source.dragTo(target);

  await expect(target.locator('[data-kb-ticket-id="ticket-1"]')).toHaveCount(1);
});

test('keeps the ticket in its source cell when the drop action rejects the destination', async ({ page }) => {
  const sourceCell = page.locator('#mount td[data-kb-col]').nth(0);
  const ticket = sourceCell.locator('[data-kb-ticket-id="ticket-1"]');
  const blockedCell = page.locator('#mount td[data-kb-col]').nth(2);

  await ticket.dragTo(blockedCell);

  await expect(sourceCell.locator('[data-kb-ticket-id="ticket-1"]')).toHaveCount(1);
  await expect(blockedCell.locator('[data-kb-ticket-id="ticket-1"]')).toHaveCount(0);
});