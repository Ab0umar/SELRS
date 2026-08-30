import * as React from 'react';

/**
 * CommandSeparator — from selrs-ui@0.0.1.
 */
export interface CommandSeparatorProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Whether this separator should always be rendered. Useful if you disable automatic filtering. */
  alwaysRender?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const CommandSeparator: React.ComponentType<CommandSeparatorProps>;
