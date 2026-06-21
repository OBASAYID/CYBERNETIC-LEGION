#!/usr/bin/env node
/** Smoke-test comms upload + pshare routes (run on server or locally). */
import http from "http";
import fs from "fs";

const host = process.env.CYRUS_TEST_HOST || "127.0.0.1";
const port = Number(process.env.CYRUS_TEST_PORT || "3020");
const adminCode = process.env.ADMIN_ACCESS_CODE || "71580019";

function request(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: host, port, path, method, headers };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const tmpFile = "/tmp/cyrus-upload-test.txt";
fs.writeFileSync(tmpFile, "hello upload test");

const login = await request(
  "POST",
  "/api/login",
  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(JSON.stringify({ username: "admin", code: adminCode })) },
  JSON.stringify({ username: "admin", code: adminCode }),
);
console.log("login", login.status, login.body.slice(0, 200));
let token = null;
try {
  const parsed = JSON.parse(login.body);
  token = parsed.token || parsed.sessionToken;
} catch {
  /* ignore */
}

const authHeaders = {
  "X-User-Id": "admin",
  "X-Device-Id": "devtest",
};
if (token) {
  authHeaders["x-cyrus-session-token"] = token;
  authHeaders["Authorization"] = `Bearer ${token}`;
}

for (const path of [
  "/api/comms/sfu/status",
  "/api/comms/upload/capabilities",
  "/api/comms/calls/room_test/messages",
  "/api/comms/pshare/posts",
]) {
  const r = await request("GET", path, authHeaders);
  console.log("GET", path, "->", r.status, r.body.slice(0, 120));
}

const initBody = JSON.stringify({ fileName: "t.txt", fileSize: 17, mimeType: "text/plain" });
const init = await request(
  "POST",
  "/api/comms/upload/init",
  {
    ...authHeaders,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(initBody),
  },
  initBody,
);
console.log("POST /api/comms/upload/init ->", init.status, init.body.slice(0, 200));

const boundary = "----CyrusUploadTest";
const fileContent = fs.readFileSync(tmpFile);
const multipart = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="t.txt"\r\nContent-Type: text/plain\r\n\r\n`),
  fileContent,
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);
const direct = await request(
  "POST",
  "/api/comms/upload",
  {
    ...authHeaders,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": multipart.length,
  },
  multipart,
);
console.log("POST /api/comms/upload ->", direct.status, direct.body.slice(0, 200));
