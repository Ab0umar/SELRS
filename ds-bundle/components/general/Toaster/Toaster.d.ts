import * as React from 'react';

/**
 * Toaster — from selrs-ui@0.0.1.
 */
export interface ToasterProps {
  id?: string;
  invert?: boolean;
  theme?: "light" | "dark" | "system";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
  hotkey?: string[];
  richColors?: boolean;
  expand?: boolean;
  duration?: number;
  gap?: number;
  visibleToasts?: number;
  closeButton?: boolean;
  toastOptions?: ToastOptions;
  className?: string;
  style?: React$1.CSSProperties;
  offset?: string | number | { top?: string | number; right?: string | number; bottom?: string | number; left?: string | number; };
  mobileOffset?: string | number | { top?: string | number; right?: string | number; bottom?: string | number; left?: string | number; };
  dir?: "auto" | "ltr" | "rtl";
  swipeDirections?: ("left" | "right" | "top" | "bottom")[];
  icons?: ToastIcons;
  containerAriaLabel?: string;
}

export declare const Toaster: React.ComponentType<ToasterProps>;
