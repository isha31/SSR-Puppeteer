const express = require("express");
const app = express();
const createRenderer = require("./renderer");
const bodyParser = require("body-parser");

const port = process.env.PORT || 4000;
let renderer = null;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(async (req, res, next) => {
  let body = req.body || {};
  let url = body.url;
  if (!url) {
    res.setHeader("Content-Type", "application/json");
    return res.status(400).json({
      code: "0001",
      message:
        'URL is required. For example: {"url": "https://www.google.com/"}'
    });
  }

  try {
    let fileName = "report"; //Below logic is for pdf generation, Modify it later for supporting various types [pdf,screenshots]
    let pdfOptions = {
      //pdf formatting options
      format: "A4",
      printBackground: true,
      displayHeaderFooter :true
    };

    pdfOptions.scale = parseFloat(body["scale"]) || 0.8;
    pdfOptions.margin = body["margin"] || {
      top: "0.5cm",
      right: "0.5cm",
      bottom: "0.5cm",
      left: "0.5cm"
    };

    let networkOptions = {}; //network call options
    networkOptions.timeout = 60 * 1000;
    networkOptions.waitUntil = "networkidle0";

    let reqHeader = body.additional_headers || {}; //pass header in every request

    // Render PDF
    const result = await renderer.pdf(url, {
      reqHeader,
      networkOptions,
      pdfOptions
    });

    if (result.requestFailed) {
      res.setHeader("Content-Type", "application/json");
      const data = {
        code: result.requestFailed.status,
        message: result.requestFailed.response
      };
      res.status(422);
      res.json(data);
    } else {
      const pdf = result.pdf;
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.pdf`
      );
      res.setHeader("Content-Transfer-Encoding", "binary");
      res.type("application/pdf");
      res.end(pdf, "binary");
    }
  } catch (e) {
    next(e);
  }
});

// Error page.
app.use((err, req, res, next) => {
  res.status(422).json({ code: 422, message: err.message });
});

// Create renderer and start server.
createRenderer()
  .then(createdRenderer => {
    renderer = createdRenderer;
    console.info("Initialized renderer.");
    app.listen(port, () => {
      console.info(`Listen port on ${port}.`);
    });
  })
  .catch(e => {
  });
