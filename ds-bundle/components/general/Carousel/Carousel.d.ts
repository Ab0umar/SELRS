import * as React from 'react';

/**
 * Carousel — from selrs-ui@0.0.1.
 */
export interface CarouselProps {
  opts?: Partial<OptionsType>;
  plugins?: CreatePluginType<LoosePluginType, {}>[];
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
}

export declare const Carousel: React.ComponentType<CarouselProps>;
