import * as React from 'react';

/**
 * HoverCard — from selrs-ui@0.0.1.
 */
export interface HoverCardProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  openDelay?: number;
  closeDelay?: number;
}

export declare const HoverCard: React.ComponentType<HoverCardProps>;
