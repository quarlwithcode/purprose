let puppeteerAvailable: boolean | null = null;

async function loadPuppeteer(): Promise<any> {
  // Dynamic import to avoid compile-time dependency
  return Function('return import("puppeteer")')();
}

export async function isPuppeteerAvailable(): Promise<boolean> {
  if (puppeteerAvailable !== null) return puppeteerAvailable;
  try {
    await loadPuppeteer();
    puppeteerAvailable = true;
  } catch {
    puppeteerAvailable = false;
  }
  return puppeteerAvailable;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.default.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
