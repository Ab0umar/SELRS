import * as React from 'react';

/**
 * MenubarPortal — from selrs-ui@0.0.1.
 */
export interface MenubarPortalProps {
  children?: React.ReactNode;
  /** Specify a container element to portal the content into. */
  container?: Element | DocumentFragment;
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
}

export declare const MenubarPortal: React.ComponentType<MenubarPortalProps>;
