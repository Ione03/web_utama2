// src/context/global-context.ts
import { createContextId } from '@builder.io/qwik';

export interface GlobalSiteData {
  id: number;
  domain: string;
  name: string;
}

export const GlobalContext = createContextId<GlobalSiteData>('global.context');
