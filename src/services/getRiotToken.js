const puppeteer = require('puppeteer');

const hambuggerBtn = '#riotbar-explore';

const loginBtn =
  '#riotbar-navmenu-dropdown > div.riotbar-navmenu-category > a:nth-child(1)';

const accountForm =
  'body > div > div > div > div.grid.grid-direction__row.grid-page-web__content > div > div > div.grid.grid-align-center.grid-justify-space-between.grid-fill.grid-direction__column.grid-panel-web__content.grid-panel__content > div > div > div > div:nth-child(1) > div > input';
const passwordForm =
  'body > div > div > div > div.grid.grid-direction__row.grid-page-web__content > div > div > div.grid.grid-align-center.grid-justify-space-between.grid-fill.grid-direction__column.grid-panel-web__content.grid-panel__content > div > div > div > div.field.password-field.field--animate > div > input';

const submitBtn =
  'body > div > div > div > div.grid.grid-direction__row.grid-page-web__content > div > div > button';

module.exports = async ({ account, password }) => {
  const iPhone = puppeteer.devices['iPhone X'];
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.emulate(iPhone);
  await page.goto('https://na.leagueoflegends.com/ko-kr/');

  await page.waitForSelector(hambuggerBtn);
  await page.click(hambuggerBtn);

  await page.waitForSelector(loginBtn);
  await page.click(loginBtn);

  await Promise.all([
    page.waitForSelector(accountForm),
    page.waitForSelector(passwordForm),
    page.waitForSelector(submitBtn),
  ]);

  await page.type(accountForm, account);
  await page.type(passwordForm, password);
  await page.click(submitBtn);

  await page.waitForSelector('#riotbar-navbar > div.riotbar-explore-label > a');
  const cookies = await page.cookies();
  browser.close();
  return cookies;
};
