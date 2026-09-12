import { chromium } from 'playwright';
export { chromium };
export const browserOptions = {
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
};
