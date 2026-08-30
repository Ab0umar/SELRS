import * as React from 'react';

/**
 * CommandGroup — from selrs-ui@0.0.1.
 */
export interface CommandGroupProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Optional heading to render for this group. */
  heading?: React.ReactNode;
  /** If no heading is provided, you must provide a value that is unique for this group. */
  value?: string;
  /** Whether this group is forcibly rendered regardless of filtering. */
  forceMount?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const CommandGroup: React.ComponentType<CommandGroupProps>;
