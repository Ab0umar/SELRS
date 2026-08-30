import * as React from 'react';

/**
 * Dialog — from selrs-ui@0.0.1.
 * @replaces dialog
 */
export interface DialogProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
}

export declare const Dialog: React.ComponentType<DialogProps>;
