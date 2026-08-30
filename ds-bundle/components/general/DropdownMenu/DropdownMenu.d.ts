import * as React from 'react';

/**
 * DropdownMenu — from selrs-ui@0.0.1.
 */
export interface DropdownMenuProps {
  children?: React.ReactNode;
  dir?: "ltr" | "rtl";
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
}

export declare const DropdownMenu: React.ComponentType<DropdownMenuProps>;
