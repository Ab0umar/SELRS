import * as React from 'react';

/**
 * CommandDialog — from selrs-ui@0.0.1.
 */
export interface CommandDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  filter?: (value: string, search: string, keywords?: string[]) => number;
}

export declare const CommandDialog: React.ComponentType<CommandDialogProps>;
