import React from 'react';
import type { SessionData } from '../lib/types';
import { WidgetOverlay } from '../components/WidgetOverlay';

/**
 * Handler for /widget — the OBS browser source.
 * Page shell as of 9220c00: full-viewport, transparent, no padding.
 */
export const WidgetView: React.FC<{ session: SessionData; isSessionEnded: boolean }> = ({
  session,
  isSessionEnded,
}) => (
  <main
    style={{ width: '100vw', minHeight: '100vh', background: 'transparent', padding: 0 }}
  >
    <WidgetOverlay session={session} isSessionEnded={isSessionEnded} />
  </main>
);

/**
 * Shown on /widget before INIT: nothing at all, so an unconnected OBS source
 * stays fully transparent instead of flashing placeholder text over the stream.
 */
export const WidgetPending: React.FC = () => null;
