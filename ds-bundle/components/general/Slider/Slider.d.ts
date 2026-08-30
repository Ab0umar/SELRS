import * as React from 'react';

/**
 * Slider — from selrs-ui@0.0.1.
 * @replaces input[type=range]
 */
export interface SliderProps {
  name?: string;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  dir?: "ltr" | "rtl";
  min?: number;
  max?: number;
  step?: number;
  minStepsBetweenThumbs?: number;
  value?: number[];
  defaultValue?: number[];
  inverted?: boolean;
  form?: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Slider: React.ComponentType<SliderProps>;
