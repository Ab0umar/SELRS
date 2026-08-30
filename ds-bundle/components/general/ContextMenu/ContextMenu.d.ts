import * as React from 'react';

/**
 * ContextMenu — from selrs-ui@0.0.1.
 */
export interface ContextMenuProps {
  children?: React.ReactNode;
  open?: boolean;
  dir?: "ltr" | "rtl";
  modal?: boolean;
}

export declare const ContextMenu: React.ComponentType<ContextMenuProps>;
