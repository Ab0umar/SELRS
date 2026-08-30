import * as React from 'react';

/**
 * CommandItem — from selrs-ui@0.0.1.
 */
export interface CommandItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Whether this item is currently disabled. */
  disabled?: boolean;
  /** A unique value for this item. If no value is provided, it will be inferred from `children` or the rendered `textContent` */
  value?: string;
  /** Optional keywords to match against when filtering. */
  keywords?: string[];
  /** Whether this item is forcibly rendered regardless of filtering. */
  forceMount?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const CommandItem: React.ComponentType<CommandItemProps>;
