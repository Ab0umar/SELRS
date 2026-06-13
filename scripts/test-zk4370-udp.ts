/**
 * Test ZK device via UDP (FR_Eng.dll uses UDP, not TCP)
 * Sends CMD_CONNECT (1000) and waits for response
 */

import dgram from "dgram";

const ip   = process.argv[2] ?? "192.168.1.170";
const port = parseInt(process.argv[3] ?? "4370", 10);

function calcChecksum(buf: Buffer): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum = (sum + buf[i]) & 0xffff;
  return sum;
}

function makeUdpPacket(cmd: number, sessionId = 0, replyId = 0, data = Buffer.alloc(0)): Buffer {
  const pkt = Buffer.alloc(8 + data.length);
  pkt.writeUInt16LE(cmd, 0);
  pkt.writeUInt16LE(0, 2);        // checksum placeholder
  pkt.writeUInt16LE(sessionId, 4);
  pkt.writeUInt16LE(replyId, 6);
  data.copy(pkt, 8);
  pkt.writeUInt16LE(calcChecksum(pkt), 2);
  return pkt;
}

async function main() {
  console.log(`\nTesting ZK device UDP at ${ip}:${port}\n`);

  const sock = dgram.createSocket("udp4");
  sock.bind();

  await new Promise<void>((res) => sock.on("listening", res));

  const cmds = [
    { name: "CMD_CONNECT (1000)",     pkt: makeUdpPacket(1000) },
    { name: "CMD_CONNECT alt (1001)", pkt: makeUdpPacket(1001) },
    { name: "CMD_PING (1500)",        pkt: makeUdpPacket(1500) },
  ];

  for (const { name, pkt } of cmds) {
    console.log(`Sending ${name}...`);
    console.log(`  bytes: ${pkt.toString("hex")}`);

    const response = await new Promise<Buffer | null>((res) => {
      const timer = setTimeout(() => res(null), 2000);
      sock.once("message", (msg) => { clearTimeout(timer); res(msg); });
      sock.send(pkt, port, ip);
    });

    if (response) {
      const cmd = response.readUInt16LE(0);
      console.log(`  ✓ Response (${response.length} bytes): ${response.toString("hex")}`);
      console.log(`  Response CMD: ${cmd}`);
      if (cmd === 2000) console.log(`  → CMD_ACK_OK — device speaks ZKTeco protocol!`);
    } else {
      console.log(`  ✗ No response`);
    }
    console.log();
  }

  sock.close();
}

main().catch(console.error);
