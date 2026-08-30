import * as React from 'react';

/**
 * FormField — from selrs-ui@0.0.1.
 */
export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  helperText?: string;
}

export declare const FormField: React.ComponentType<FormFieldProps>;
