import * as React from 'react';

/**
 * AppFormField — from selrs-ui@0.0.1.
 */
export interface AppFormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  helperText?: string;
}

export declare const AppFormField: React.ComponentType<AppFormFieldProps>;
