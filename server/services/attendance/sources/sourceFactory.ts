/**
 * AttendanceSource Factory
 * Returns the configured adapter based on ATTENDANCE_SOURCE env var
 */

import { AttendanceSource } from './AttendanceSource';
import { AccessDbAdapter } from './accessDbAdapter';
import { TcpDeviceAdapter } from './tcpDeviceAdapter';

export function createAttendanceSource(env: Record<string, string | undefined> = process.env): AttendanceSource {
  const source = env.ATTENDANCE_SOURCE ?? 'access';

  switch (source) {
    case 'access':
      return new AccessDbAdapter({
        accessPath: env.ATTENDANCE_ACCESS_PATH ?? '',
        copyFirst: env.ATTENDANCE_ACCESS_COPY_FIRST === 'true',
        useOdbc: env.ATTENDANCE_ACCESS_USE_ODBC === 'true',
      });
    case 'tcp':
      return new TcpDeviceAdapter();
    default:
      throw new Error(`Unknown ATTENDANCE_SOURCE: ${source}`);
  }
}
