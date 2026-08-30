import * as React from 'react';

/**
 * ChartTooltipContent — from selrs-ui@0.0.1.
 */
export interface ChartTooltipContentProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  active?: boolean;
  payload?: readonly RechartsPrimitive.TooltipPayloadEntry<RechartsPrimitive.TooltipValueType, NameType>[];
  label?: React.ReactNode;
  formatter?: unknown;
  labelFormatter?: ((label: ReactNode, payload: readonly RechartsPrimitive.TooltipPayloadEntry<RechartsPrimitive.TooltipValueType, NameType>[]) => ReactNode) & ((label: any, payload: RechartsPrimitive.TooltipPayload) => ReactNode);
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
  labelClassName?: string;
}

export declare const ChartTooltipContent: React.ComponentType<ChartTooltipContentProps>;
