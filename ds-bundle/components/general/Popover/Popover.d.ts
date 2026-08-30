import * as React from 'react';

/**
 * Popover — from selrs-ui@0.0.1.
 */
export interface PopoverProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
}

export declare const Popover: React.ComponentType<PopoverProps>;
