import * as React from 'react';

/**
 * ItemMedia — from selrs-ui@0.0.1.
 */
export interface ItemMediaProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  variant?: "image" | "default" | "icon";
}

export declare const ItemMedia: React.ComponentType<ItemMediaProps>;
