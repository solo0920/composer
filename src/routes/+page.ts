// The Composer is a browser-local authoring tool: its state lives in
// localStorage, which does not exist during server rendering. Rendering it on
// the client only avoids a half-initialised page and keeps `localStorage`
// available at module scope.
export const ssr = false;