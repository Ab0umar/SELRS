import * as React from 'react';

/**
 * DialogOverlay — from selrs-ui@0.0.1.
 */
export interface DialogOverlayProps {
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const DialogOverlay: React.ComponentType<DialogOverlayProps>;
