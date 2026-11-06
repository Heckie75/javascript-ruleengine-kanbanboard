const { expect, test } = require('@playwright/test');

test('renders the multi-tenant board and conserves shared work across tenant lanes', async ({ page }) => {
  await page.setViewportSize({ width: 3500, height: 1400 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Multi-tenant board' })).toBeVisible();
  await expect(page.locator('[data-kb-ticket-id="3101"]').first()).toBeVisible();
  await expect.poll(() => page.locator('[data-kb-ticket-id="3102"]').count()).toBeGreaterThan(1);

  const clientRows = page.locator('tr[view="Tenant C (ORG)"]');
  await page.getByRole('button', { name: 'Toggle Tenant C group' }).click();
  await expect(clientRows.first()).toBeHidden();
});

test('suppresses text selection while dragging a ticket', async ({ page }) => {
  await page.setViewportSize({ width: 3500, height: 1400 });
  await page.goto('/');

  const ticket = page.locator('[data-kb-ticket-id="3101"]').first();
  await expect(ticket).toBeVisible();
  const bounds = await ticket.boundingBox();

  await page.mouse.move(bounds.x + 12, bounds.y + 12);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 28, bounds.y + 12, { steps: 3 });

  await expect(page.locator('html')).toHaveClass(/kanban-pointer-dragging/);
  expect(await page.evaluate(() => getSelection().toString())).toBe('');

  await page.mouse.up();
  await expect(page.locator('html')).not.toHaveClass(/kanban-pointer-dragging/);
});
