import * as React from 'react';

/**
 * ManusDialog — from selrs-ui@0.0.1.
 */
export interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export declare const ManusDialog: React.ComponentType<ManusDialogProps>;
