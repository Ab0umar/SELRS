/**
 * Device Diagnostics Service
 * Troubleshoots device connection issues
 */

import * as net from 'net';
import { getDefaultDevice } from './deviceAdapter.service';

export interface DiagnosticResult {
  test: string;
  success: boolean;
  message: string;
  timestamp: Date;
  details?: any;
}

export class DeviceDiagnosticsService {
  private results: DiagnosticResult[] = [];

  /**
   * Test TCP connection to device
   */
  async testTcpConnection(ip: string, port: number, timeoutMs: number = 5000): Promise<DiagnosticResult> {
    return new Promise((resolve) => {
      const socket = net.createConnection(
        { host: ip, port, timeout: timeoutMs },
        () => {
          socket.destroy();
          resolve({
            test: 'TCP Connection',
            success: true,
            message: `Successfully connected to ${ip}:${port}`,
            timestamp: new Date(),
          });
        }
      );

      socket.on('error', (err) => {
        resolve({
          test: 'TCP Connection',
          success: false,
          message: `Failed to connect: ${err.message}`,
          timestamp: new Date(),
          details: { code: (err as any).code, syscall: (err as any).syscall },
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          test: 'TCP Connection',
          success: false,
          message: `Connection timeout (${timeoutMs}ms exceeded)`,
          timestamp: new Date(),
        });
      });

      setTimeout(() => {
        if (socket.writable) {
          socket.destroy();
        }
      }, timeoutMs + 1000);
    });
  }

  /**
   * Test if device responds to status query
   */
  async testDeviceResponse(ip: string, port: number): Promise<DiagnosticResult> {
    return new Promise((resolve) => {
      const socket = net.createConnection(
        { host: ip, port, timeout: 5000 },
        () => {
          // Send status query command
          const statusCmd = Buffer.from([0xaa, 0xbb, 0x00, 0x00, 0x00, 0x00]);
          socket.write(statusCmd);

          let received = false;
          const timeout = setTimeout(() => {
            socket.destroy();
            if (!received) {
              resolve({
                test: 'Device Response',
                success: false,
                message: 'No response to status query (device may not be ready)',
                timestamp: new Date(),
              });
            }
          }, 3000);

          socket.on('data', (data) => {
            received = true;
            clearTimeout(timeout);
            socket.destroy();
            resolve({
              test: 'Device Response',
              success: true,
              message: `Device responded with ${data.length} bytes`,
              timestamp: new Date(),
              details: { bytesReceived: data.length },
            });
          });

          socket.on('error', (err) => {
            clearTimeout(timeout);
            resolve({
              test: 'Device Response',
              success: false,
              message: `Connection error: ${err.message}`,
              timestamp: new Date(),
            });
          });
        }
      );

      socket.on('error', (err) => {
        resolve({
          test: 'Device Response',
          success: false,
          message: `Failed to establish connection: ${err.message}`,
          timestamp: new Date(),
        });
      });
    });
  }

  /**
   * Run full diagnostic suite
   */
  async runFullDiagnostics(ip: string, port: number): Promise<DiagnosticResult[]> {
    this.results = [];

    console.log('[Diagnostics] Starting device diagnostics...');

    // Test 1: Basic connectivity
    const connectTest = await this.testTcpConnection(ip, port);
    this.results.push(connectTest);

    if (connectTest.success) {
      // Test 2: Device response
      const responseTest = await this.testDeviceResponse(ip, port);
      this.results.push(responseTest);
    } else {
      // Add informational result about connection failure
      this.results.push({
        test: 'Device Response',
        success: false,
        message: 'Skipped (TCP connection failed)',
        timestamp: new Date(),
      });
    }

    // Test 3: Check current adapter status
    const device = getDefaultDevice();
    const status = device.getStatus();
    this.results.push({
      test: 'Adapter Status',
      success: status.connected,
      message: status.connected
        ? 'Adapter currently connected'
        : status.connectionError || 'Adapter disconnected',
      timestamp: new Date(),
      details: status,
    });

    return this.results;
  }

  /**
   * Get previous diagnostic results
   */
  getResults(): DiagnosticResult[] {
    return this.results;
  }

  /**
   * Generate diagnostic report
   */
  generateReport(): string {
    const lines: string[] = [
      '=== Device Diagnostics Report ===',
      `Generated: ${new Date().toLocaleString()}`,
      '',
    ];

    if (this.results.length === 0) {
      lines.push('No diagnostics run yet.');
      return lines.join('\n');
    }

    for (const result of this.results) {
      const status = result.success ? '✓ PASS' : '✗ FAIL';
      lines.push(`${status} | ${result.test}`);
      lines.push(`       ${result.message}`);
      if (result.details) {
        lines.push(`       Details: ${JSON.stringify(result.details)}`);
      }
      lines.push('');
    }

    const allPass = this.results.every((r) => r.success);
    lines.push('');
    lines.push(allPass ? '✓ All tests passed' : '✗ Some tests failed');

    return lines.join('\n');
  }
}

let diagnosticsInstance: DeviceDiagnosticsService | null = null;

export function getDeviceDiagnostics(): DeviceDiagnosticsService {
  if (!diagnosticsInstance) {
    diagnosticsInstance = new DeviceDiagnosticsService();
  }
  return diagnosticsInstance;
}
