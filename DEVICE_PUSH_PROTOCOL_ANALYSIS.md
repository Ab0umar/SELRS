# ZKTeco Device Push Protocol Analysis

**Date:** 2026-05-20  
**Discovery:** Device uses PUSH model, not command/response  
**Status:** 🔍 Investigating push configuration

---

## Architecture Discovered

### Port 5005 (Management Port) — LOCKED
- Device accepts TCP connections
- Does NOT respond to command/response queries
- Likely used for proprietary device configuration (by Taratus.exe only)

### Port 7005 (Push Notification Port) — EXPECTED
- Device is DESIGNED to push punch events TO listening servers
- Evidence: `listen_device_push.ps1` script configured for port 7005
- Taratus.exe normally runs a listener on port 7005 to receive punches
- Status: **Listener ready, but device not currently pushing**

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  ZKTeco Fingerprint Device (192.168.0.10)              │
│  ├─ Port 5005 (TCP)  → Device management              │
│  └─ Port 7005 (TCP)  → Push punch events TO server    │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Device sends punch data
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Listener (Port 7005)                                   │
│  ├─ Node.js listener ready (devicePushListener.ts)     │
│  ├─ PowerShell equivalent (listen_device_push.ps1)     │
│  └─ Receives punch packets continuously                │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Parse punch data
                           ↓
┌─────────────────────────────────────────────────────────┐
│  MySQL attendance_punches                               │
│  ├─ Incremental import                                 │
│  ├─ Deduplication                                      │
│  └─ Daily materialization                              │
└─────────────────────────────────────────────────────────┘
```

---

## Current Status

### ✓ What We Know
- Device architecture uses push-based model
- Port 7005 is designated for punch push events
- Taratus.exe expects device to send data to listening port 7005
- PowerShell listener shows expected behavior

### ? What We Need to Discover
1. **Device Push Configuration:**
   - How does device know where to send push data?
   - Does it need IP/port configuration?
   - Is there a registration/subscription mechanism?

2. **Punch Packet Format:**
   - What binary format does device use?
   - Is it fixed-length (24 bytes)?
   - Is it JSON, CSV, or binary?
   - How are multiple punches framed?

3. **Activation/Trigger:**
   - Does device push automatically after connection?
   - Does device need a "start push" command?
   - Does device only push when there's activity?
   - Does it require periodic polls on port 5005?

---

## Possible Solutions

### Solution A: Check Device Configuration
1. Connect to device on port 5005
2. Look for device settings/info commands (not the ones we tried)
3. Find where device is configured to send push data
4. Verify IP/port where device should push
5. Enable push if it's disabled

### Solution B: Hybrid Protocol
1. Keep port 7005 listener active (eventEmitter based)
2. Attempt periodic queries on port 5005
3. Ask device for "punch since timestamp"
4. Accept pushes on 7005 when available
5. Fall back to queries if no push

### Solution C: Packet Capture
1. Run `listen_device_push.ps1` on Windows
2. Make a punch on device  
3. Capture packet format in CSV
4. Reverse-engineer packet structure
5. Update devicePushListener.ts parser

### Solution D: Taratus Integration
1. Let Taratus.exe listen on port 7005
2. Mirror its data to MySQL periodically
3. Use Phase 1 fallback (Access DB sync)
4. Keep this as interim until we understand protocol

---

## Files Ready for Implementation

### ✓ Complete
- `devicePushListener.ts` — Generic push listener with multiple parsing strategies
- `test-device-push.ts` — Test script showing punch detection capability
- `listen_device_push.ps1` — PowerShell equivalent (already exists in Taurus folder)

### 🔄 Blocked (Awaiting Device Behavior)
- Protocol parser (depends on actual packet format)
- Subscription/registration (depends on device capability)
- Auto-start logic (depends on device behavior)

---

## Next Steps (Priority Order)

### Step 1: Verify Device Push Configuration (Quick)
```bash
# On Windows, run existing PowerShell listener
powershell -File "D:\Taurus V3.0\listen_device_push.ps1"
```
- Open device UI or make a punch
- Check if data appears in `device_push_logs\push_packets.csv`
- If yes → packet format is discoverable
- If no → device needs configuration

### Step 2: Investigate Port 5005 Further (Medium)
- Check if there's a "subscribe to push" command
- Try different command structures
- Look for keepalive or heartbeat packets
- Capture with Wireshark while Taratus runs

### Step 3: Reverse-Engineer Taratus (Complex)
- Use Wireshark to capture Taratus ↔ Device traffic
- Document exact commands and responses
- Identify CRC/checksum algorithms
- Implement based on captured traces

### Step 4: Check Device Manual (If Available)
- Look in `D:\Programs\fp\` for device docs
- Search for "push protocol" or "real-time data"
- Check manufacturer website for SDK/docs
- Review any TCP protocol specifications

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Push Listener (Port 7005) | ✓ Ready | Node.js server ready |
| Punch Parser | 🔄 Pending | Need to see actual packet format |
| Device Config | ❓ Unknown | Device not pushing yet |
| Access DB Fallback | ✓ Ready | Phase 1 available |
| Manual Sync | ✓ Ready | Can query at any time |

---

## Conclusion

**The good news:** We found the correct architecture (port 7005 push model).  
**The blocker:** Device isn't currently sending push data.  
**The options:**
1. Enable device push (configuration needed)
2. Capture and reverse-engineer packets (need device to push)
3. Fall back to Access DB sync (works today)
4. Use hybrid approach (push + queries)

**Recommendation:**  
Deploy Phase 1 immediately (Access DB sync works), then investigate push configuration on the side. Once push packets are captured and format is known, Phase 2 can be completed quickly.
