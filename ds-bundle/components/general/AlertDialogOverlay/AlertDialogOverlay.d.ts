import * as React from 'react';

/**
 * AlertDialogOverlay — from selrs-ui@0.0.1.
 */
export interface AlertDialogOverlayProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const AlertDialogOverlay: React.ComponentType<AlertDialogOverlayProps>;
