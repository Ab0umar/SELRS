import * as React from 'react';

/**
 * AlertDialog — from selrs-ui@0.0.1.
 */
export interface AlertDialogProps {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
}

export declare const AlertDialog: React.ComponentType<AlertDialogProps>;
