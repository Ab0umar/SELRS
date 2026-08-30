import * as React from 'react';

/**
 * PopoverAnchor — from selrs-ui@0.0.1.
 */
export interface PopoverAnchorProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  virtualRef?: React$1.RefObject<Measurable>;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const PopoverAnchor: React.ComponentType<PopoverAnchorProps>;
