import * as React from 'react';

/**
 * NavigationMenu — from selrs-ui@0.0.1.
 */
export interface NavigationMenuProps {
  value?: string;
  defaultValue?: string;
  dir?: "ltr" | "rtl";
  orientation?: "horizontal" | "vertical";
  /** The duration from when the pointer enters the trigger until the tooltip gets opened. */
  delayDuration?: number;
  /** How much time a user has to enter another trigger without incurring a delay again. */
  skipDelayDuration?: number;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  viewport?: boolean;
}

export declare const NavigationMenu: React.ComponentType<NavigationMenuProps>;
