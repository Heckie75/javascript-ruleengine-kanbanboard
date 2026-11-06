const { expect, test } = require('@playwright/test');

test('renders Example 2 tickets and toggles board sections with native events', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Agile board' })).toBeVisible();
  await expect(page.locator('article.ticket-card[data-kb-ticket-id="2101"]')).toBeVisible();
  await expect(page.locator('article.ticket-card[data-kb-ticket-id="2123"]')).toBeVisible();

  const groupRows = page.locator('tr[view="Tenant C (ORG)"]');
  await page.getByRole('button', { name: 'Toggle Tenant C group' }).click();
  await expect(groupRows.first()).toBeHidden();
});

test('drag updates WIP counts and switches to the destination cell template', async ({ page }) => {
  await page.setViewportSize({ width: 3500, height: 1400 });
  await page.goto('/');

  const ticket = page.locator('article.ticket-card.ticket-small[data-kb-ticket-id="2113"]');
  const sourceCell = ticket.locator('xpath=..');
  const sourceRow = sourceCell.locator('xpath=..');
  const failedColumn = await page.locator('th[data-kb-rules="rule_progress_liveqa_failed"]').getAttribute('data-kb-col');
  const targetCell = sourceRow.locator(`td[data-kb-col="${failedColumn}"]`).first();
  const sourceWipCounter = page.locator('th[data-kb-row="4"][data-kb-col="23"]');
  const destinationWipCounter = page.locator('th[data-kb-row="4"][data-kb-col="24"]');
  await expect(sourceWipCounter).toHaveText('1 / -');
  await expect(destinationWipCounter).toHaveText('12 / 4');
  await expect(ticket).toHaveAttribute('data-template-name', 'small');
  await expect(ticket).toHaveClass(/ticket-small/);
  await expect(ticket).toHaveAttribute('data-kb-draggable', 'true');
  const sourceBounds = await ticket.boundingBox();
  const targetBounds = await targetCell.boundingBox();
  await page.mouse.move(sourceBounds.x + 10, sourceBounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(sourceBounds.x + 20, sourceBounds.y + 10, { steps: 3 });
  await page.mouse.move(targetBounds.x + targetBounds.width - 4, targetBounds.y + targetBounds.height / 2, { steps: 16 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => getSelection().toString())).toBe('');

  const movedTicket = page.locator('article.ticket-card[data-kb-ticket-id="2113"]');
  await expect(movedTicket).toBeVisible();
  await expect(movedTicket).toHaveClass(/ticket-full/);
  await expect(movedTicket).toHaveAttribute('data-progress', 'Live-QA failed');
  await expect(sourceWipCounter).toHaveText('0 / -');
  await expect(destinationWipCounter).toHaveText('13 / 4');
});