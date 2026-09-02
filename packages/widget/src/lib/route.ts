export type View = 'widget' | 'webui';

/**
 * Explicit route table: each URI owns its own handler. An unrecognised path
 * resolves to null rather than silently falling through to the dashboard.
 * Matching is on segment boundaries, so /webui/<sessionId> resolves to 'webui'
 * while /webuixyz does not resolve at all.
 */
const ROUTES: ReadonlyArray<[prefix: string, view: View]> = [
  ['/widget', 'widget'],
  ['/webui', 'webui'],
];

export function resolveView(pathname: string = window.location.pathname): View | null {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const match = ROUTES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return match ? match[1] : null;
}
