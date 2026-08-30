import * as React from 'react';

/**
 * ContextMenuPortal — from selrs-ui@0.0.1.
 */
export interface ContextMenuPortalProps {
  children?: React.ReactNode;
  /** Specify a container element to portal the content into. */
  container?: Element | DocumentFragment;
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
}

export declare const ContextMenuPortal: React.ComponentType<ContextMenuPortalProps>;
