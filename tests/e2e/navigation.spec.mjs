import {expect, test} from '@playwright/test';

test('Escape cancels a focused nickname editor before navigating back from the room.', async ({page}) => {
  await page.goto('/');
  await page.getByRole('tab', {name: 'Friends', exact: true}).click();
  await page.getByRole('button', {name: 'Edit nickname', exact: true}).first().click();
  const input = page.getByRole('textbox', {name: 'Room nickname', exact: true});
  await input.fill('An unsaved nickname');
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(page.getByText('Room nickname: Popcorn Queen', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Edit nickname', exact: true}).first().click();
  await input.fill('A saved nickname');
  await page.getByRole('button', {name: 'Save nickname', exact: true}).click();
  await expect(page.getByText('Room nickname: A saved nickname', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Enter room', exact: true}).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Friends & rooms', {exact: true})).toBeVisible();
});
