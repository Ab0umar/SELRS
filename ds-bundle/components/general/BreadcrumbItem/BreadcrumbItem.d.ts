import * as React from 'react';

/**
 * BreadcrumbItem — from selrs-ui@0.0.1.
 */
export interface BreadcrumbItemProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
}

export declare const BreadcrumbItem: React.ComponentType<BreadcrumbItemProps>;
