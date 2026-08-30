import * as React from 'react';

/**
 * Sheet — from selrs-ui@0.0.1.
 */
export interface SheetProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
}

export declare const Sheet: React.ComponentType<SheetProps>;
