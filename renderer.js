const puppeteer = require("puppeteer");
class Renderer {
  constructor(browser) {
    this.browser = browser;
  }

  //function to render page
  async createPage(url, options = {}) {
    const { networkOptions, reqHeader } = options;
    const { timeout, waitUntil } = networkOptions;

    const page = await this.browser.newPage();
    page.setExtraHTTPHeaders(reqHeader);

    let requestFailed = undefined;
    const response = await page.goto(url, {
      timeout: Number(timeout) || 60 * 1000,
      waitUntil: waitUntil || "networkidle0"
    });

    if (response.status() >= 400) {
      requestFailed = {
        status: response.status()
      };
      const headers = response.headers();
      if (headers["content-type"] == "application/json") {
        const body = await response.json();
        requestFailed["response"] = JSON.parse(body);
      }
    }

    return { page, requestFailed };
  }

  //function to generate pdf
  async pdf(url, options = {}) {
    const { reqHeader, networkOptions, pdfOptions } = options;
    let page = undefined;
    let pdf = undefined;
    let requestFailed = undefined;

    try {
      const result = await this.createPage(url, { networkOptions, reqHeader });
      let page1 = result.page;
      const html = await page1.content();
      requestFailed = result.requestFailed;
      if (!requestFailed) {
        page = result.page;
        pdf = await page.pdf(pdfOptions);
      }
    } finally {
      if (page) {
        await page.close();
      }
    }

    return { pdf, requestFailed };
  }

  async close() {
    await this.browser.close();
  }
}

async function create() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  return new Renderer(browser);
}

module.exports = create;
