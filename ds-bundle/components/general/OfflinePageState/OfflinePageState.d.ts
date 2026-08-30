import * as React from 'react';

/**
 * OfflinePageState — from selrs-ui@0.0.1.
 */
export interface OfflinePageStateProps {
  title: string;
  body: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export declare const OfflinePageState: React.ComponentType<OfflinePageStateProps>;
