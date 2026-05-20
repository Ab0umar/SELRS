# ZKTeco Device Connectivity Testing Guide

This guide covers testing the direct ZKTeco fingerprint device connection (192.168.0.10:5005).

## Overview

The attendance module now connects directly to the ZKTeco ZLLF103EB20 fingerprint device without requiring Taratus.exe. Three testing methods are available:

1. **CLI Test Script** — Fast local verification
2. **Web UI Diagnostic** — Full diagnostic suite via browser
3. **Web UI Connection Test** — Quick device info retrieval

---

## Method 1: CLI Test Script

**Fast local verification without starting the server**

```bash
# Default (192.168.0.10:5005)
npx tsx scripts/test-zkteco-device.ts

# Custom IP and port
npx tsx scripts/test-zkteco-device.ts 192.168.0.10 5005
```

**Output example:**
```
🔍 Testing ZKTeco Device Connection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: 192.168.0.10:5005

[1/4] Attempting TCP connection...
✓ TCP connection established

[2/4] Verifying device responds...
✓ Device verified and responding

[3/4] Fetching device information...
✓ Device Info:
  - Model: ZLLF103EB20
  - Serial: XXXXXXXXXXXXXX
  - Firmware: V2.32
  - Users: 30
  - Fingerprints: 20
  - Records: 22973

[4/4] Retrieving punch records...
✓ Retrieved 15 punch records from last 24 hours

Sample records:
  1. Emp: 100, Time: 2026-05-20T08:32:15.000Z, Dir: in
  2. Emp: 105, Time: 2026-05-20T08:45:22.000Z, Dir: out
  3. Emp: 110, Time: 2026-05-20T09:15:08.000Z, Dir: in
  ... and 12 more

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All tests passed! Device is working.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What it tests:**
- ✓ TCP connection to device IP:port
- ✓ Device responds to verification command
- ✓ Can retrieve device info (model, firmware, user count, etc.)
- ✓ Can fetch punch records

---

## Method 2: Web UI Diagnostic Procedure

**Full diagnostic suite including connection, response, and adapter status**

### Using tRPC Client (in browser console or test tool):

```javascript
// Requires admin authentication
await client.attendance.runDeviceDiagnostics.mutate({
  ip: '192.168.0.10',
  port: 5005,
});
```

### Using curl/Postman:
```bash
POST /trpc/attendance.runDeviceDiagnostics?batch=1
Content-Type: application/json

{
  "0": {
    "json": {
      "ip": "192.168.0.10",
      "port": 5005
    }
  }
}
```

**Returns:**
```json
{
  "success": true,
  "results": [
    {
      "test": "TCP Connection",
      "success": true,
      "message": "Successfully connected to 192.168.0.10:5005",
      "timestamp": "2026-05-20T16:30:00.000Z"
    },
    {
      "test": "Device Response",
      "success": true,
      "message": "Device responded with 42 bytes",
      "timestamp": "2026-05-20T16:30:01.000Z",
      "details": { "bytesReceived": 42 }
    },
    {
      "test": "Adapter Status",
      "success": true,
      "message": "Adapter currently connected",
      "timestamp": "2026-05-20T16:30:01.000Z",
      "details": { "connected": true }
    }
  ],
  "report": "=== Device Diagnostics Report ===\n[detailed text report]"
}
```

---

## Method 3: Web UI Connection Test

**Quick device info retrieval without full diagnostics**

### Using tRPC Client:
```javascript
// Requires admin authentication
await client.attendance.testZKTecoConnection.mutate({
  ip: '192.168.0.10',
  port: 5005,
});
```

### Using curl/Postman:
```bash
POST /trpc/attendance.testZKTecoConnection?batch=1
Content-Type: application/json

{
  "0": {
    "json": {
      "ip": "192.168.0.10",
      "port": 5005
    }
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "deviceInfo": {
    "model": "ZLLF103EB20",
    "serialNumber": "XXXXXXXXXXXXXX",
    "firmware": "V2.32",
    "userCount": 30,
    "fpCount": 20,
    "recordCount": 22973
  }
}
```

**Failure Response:**
```json
{
  "success": false,
  "error": "connect ECONNREFUSED 192.168.0.10:5005"
}
```

---

## Protocol Details

### ZKTeco TCP Command Structure
```
[CMD(2 bytes)]
[CRC16(2 bytes)]
[SessionID(4 bytes)]
[Reserved(4 bytes)]
[Data(variable)]
```

**Key Commands:**
- `0x03E8` (1000) — CMD_CONNECT (verify connection)
- `0x000B` (11) — CMD_GETDEVICEINFO (device info)
- `0x000D` (13) — CMD_GETDATA (retrieve punch records)
- `0x0015` (21) — CMD_GETUSERINFO (employee list)

### Response Format
Device returns response buffer with data in little-endian format:
- Device info: [serial(4)][model(32)][firmware(16)][users(4)][fps(4)][records(4)]
- Punch records: [count(4)][records...] where each record is [empNo(4)][timestamp(4)][status(1)][verifyMode(1)]

---

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"
- Device is offline or not responding
- IP address is incorrect (verify 192.168.0.10 is reachable)
- Port is incorrect (default is 5005)
- Network/firewall blocking TCP port 5005

### "Connection timeout"
- Device is slow to respond
- Network latency is high
- Try increasing timeout from default 5000ms

### "Device did not respond to verification"
- Device is connected but not responding to commands
- Device may be locked by Taratus.exe
- Stop Taratus.exe and try again

### "No punch records" or "Empty response"
- No punches recorded since specified time
- Employee codes don't match
- Device may need initialization

---

## Implementation Files

- **zktecoDevice.ts** — Low-level TCP protocol implementation
- **deviceSyncEngine.ts** — Sync orchestration and deduplication
- **deviceDiagnostics.service.ts** — Diagnostic utilities
- **scripts/test-zkteco-device.ts** — CLI test script
- **server/routers/attendance.ts** — Web procedures (testZKTecoConnection, runDeviceDiagnostics)

---

## Next Steps

1. **If test passes:**
   - Device is working correctly
   - Proceed to configure auto-sync in device settings
   - Test manual sync via `syncNow` procedure

2. **If test fails:**
   - Check device IP/port configuration
   - Verify device is powered on and connected to network
   - Check if Taratus.exe is running (may lock the device)
   - Review network connectivity and firewall rules

---

## Manual Sync Testing

After confirming device connectivity, test the sync:

```javascript
// Trigger manual sync via web
await client.attendance.deviceSyncNow.mutate({});

// Check sync status
await client.attendance.deviceSyncStatus.query();
```

**Success response:**
```json
{
  "status": "completed",
  "recordsImported": 45,
  "recordsSkipped": 12,
  "startedAt": "2026-05-20T16:30:00.000Z",
  "completedAt": "2026-05-20T16:30:15.000Z"
}
```
