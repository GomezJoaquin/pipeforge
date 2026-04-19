const http = require("node:http");

const routes = {
  "/healthz": (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  },
  "/api/v1/ping": (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ service: "notifications-worker", message: "pong" }));
  },
};

const server = http.createServer((req, res) => {
  const handler = routes[req.url];
  if (handler) return handler(req, res);
  res.writeHead(404);
  res.end();
});

if (require.main === module) {
  server.listen(3000, () => console.log("notifications-worker listening on :3000"));
}

module.exports = { server, routes };
