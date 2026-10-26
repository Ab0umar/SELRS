# Attendance Device (ZKTeco / FK)

How the server talks to the fingerprint device. For how punches become daily records,
locking, clock offsets and troubleshooting, see `ATTENDANCE_SYNC.md`.

## Device

| Property | Value |
| --- | --- |
| Model | ZKTeco ZLLF103EB20 (EF10K family, FK protocol) |
| LAN address | `192.168.0.10`, TCP port `5005` (management/pull) |
| Capacity (from the legacy `DI_MacInfo` row) | 30 users, 20 fingerprints, 25 faces, 2 cards |
| Legacy software | Taratus (Taurus V3.0, Access `.mdb`), still the reference for table/view names (see `taratus-legacy-mapping.md`) |

The production default address lives in
`server/services/attendance/deviceSettings.service.ts`.

## Pull paths

| Path | Where | Status |
| --- | --- | --- |
| Native TCP client | `server/services/attendance/fkTcpClient.ts` | Default. Speaks the port-5005 protocol directly. Recovered by proxying `FKOldLogPuller.exe`; 27,710 of 27,710 records matched. Pulls logs and enrolled user ids (no names on the wire). |
| `FKOldLogPuller.exe` | `server/services/attendance/fkAttendLogPuller.ts` | Legacy fallback. Set `FK_USE_LEGACY_PULLER=true`. |
| Access DB (Taratus) | `server/services/attendance/accessDbSync.service.ts` | Phase 1 fallback via ODBC. Needs Taratus to have updated `Taurus.mdb`. |
| ADMS HTTP push (K40 Pro) | see `ATTENDANCE_SYNC.md`, "Choosing a source" | Used in production for the K40 Pro. |
| TCP 7005 push listener | `devicePushListener.ts`, `scripts/test-device-push.ts` | Exploratory only. Never wired into the server. |

## FK DLL chain (legacy puller)

Location: `C:\Windows\SysWOW64\` (32-bit DLLs on 64-bit Windows).

| DLL | Purpose |
| --- | --- |
| `FK623Attend.dll` | Main attendance library, used by `FKOldLogPuller.exe` |
| `FKViaDev.dll` | Device communication layer |
| `HSUNFK.dll` | Manufacturer library |
| `FKModelDic.ini` | Device model configuration |

Calls used by the puller: `FK_ConnectNet(machineNo, ip, port, timeout, protocol,
password, license)`, `FK_DisConnect`, `FK_EnableDevice`, `FK_GetLastError`,
`FK_LoadGeneralLogData(handle, readMark)`, `FK_GetGeneralLogData_1(...)`
(StdCall, Ansi, `0` = success).

Puller defaults: `machineNo 1`, `password 0`, `license 1261`, `timeout 5000`,
`protocol 0`, `readMark 0` (all records). The first full pull returned 25,184 records
from 2021-07-01. A punch record is `enrollNo`, `verifyMode` (0 password, 1 fingerprint,
2 card), `inOutMode` (0 out, 1 in) and a timestamp.

Direct P/Invoke from Node was judged not worth it: the DLL is 32-bit, and the native TCP
client removed the reason for it.

## Testing connectivity

```bash
npx tsx scripts/test-zkteco-device.ts 192.168.0.10 5005   # TCP + device info + recent punches
npx tsx scripts/test-fk-puller.ts                          # legacy puller wrapper
```

From the app (admin, attendance device permission):

- `attendance.testZKTecoConnection` — quick device info.
- `attendance.runDeviceDiagnostics` — TCP, response and adapter status report.
- `attendance.deviceSyncNow` / `attendance.deviceSyncStatus` — manual sync and its result.

Troubleshooting:

- `ECONNREFUSED` or timeout: device offline, wrong IP/port, or a firewall on TCP 5005.
- Device connects but does not answer commands: Taratus may be holding it. Stop
  `Taratus.exe` and retry. An early test on 2026-05-20 using the generic ZKTeco
  command set got no reply, which is why the FK protocol client was built instead.
- Empty result: no punches since the requested time, or employee codes do not match.

## Push protocol exploration (not used)

The device appears to support pushing punches to a listener on TCP 7005 (Taratus runs
one; `listen_device_push.ps1` captures packets to `push_packets.csv`). The packet format
and the way to enable pushing were never determined, so `devicePushListener.ts`
contains only guessed parsers and is imported only by `scripts/test-device-push.ts`.
Reviving it would need a Wireshark capture of Taratus talking to the device.
