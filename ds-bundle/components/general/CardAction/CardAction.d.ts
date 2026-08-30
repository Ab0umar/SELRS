import * as React from 'react';

/**
 * CardAction — from selrs-ui@0.0.1.
 */
export interface CardActionProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
}

export declare const CardAction: React.ComponentType<CardActionProps>;
