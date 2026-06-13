/**
 * Listen on port 4370 — check if the ZK device connects TO us
 * Run this, then in Att.exe click "Connect" or "Download"
 */

import net from "net";

const PORT = parseInt(process.argv[2] ?? "4370", 10);

const server = net.createServer((socket) => {
  console.log(`\n✓ INCOMING CONNECTION from ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on("data", (data) => {
    console.log(`  Received ${data.length} bytes: ${data.toString("hex")}`);
    console.log(`  ASCII: ${data.toString("ascii").replace(/[^\x20-\x7e]/g, ".")}`);
  });

  socket.on("end", () => console.log("  Connection closed"));
  socket.on("error", (e) => console.log(`  Error: ${e.message}`));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on port ${PORT} — now connect Att.exe or make a punch on the device...`);
});

server.on("error", (e) => console.error(`Server error: ${e.message}`));

// Also listen on other common ZKTeco ports
[5005, 7788].forEach((p) => {
  const s = net.createServer((sock) => {
    console.log(`\n✓ INCOMING on port ${p} from ${sock.remoteAddress}`);
    sock.on("data", (d) => console.log(`  ${d.toString("hex")}`));
  });
  s.listen(p, "0.0.0.0", () => console.log(`Also listening on port ${p}`));
  s.on("error", () => {}); // ignore if port in use
});
