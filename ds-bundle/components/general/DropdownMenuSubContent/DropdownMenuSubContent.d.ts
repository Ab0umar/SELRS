import * as React from 'react';

/**
 * DropdownMenuSubContent — from selrs-ui@0.0.1.
 */
export interface DropdownMenuSubContentProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  /** Controls the direction the subcontent appears from its anchor menu item Default: start */
  align?: "end" | "start";
  asChild?: boolean;
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
  /** Whether keyboard navigation should loop around */
  loop?: boolean;
  sideOffset?: number;
  alignOffset?: number;
  arrowPadding?: number;
  avoidCollisions?: boolean;
  collisionBoundary?: Element | Element[];
  collisionPadding?: number | Partial<Record<"left" | "right" | "top" | "bottom", number>>;
  sticky?: "partial" | "always";
  hideWhenDetached?: boolean;
  updatePositionStrategy?: "always" | "optimized";
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const DropdownMenuSubContent: React.ComponentType<DropdownMenuSubContentProps>;
