import * as React from 'react';

/**
 * ContextMenuCheckboxItem — from selrs-ui@0.0.1.
 */
export interface ContextMenuCheckboxItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  disabled?: boolean;
  checked?: boolean | "indeterminate";
  textValue?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const ContextMenuCheckboxItem: React.ComponentType<ContextMenuCheckboxItemProps>;
