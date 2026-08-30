import * as React from 'react';

/**
 * DropdownMenuRadioItem — from selrs-ui@0.0.1.
 */
export interface DropdownMenuRadioItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  disabled?: boolean;
  value: string;
  textValue?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const DropdownMenuRadioItem: React.ComponentType<DropdownMenuRadioItemProps>;
