# Problem: ZKTeco K40 Pro attendance device records punches 6 hours ahead

## System context

- **App:** SELRS — Node.js (Express + tRPC) backend, MySQL (Drizzle ORM), React frontend.
- **Server host:** Windows PC on the local network. Two NICs: Wi-Fi (internet, `SELRS - 5G`) and Ethernet (LAN where the device lives). Server binds `0.0.0.0:4000`.
- **Windows clock:** correct local time. Egypt currently observes **summer DST = UTC+3 (EEST)**. Node confirms: `getTimezoneOffset() = -180`, `GMT+0300`.
- **Cloudflare tunnel:** `https://selrs.cc` → forwards to `localhost:4000`. Confirmed working (`/iclock/cdata` returns options correctly).

## Two attendance devices

| Device | Protocol | Status |
|---|---|---|
| EF10K (id=1) | Direct TCP pull via `FKAttend.dll` (FKOldLogPuller.exe) | Works, timestamps correct (server-generated) |
| **K40 Pro (id=2)** | **ADMS HTTP push** (device → server) + optional TCP pull via `zkemkeeper.dll` COM | Punches arrive but **timestamped 6h in the future** |

## The ADMS protocol flow (pushver 2.4.1)

1. Device `GET /iclock/cdata?SN=...&options=all` → server returns options text block.
2. Device `GET /iclock/getrequest` → server returns queued commands (e.g. `C:1:DATA QUERY ATTLOG`).
3. Device `POST /iclock/cdata?table=ATTLOG` → uploads punch rows (tab-separated):
   `userId \t YYYY-MM-DD HH:MM:SS \t status \t verify \t ...`.
4. Device `POST /iclock/devicecmd` → command ACK (`ID=n&Return=0&CMD=DATA`).

Note: device is **command-driven** — it only uploads ATTLOG after the server queues
`DATA QUERY ATTLOG`. (Originally no punches arrived at all until we added that
command on handshake.)

## The symptom

Punches are stored 6 hours ahead of when they actually happened. Device screen
also shows time 6h ahead of real local time.

## The decisive measurement (ground truth)

A single fresh punch was made and logged raw:

```
serverNow  = Sun Jun 28 2026 01:43:43 GMT+0300 (Cairo, correct)
rawATTLOG  = "1\t2026-06-28 07:43:44\t0\t1\t0\t0\t0\t0\t0\t0\t\n"
```

- Real time: **01:43:43**
- Device-stamped time: **07:43:44**
- **Delta = exactly +6 hours**

Converting: real UTC at that moment = 22:43 (Jun 27). Device shows 07:43 (Jun 28)
= **UTC+9**. Correct local is UTC+3. So device runs UTC+9 → 6h ahead.

## Key user-provided observations (constraints for any hypothesis)

1. **"Without push it works fine"** — when the device is NOT connected to the ADMS
   server, its (manually-set) clock stays correct.
2. **"TCP isn't doing this, so ADMS is the cause"** — the TCP/COM path
   (`zkemkeeper.dll` `SetDeviceTime2`) sets the device clock correctly; only the
   ADMS HTTP push corrupts it.
3. The device has **no exposed timezone setting** in its physical menu.
4. Device web UI (`http://192.168.0.20`, old "WEB based technologies" firmware):
   `Date/Time` page has `Adjust Mode = Auto` ("synchronize with PC time
   automatically") vs `Manual`. Setting it to **Manual did not stop** the time
   from changing. There is a `TimeZone` page but it's for **access-control time
   windows**, not the clock offset.
5. Earlier attempts that all FAILED to hold the clock:
   - Sending a `DATE TIME` command via ADMS `/getrequest` → device replied
     `Return=-1002` (command rejected).
   - Sending `Date=` field in the options body → ignored.
   - `res.removeHeader("Date")` → ineffective (Express re-adds `Date` on `send()`).

## Conclusion reached

The device re-syncs its RTC from the **HTTP `Date` response header** of the ADMS
responses (standard `Date` header is UTC per HTTP spec). The device adds its
**internal UTC+9 timezone** → clock becomes UTC+9 = local+6h. This corrupts the
otherwise-correct clock the moment ADMS push connects, matching observations
#1 and #2.

## Current fix (two independent layers)

File: `server/_core/zktecoAdms.ts`

**Layer 1 — ingestion correction (authoritative data fix).** Every uploaded punch
has the device-ahead offset subtracted before storing:

- `effectiveOffsetHours()` = `ZK_ADMS_PUNCH_OFFSET_HOURS` (manual) ?? auto-detected
  ?? `deviceTz(9) − serverOffset(live)` = 6.
- Auto-detect: for a fresh real-time push (≤3 punches), `round(deviceTime − now)`
  snapped to a whole hour (validated: detected `6h`).
- Applied in `parseAttlogBody`: `punchAt = punchAt − offset`.

**Layer 2 — pre-compensated `Date` header (keeps device clock right).** Middleware
on `/iclock` sets:

- `header = realUTC + (serverOffset − DEVICE_TZ)` = `realUTC − 6` (Cairo summer).
- So when the device syncs and adds +9: `(realUTC−6)+9 = realUTC+3 = correct local`.
- `res.setHeader("Date", ...)` (sticks, unlike `removeHeader`).

Both read `serverOffset` live from the OS → **DST-safe** (auto-shifts to −5/5h in
winter when Egypt → UTC+2). `DEVICE_TZ` configurable via `ZK_ADMS_DEVICE_TZ_OFFSET`
(default 9).

**Untouched:** the TCP `SetDeviceTime2` path + its 2-min interval (confirmed correct).

## Open questions / things a reviewer should scrutinize

1. **Is the device really syncing from the HTTP `Date` header?** This is inferred,
   not proven by protocol docs. Some ZKTeco push firmwares sync time from a
   protocol field, not the HTTP header. The +6 could instead be the device's
   standalone TZ config that the ADMS *connection* (not specifically the Date
   header) triggers a re-read of.
2. **Inconsistency in earlier measurements:** with an experimental `Date` header
   shift of −4h, the device still showed +6 (would predict +2 if the device synced
   synchronously from our header). This suggests the device may only re-sync on
   reboot / periodically, not on every response — which would make Layer 2
   unreliable and make Layer 1 the only dependable fix.
3. **Is manipulating the HTTP `Date` header wise?** It's non-standard. It's scoped
   to `/iclock` only, but a reviewer may prefer suppressing the device's time-sync
   entirely or fixing the device TZ at source instead.
4. **Historical data:** punches stored before the fix remain wrong (mostly +6h,
   with a small window stored at +2h off due to an intermediate wrong default).
   Not yet corrected.
5. **`sourceRowId` stability:** it's derived from the corrected `punchAt`
   (`${sn}_${empCd}_${punchAt.getTime()}`). If the detected offset ever changes
   between batches, the same physical punch could get two different IDs →
   duplicate rows. Currently stable once detected, but worth noting.
6. **Multi-device:** offset detection is a single module-level variable, not keyed
   by SN. Fine for one K40 Pro; would break with multiple ADMS devices in
   different timezones.

## Relevant files

- `server/_core/zktecoAdms.ts` — ADMS endpoint, parsing, both fix layers.
- `server/_core/index.ts` — registers ADMS before body parsers; 2-min
  `SetDeviceTime2` interval.
- `server/services/attendance/zk4370LogPuller.ts` / `scripts/zk-pull.ps1` —
  TCP/COM path (`settime` uses `SetDeviceTime2`).
- `server/services/attendance/deviceSettings.service.ts` — two-row device settings.

## Relevant env vars

- `ZK_ADMS_DEVICE_TZ_OFFSET` (default `9`) — device's internal timezone offset in hours.
- `ZK_ADMS_PUNCH_OFFSET_HOURS` — manual override of the ingestion correction (hours
  the device is ahead; subtracted from each punch).
