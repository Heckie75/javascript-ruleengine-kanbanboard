const { expect, test } = require('@playwright/test');

test('renders the Vue board and routes the fixture tickets', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Work, in motion' })).toBeVisible();
  await expect(page.locator('[data-row="blocker"][data-column="backlog"] [data-ticket-id="#75"]')).toBeVisible();
  await expect(page.locator('[data-row="standard"][data-column="done"] [data-ticket-id="#1"]')).toBeVisible();
  await expect(page.getByText('5 tickets')).toBeVisible();
});