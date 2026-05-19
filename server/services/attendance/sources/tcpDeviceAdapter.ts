/**
 * TCP Device Adapter — Placeholder for Phase 3
 * Connects directly to fingerprint device via TCP/IP socket
 */

import { AttendanceSource } from './AttendanceSource';

export class TcpDeviceAdapter implements AttendanceSource {
  readonly name = 'tcp' as const;

  constructor() {
    throw new Error('TCP device adapter not implemented in Phase 1. Deferred to Phase 3.');
  }

  async isReachable(): Promise<boolean> {
    throw new Error('TCP device adapter not implemented in Phase 1');
  }

  async *fetchPunchesSince() {
    throw new Error('TCP device adapter not implemented in Phase 1');
  }

  async *fetchEmployees() {
    throw new Error('TCP device adapter not implemented in Phase 1');
  }

  async close(): Promise<void> {
    throw new Error('TCP device adapter not implemented in Phase 1');
  }
}
