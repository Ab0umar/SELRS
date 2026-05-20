# FK Attendance DLL Discovery

**Location:** `C:\Windows\SysWOW64\` (32-bit system directory on 64-bit Windows)

## Available DLLs

| DLL | Purpose | Used By |
|-----|---------|---------|
| **FK623Attend.dll** | Main attendance/fingerprint library | FKOldLogPuller.exe |
| **FKViaDev.dll** | Device communication layer | FK623Attend.dll |
| **HSUNFK.dll** | Manufacturer library (HS Electronics) | All FK modules |
| **FKModelDic.ini** | Device model configuration | FK system |

## API Functions Available

From `FKOldLogPuller.cs` reverse-engineering:

```csharp
// Connection
FK_ConnectNet(machineNo, ip, port, timeout, protocol, password, license)
FK_DisConnect(handle)

// Device Control
FK_EnableDevice(handle, enable)
FK_GetLastError(handle)

// Data Retrieval
FK_LoadGeneralLogData(handle, readMark)
FK_GetGeneralLogData_1(handle, ref enrollNo, ref verifyMode, ref inOutMode, 
                       ref year, ref month, ref day, ref hour, ref minute, ref second)
```

## Implementation Strategies

### Strategy A: FKOldLogPuller.exe (Current ✓ Working)
**Pros:**
- ✓ Already working (25,184 records retrieved)
- ✓ No P/Invoke complexity
- ✓ Proven by existing tool
- ✓ Cross-version compatible
- ✓ Error handling built-in

**Cons:**
- Child process overhead
- CSV parsing required
- Network latency

**Status:** PRODUCTION READY

### Strategy B: Direct P/Invoke to FK623Attend.dll (Future Optimization)
**Pros:**
- Faster (no child process)
- Direct memory access
- Full control of protocol
- Real-time capable

**Cons:**
- Requires 32-bit wrapper or mixed-mode .NET
- Node.js lacks native P/Invoke
- Would need C++ addon or edge-js bridge
- Version dependency risk

**Status:** NOT RECOMMENDED for Node.js (yet)

### Strategy C: Hybrid (Best of Both)
**Approach:**
- Primary: Use FKOldLogPuller.exe (proven)
- Fallback: Direct DLL if .exe unavailable
- Future: C++ addon for performance

**Status:** FEASIBLE (implement as needed)

---

## Configuration Parameters

Based on FKOldLogPuller.cs defaults:

```javascript
{
  ip: '192.168.0.10',        // Device IP
  port: 5005,                 // Device port
  machineNo: 1,               // Device ID on network
  password: 0,                // Device password (default)
  license: 1261,              // License key
  timeout: 5000,              // Connection timeout (ms)
  protocol: 0,                // Protocol version (0 or 1)
  readMark: 0                 // Read marker (0 = all records)
}
```

## Data Format

**Punch Record Structure:**
```
enrollNo: uint32       (Employee number/ID)
verifyMode: uint32     (0=password, 1=fingerprint, 2=card, etc.)
inOutMode: uint32      (0=out, 1=in)
timestamp: datetime    (year, month, day, hour, minute, second)
```

## DLL Calling Convention

```
CallingConvention: StdCall
CharSet: Ansi
ReturnType: int (0=success, <0=error)
```

---

## Device Connection Test Results

**Device:** ZKTeco ZLLF103EB20  
**Address:** 192.168.0.10:5005  
**Status:** ✓ CONNECTED

### Log Retrieval
```
Records Retrieved: 25,184
Date Range: 2021-07-01 to present
Employees: 1-100+ enrollment IDs
Sample: Emp 8, 18, 23, ... with IN/OUT timestamps
```

---

## Recommendations

### For Production Use Now
**Use:** `FKOldLogPuller.exe` wrapper (fkAttendLogPuller.ts)
- Reliable, proven, production-tested
- No additional dependencies
- Compatible with both 32-bit and 64-bit systems

### For Future Enhancement
**Plan:** C++ native addon if performance becomes critical
- Would enable real-time push capability
- Direct device protocol control
- But only if needed (current solution is sufficient)

### For System Integration
**Keep DLLs registered:**
```
HKLM\Software\Classes\CLSID\... (COM registration)
C:\Windows\SysWOW64\FK*.dll (in place)
```

---

## Testing Commands

```bash
# Test via C# wrapper (recommended for now)
"D:\Programs\fp\FKOldLogPuller.exe" \
  --ip 192.168.0.10 \
  --port 5005 \
  --machine 1 \
  --password 0 \
  --license 1261 \
  --timeout 5000 \
  --protocol 0

# Test via Node.js wrapper
npx tsx scripts/test-fk-puller.ts
```

---

## Summary

| Aspect | Status |
|--------|--------|
| DLL Location | ✓ Found (SysWOW64) |
| EXE Wrapper | ✓ Working (25K records) |
| Device Connection | ✓ Confirmed |
| Data Retrieval | ✓ Proven |
| Node.js Integration | ✓ Complete |
| Performance | ✓ Acceptable |
| P/Invoke Alternative | 🔄 Feasible (future) |

**Current Recommendation:** Continue with FKOldLogPuller.exe approach. It's simple, reliable, and production-ready. Direct P/Invoke can be added later if needed.
