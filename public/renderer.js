const puppeteer = require('puppeteer');

class Renderer{
  constructor(browser){
    this.browser = browser
  }

  async createPage(url, options = {}) {
    const { networkOptions, reqHeader } = options;
    const { timeout, waitUntil } = networkOptions;

    const page = await this.browser.newPage();
    //await page.emulateMedia("screen");
    page.setExtraHTTPHeaders(reqHeader);

    page.on("pageerror", function(err) {
      console.log("======= Page Error =======")
      let theTempValue = err.toString();
      console.log("Page error: " + theTempValue);
      console.log("stack: " + err.stack);
      console.log("code: " + err.code);
    })

    page.on("error", function (err) {
      console.log("======= Error =======")
      let theTempValue = err.toString();
      console.log("Error: " + theTempValue);
      console.log(err.code)
    })

    let requestFailed = undefined;
    const response = await page.goto(url, {
      timeout: Number(timeout) || 60 * 1000,
      waitUntil: waitUntil || "networkidle0"
    });

    if (response.status() >= 400) {
      console.log(
        "Request does not seem to be successful, received status: ",
        response.status()
      );
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
        console.log("PDF generated");
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