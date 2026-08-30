import * as React from 'react';

/**
 * PullToRefresh — from selrs-ui@0.0.1.
 */
export interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  enabled?: boolean;
  className?: string;
}

export declare const PullToRefresh: React.ComponentType<PullToRefreshProps>;
