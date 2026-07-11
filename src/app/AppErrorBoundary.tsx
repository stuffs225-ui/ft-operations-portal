// Global error boundary — the app previously had NONE, so any uncaught render
// error (or a failed lazy-route chunk after a new deployment invalidated the
// old asset hashes) rendered a permanently blank white page.
//
// Two behaviors:
//   1. Stale-chunk errors ("Failed to fetch dynamically imported module" /
//      "Loading chunk … failed") auto-reload the page ONCE — the reload fetches
//      the fresh index.html with the new hashes and the app recovers by itself.
//      A sessionStorage flag prevents a reload loop if the error persists.
//   2. Any other error shows a readable card with a reload button instead of a
//      white screen.

import { Component, type ReactNode } from 'react';

const RELOAD_FLAG = 'ft-chunk-reload-at';

function isStaleChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /failed to fetch dynamically imported module|loading chunk|chunkloaderror|importing a module script failed|error loading dynamically imported module/i.test(msg);
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isStaleChunkError(error)) {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
      // Auto-reload at most once per 30s — enough to pick up a fresh deploy,
      // never a reload loop.
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (isStaleChunkError(this.state.error)) {
      // While the auto-reload kicks in, show a spinner rather than white.
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Updating to the latest version…</span>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm max-w-md w-full p-6 text-center space-y-4">
          <div className="text-3xl">⚠️</div>
          <h1 className="text-base font-semibold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-500 break-words">
            {this.state.error.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          >
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
