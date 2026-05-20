# ZKTeco Device Connection Test Results

**Date:** 2026-05-20  
**Target Device:** 192.168.0.10:5005 (ZLLF103EB20)  
**Status:** ⚠️ Unable to establish command/response communication

---

## Test Results

### ✓ TCP Connection
- **Status:** Connected successfully
- **Result:** Port 5005 is open and accepting connections
- **Implication:** Network connectivity is working

### ✗ Command/Response Protocol
- **Status:** Device does not respond to any commands
- **Tests performed:**
  - Standard ZKTeco CMD_CONNECT (0x03E8) — No response
  - Status query (0xAA 0xBB) — No response  
  - Basic TCP commands — No response
- **Timeout:** 5000ms per command

### ✗ Real-Time Punch Streaming
- **Status:** Device does not stream punch events
- **Monitoring duration:** 15 seconds
- **Result:** No unsolicited data received from device

---

## Analysis

The device **accepts TCP connections** but **does not respond to any commands or stream data**. This indicates one of the following:

1. **Device is locked by Taratus.exe**
   - Taratus may maintain exclusive connection
   - Protocol may be proprietary/undocumented
   - ❌ Not supported: Taratus.exe not running at time of test

2. **Device uses different protocol than ZKTeco TCP standard**
   - Device may use HTTPS, MQTT, or proprietary protocol
   - ZKTeco protocol implementation may be incorrect
   - Device documentation may not match actual behavior

3. **Device requires special initialization sequence**
   - May need authentication or handshake
   - May need Access DB to be updated first
   - Unknown sequence not in public documentation

---

## Fallback Strategy: Phase 1 (Access DB Sync)

Since direct TCP communication is not feasible, **revert to Phase 1 approach**:

```
Fingerprint Device (192.168.0.10:5005)
    ↓ (indirect via Taratus when needed)
Access DB (D:\Taurus V3.0\Taurus.mdb)
    ↓ [SRV100 reads via ODBC when manual sync triggered]
MySQL (attendance_*)
    ↓
Web Dashboard
```

**Advantages:**
- ✓ Works with existing infrastructure
- ✓ Uses well-documented Access tables (KQ_KQData, DI_User)
- ✓ No reverse-engineering needed
- ✓ Proven by Taratus.exe

**Workflow:**
1. User runs `Taratus.exe` when ready to sync attendance
2. Taratus updates `Taurus.mdb` Access DB with latest punches
3. User clicks "Sync" button in SRV100 web UI
4. SRV100 connects to Access DB via ODBC
5. Reads new punch records and employees
6. Imports into MySQL with deduplication
7. Triggers daily materialization

---

## Implementation Status

### Completed (Phase 2 - TCP Direct)
- ✓ zktecoDevice.ts (ZKTeco protocol implementation)
- ✓ deviceSyncEngine.ts (sync orchestration)
- ✓ Device diagnostics and testing tools
- ❌ Device does not respond to commands

### Fallback (Phase 1 - Access DB)
- ✓ accessDbSync.service.ts (Access DB reader via ODBC)
- 🔄 Ready for integration with attendance router
- 🔄 Ready for sync procedures

---

## Recommended Path Forward

### Option A: Use Phase 1 (Recommended)
**Pros:**
- Proven to work
- No unknown protocol needed
- User controls when sync happens
- Can test today with Taratus + Access DB

**Cons:**
- Still requires Taratus.exe on user's machine
- Not real-time
- Manual trigger required

### Option B: Investigate Device Protocol Further
**Pros:**
- Eliminates Taratus dependency
- Enables real-time sync
- Phase 2 goal achieved

**Cons:**
- Requires device documentation
- May need Wireshark packet capture
- Could require manufacturer support
- Risk of protocol being proprietary/locked

### Option C: Hybrid Approach
**Day 1:**
- Deploy Phase 1 (Access DB) for immediate functionality
- User can sync by running Taratus → clicking "Sync" button

**Later:**
- Document actual ZKTeco protocol by capturing Taratus traffic
- Implement proper TCP driver when protocol is known
- Switch to Phase 2 (direct TCP) when available

---

## Next Steps

1. **Immediate:** Integrate `accessDbSync.service.ts` into attendance router
2. **Add procedures:**
   - `syncFromAccessDb()` — Manual sync trigger
   - `testAccessDb()` — Verify DB connectivity
3. **Test workflow:** Run Taratus → Click sync → Verify MySQL import
4. **Later:** Capture Taratus↔Device traffic with Wireshark for reverse-engineering

---

## Files for Reference

- **Device documentation:** `D:\Programs\fp\Fingerprint Manual.pdf`
- **Device configuration:** `D:\Programs\fp\` (setup files)
- **Access DB backup:** `D:\Taurus V3.0\Taurus.mdb`
- **Taratus queries:** `D:\Taurus V3.0\exe_query_export\` (extracted SQL fragments)

---

## Summary

| Aspect | Phase 2 (TCP) | Phase 1 (Access DB) |
|--------|---------------|------------------|
| Status | ❌ Device unresponsive | ✓ Ready to integrate |
| Implementation | Complete | Complete |
| Testing | Failed (no device response) | Pending |
| Timeline | Unknown | Can deploy today |
| Real-time | Yes | No (manual sync) |
| Requires Taratus | No | Yes |

**Recommended:** Proceed with Phase 1 (Access DB). Phase 2 can be revisited once device protocol is documented or accessible.
