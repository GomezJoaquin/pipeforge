const { describe, it } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const { server } = require("./index.js");

function request(path) {
  return new Promise((resolve, reject) => {
    const s = server.listen(0, () => {
      const port = s.address().port;
      http.get(`http://localhost:${port}${path}`, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          s.close();
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        });
      }).on("error", (e) => { s.close(); reject(e); });
    });
  });
}

describe("notifications-worker", () => {
  it("GET /healthz returns ok", async () => {
    const r = await request("/healthz");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, "ok");
  });

  it("GET /api/v1/ping returns pong", async () => {
    const r = await request("/api/v1/ping");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.service, "notifications-worker");
  });
});
