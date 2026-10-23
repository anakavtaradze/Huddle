import {expect, test} from '@playwright/test';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';

const amazon = 'https://www.amazon.com/dp/B000123456';
async function hostParty(page) {
  await page.goto('/');
  await page.getByRole('tab', {name: 'Food', exact: true}).click();
  await page.getByLabel('Your name', {exact: true}).fill('Host');
  await page.getByRole('button', {name: 'I host a food party', exact: true}).click();
  await page.getByRole('button', {name: 'I edit the shared food list'}).click();
  await page.getByLabel('Food 1 name', {exact: true}).fill('Movie popcorn');
  await page.getByLabel('Food 1 Amazon link').fill(`${amazon}?tag=remove-me`);
  await page.getByLabel('Food 1 quantity per person').fill('2');
  await page.getByLabel('Food 1 options or dietary notes').fill('The group chooses the plain variety.');
  await page.getByRole('button', {name: 'I publish the food selection'}).click();
  await expect(page.getByText('2 × Movie popcorn', {exact: true})).toBeVisible();
  const qr = await page.getByRole('img', {name: 'Food party invitation QR code'}).getAttribute('src');
  const png = PNG.sync.read(Buffer.from(qr.split(',')[1], 'base64'));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toMatch(/^http:\/\/127.0.0.1:8798\/#food=/);
  return decoded.data;
}

test('A host and two phones share exact food, hand off Amazon checkout, recover sessions, and synchronize status.', async ({page, browser}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const invite = await hostParty(page);
  const contextA = await browser.newContext({viewport: {width: 390, height: 844}});
  const contextB = await browser.newContext({viewport: {width: 390, height: 844}});
  try {
    const a = await contextA.newPage(), b = await contextB.newPage();
    for (const [guest, name] of [[a, 'Mia'], [b, 'Sam']]) {
      await guest.goto(invite);
      await guest.getByLabel('Your name', {exact: true}).fill(name);
      await guest.getByRole('button', {name: 'I join the food party'}).click();
      await expect(guest.getByText('2 × Movie popcorn', {exact: true})).toBeVisible();
      await expect(guest.getByRole('button', {name: 'I edit the shared food list'})).toHaveCount(0);
    }
    await contextA.route('https://www.amazon.com/**', route => route.fulfill({status: 200, contentType: 'text/html', body: '<title>Amazon checkout boundary</title>'}));
    const popupPromise = a.waitForEvent('popup');
    await a.getByRole('button', {name: 'I open Movie popcorn on Amazon'}).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(amazon);
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    await popup.close();
    await expect(a.getByText('Mia chooses their food.', {exact: true})).toBeVisible();
    await a.getByRole('button', {name: 'I placed my Amazon order'}).click();
    await b.getByRole('button', {name: 'I cannot get this selection'}).click();
    await expect(page.getByText('Mia reports a completed order.', {exact: true})).toBeVisible({timeout: 10000});
    await expect(page.getByText('Sam reports an unavailable item.', {exact: true})).toBeVisible({timeout: 10000});
    await a.reload();
    await expect(a.getByText('Mia reports a completed order.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'I edit the shared food list'}).click();
    await page.getByLabel('Food 1 quantity per person').fill('1');
    await page.getByRole('button', {name: 'I publish the food selection'}).click();
    await expect(a.getByText('1 × Movie popcorn', {exact: true})).toBeVisible({timeout: 10000});
    await expect(a.getByText('Mia chooses their food.', {exact: true})).toBeVisible();
    await expect(b.getByText('Sam chooses their food.', {exact: true})).toBeVisible({timeout: 10000});
    for (const guest of [page, a, b]) await guest.getByRole('button', {name: 'I received my food'}).click();
    await expect(page.getByText('Huddle counts 3 of 3 participants with food ready.', {exact: true})).toBeVisible({timeout: 10000});
    await expect(a.getByText('Huddle counts 3 of 3 participants with food ready.', {exact: true})).toBeVisible({timeout: 10000});
    await page.screenshot({path: 'test-results/food-desktop.png', fullPage: true});
    await a.screenshot({path: 'test-results/food-phone.png', fullPage: true});
    await a.getByText('Eat Together', {exact: true}).scrollIntoViewIfNeeded();
    await a.screenshot({path: 'test-results/food-phone-invite.png', fullPage: true});
    expect(await a.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  } finally { await contextA.close(); await contextB.close(); }
});

test('The room opens the food flow and a host can restore and switch parties without leaking their identity.', async ({page}) => {
  const invite = await hostParty(page);
  await page.reload();
  await expect(page.getByRole('button', {name: 'I edit the shared food list'})).toBeVisible();
  await page.getByRole('button', {name: 'I edit the shared food list'}).click();
  await page.getByRole('button', {name: 'I add another food item'}).click();
  await page.getByLabel('Food 2 name', {exact: true}).fill('Cheese pizza');
  await page.getByLabel('Food 2 Amazon link').fill('https://www.amazon.com/grubhub');
  await page.getByRole('button', {name: 'I publish the food selection'}).click();
  await expect(page.getByText('Amazon opens its Grubhub storefront.', {exact: false})).toBeVisible();
  await page.getByRole('button', {name: 'I open another food party'}).click();
  await page.getByLabel('Your name', {exact: true}).fill('New host');
  await page.getByLabel('Party name').fill('Saturday snacks');
  await page.getByRole('button', {name: 'I host a food party'}).click();
  expect(page.url()).not.toBe(invite);
  await page.getByRole('tab', {name: 'Home', exact: true}).click();
  await page.getByRole('button', {name: 'Enter room', exact: true}).click();
  await page.getByRole('button', {name: 'Eat Together', exact: true}).click();
  await expect(page.getByText('Saturday snacks', {exact: true})).toBeVisible();
  await expect(page.getByText('New host chooses their food.', {exact: true})).toBeVisible();
});

test('The interface rejects unsafe links and reports service outages without reporting an order.', async ({page}) => {
  await hostParty(page);
  await page.getByRole('button', {name: 'I edit the shared food list'}).click();
  await page.getByLabel('Food 1 Amazon link').fill('https://amazon.com.evil.test/dp/B000123456');
  await page.getByRole('button', {name: 'I publish the food selection'}).click();
  await expect(page.getByRole('alert')).toContainText('Huddle accepts HTTPS links from Amazon.com only.');
  await page.getByRole('button', {name: 'I cancel my changes'}).click();
  await page.route('**/api/food/**', route => route.abort());
  await page.getByRole('button', {name: 'I placed my Amazon order'}).click();
  await expect(page.getByRole('alert').first()).toContainText('Huddle could not reach its food service.');
  await expect(page.getByText('Host chooses their food.', {exact: true})).toBeVisible();
  await page.unroute('**/api/food/**');
  await expect(page.getByRole('alert').filter({hasText: 'outdated'})).toHaveCount(0, {timeout: 10000});
});
