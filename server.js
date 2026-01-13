const { createServer } = require("https");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

let httpsOptions;
try {
  httpsOptions = {
    key: fs.readFileSync("./localhost+1-key.pem"),
    cert: fs.readFileSync("./localhost+1.pem"),
  };
} catch {
  try {
    httpsOptions = {
      key: fs.readFileSync("./localhost-key.pem"),
      cert: fs.readFileSync("./localhost.pem"),
    };
  } catch {
    console.error("❌ SSL certificates not found!");
    console.log("Run these commands first:");
    console.log("  mkcert -install");
    console.log("  mkcert localhost 127.0.0.1");
    process.exit(1);
  }
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, () => {
    console.log("");
    console.log("🔒 HTTPS Server running at https://localhost:3000");
    console.log("");
    console.log("✅ Microphone should now work!");
    console.log("");
  });
});
