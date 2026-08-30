import * as React from 'react';

/**
 * CommandInput — from selrs-ui@0.0.1.
 */
export interface CommandInputProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Optional controlled state for the value of the search input. */
  value?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const CommandInput: React.ComponentType<CommandInputProps>;
