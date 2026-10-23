import {expect, test} from '@playwright/test';

test('The room preserves AI suggestions, feedback, and food navigation after the merge.', async ({page}) => {
  let requests = 0;
  let release;
  const responseReady = new Promise(resolve => { release = resolve; });
  await page.route('**/ai', async route => {
    requests += 1;
    await responseReady;
    await route.fulfill({json: {text: JSON.stringify([
      {title: 'The Incredibles', genre: 'Action', length: '1h 00m', why: 'The group shares an interest in adventure.'},
    ])}});
  });
  await page.goto('/');
  await page.getByRole('button', {name: 'Enter room', exact: true}).click();
  await page.getByRole('button', {name: 'I like this movie', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Eat Together', exact: true})).toBeVisible();
  expect(requests).toBe(0);

  await page.getByRole('button', {name: '✨  Get AI ideas', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Getting AI ideas…', exact: true})).toBeDisabled();
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(page.getByText('The Incredibles', {exact: true})).toBeVisible();
  await expect(page.getByText('Action · Adventure · Animation · Family · 1h 55m', {exact: true})).toBeVisible();

  await page.getByRole('button', {name: 'Switch profile, viewing as You', exact: true}).click();
  await page.getByRole('button', {name: '+ 30 min', exact: true}).click();
  await page.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(page.getByText('The Incredibles', {exact: true})).toHaveCount(0);
  await expect(page.getByRole('button', {name: '✨  Refresh AI ideas', exact: true})).toBeEnabled();
  expect(requests).toBe(1);
  await page.getByRole('button', {name: 'Eat Together', exact: true}).click();
  await expect(page.getByRole('button', {name: 'I host a food party', exact: true})).toBeVisible();
});
