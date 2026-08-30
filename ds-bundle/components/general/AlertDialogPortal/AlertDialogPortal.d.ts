import * as React from 'react';

/**
 * AlertDialogPortal — from selrs-ui@0.0.1.
 */
export interface AlertDialogPortalProps {
  children?: React.ReactNode;
  /** Specify a container element to portal the content into. */
  container?: Element | DocumentFragment;
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
}

export declare const AlertDialogPortal: React.ComponentType<AlertDialogPortalProps>;
