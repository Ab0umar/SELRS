import * as React from 'react';

/**
 * AppShellStatus — from selrs-ui@0.0.1.
 */
export interface AppShellStatusProps {
  booting: boolean;
  online: boolean;
  serverReachable: boolean;
  buildInfo: BuildInfo;
  updateAvailable: BuildInfo;
  apiIssue: ApiIssue;
  offlineCacheCount: number;
  offlineCacheTimeLabel: string;
  runtimeIssue: RuntimeIssue;
  onRetry: () => void;
  onReload: () => void;
  onRetrySync: () => void;
  onDismissRuntimeIssue: () => void;
  onCopyRuntimeIssue: () => void;
}

export declare const AppShellStatus: React.ComponentType<AppShellStatusProps>;
