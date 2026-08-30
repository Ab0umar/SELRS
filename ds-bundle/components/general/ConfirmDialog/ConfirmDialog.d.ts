import * as React from 'react';

/**
 * ConfirmDialog — from selrs-ui@0.0.1.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export declare const ConfirmDialog: React.ComponentType<ConfirmDialogProps>;
