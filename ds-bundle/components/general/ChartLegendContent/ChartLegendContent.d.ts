import * as React from 'react';

/**
 * ChartLegendContent — from selrs-ui@0.0.1.
 */
export interface ChartLegendContentProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  payload?: readonly RechartsPrimitive.LegendPayload[];
  verticalAlign?: "top" | "bottom" | "middle";
  hideIcon?: boolean;
  nameKey?: string;
}

export declare const ChartLegendContent: React.ComponentType<ChartLegendContentProps>;
