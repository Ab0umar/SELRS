# Fingerprint Device Configuration Found

## Device Details (from D:\Programs\fp\Taurus.mdb → DI_MacInfo table)

| Property | Value |
|---|---|
| **Device IP** | 192.168.0.10 |
| **Device Port** | 5005 |
| **Connection Type** | LAN (TCP/IP) |
| **Device Type ID** | 4 |
| **Device Type Name** | (empty) |
| **Max Users** | 30 |
| **Max Fingerprints** | 20 |
| **Max Face Records** | 25 |
| **Max Cards** | 2 |
| **Total Access Logs** | 22,973 |

---

## Port 5005 Analysis

**Port 5005 is commonly used by:**
- ZKTeco biometric devices
- IDEMIA fingerprint readers
- Other TCP/IP based attendance devices

---

## Two Paths Forward

### Path 1: Use Access DB (Current - Phase 1)
```
Fingerprint Device (192.168.0.10:5005)
    ↓ [Taratus.exe reads via unknown protocol]
Access DB (D:\Taurus V3.0\Taurus.mdb)
    ↓ [SRV100 manual sync]
MySQL (attendance_*)
    ↓
Web Dashboard
```

**Pros:** Works now, minimal changes
**Cons:** Requires running Taratus.exe

---

### Path 2: Direct Device Connection (Phase 2 - New)
```
Fingerprint Device (192.168.0.10:5005)
    ↓ [SRV100 connects via TCP protocol]
MySQL (attendance_*)
    ↓
Web Dashboard
```

**Pros:** No Taratus.exe needed, real-time sync possible
**Cons:** Need device protocol documentation

---

## To Implement Path 2, Need:

1. **Device Protocol Documentation**
   - Available in PDFs: 
     - D:\Programs\fp\Fingerprint Manual.pdf
     - D:\Programs\fp\Attendance Soft Manual.pdf
   - Check for API/TCP specifications

2. **Or Reverse-Engineer from Taratus.exe**
   - Use network sniffer (Wireshark) to capture Taratus ↔ Device communication
   - Extract protocol from captured packets
   - Implement in Node.js

3. **Or Search for Public SDK**
   - ZKTeco SDK (if device is ZKTeco)
   - Official device manufacturer documentation

---

## Recommendation

**For now:** Use Path 1 (Access DB intermediary)
- User runs Taratus.exe when needed
- SRV100 reads from Access (manual trigger)
- No blocking on protocol research

**Later:** Implement Path 2
- Get device protocol from manual PDFs
- Or use Wireshark to reverse-engineer
- Add direct device connection to SRV100

---

## Files Available

- Device manuals in: D:\Programs\fp\
- Database backup: D:\Taurus V3.0\Taurus.mdb
- Extracted Taratus.exe: D:\Taurus V3.0\exe_query_export\
