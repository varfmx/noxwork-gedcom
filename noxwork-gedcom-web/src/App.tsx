import { TreeCanvas } from './features/visualizer/TreeCanvas';
import { FileUploader } from './features/uploader/FileUploader';
import { useTreeStore } from './store/useTreeStore';

/* ─── App Layout ─────────────────────────────────────────────── */

export default function App() {
  const sessionId = useTreeStore((s) => s.sessionId);
  const reset = useTreeStore((s) => s.reset);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nox-surface">
      {/* ── Sidebar ── */}
      <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-nox-surface-lighter bg-nox-surface">
        {/* Brand Header */}
        <div className="px-4 py-5 border-b border-nox-surface-lighter">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nox-cobalt to-nox-orange flex items-center justify-center text-white font-bold text-sm shadow-lg">
              N
            </div>
            <div>
              <h1 className="text-sm font-bold text-nox-text tracking-tight">
                Noxwork GEDCOM
              </h1>
              <p className="text-[10px] text-nox-text-muted">
                Genealogy Visualizer
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h2 className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider mb-3">
              Import
            </h2>
            <FileUploader />
          </div>

          {/* Legend */}
          <div className="mt-6">
            <h2 className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider mb-3">
              Legend
            </h2>
            <div className="space-y-2 text-xs text-nox-text-muted">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-nox-male" />
                <span>Male</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-nox-female" />
                <span>Female</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-nox-unknown" />
                <span>Unknown</span>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-nox-surface-lighter">
                <div className="w-8 h-0.5 bg-nox-cobalt" />
                <span>Parent → Child</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-nox-orange" />
                <span>Spouse</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center bg-nox-warning text-nox-surface text-[8px] font-bold px-1 rounded-full">
                  ⚠ 2
                </span>
                <span>Multi-role</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {sessionId && (
          <div className="p-4 border-t border-nox-surface-lighter">
            <button
              onClick={reset}
              className="
                w-full text-xs text-nox-text-muted
                hover:text-nox-danger
                border border-nox-surface-lighter
                hover:border-nox-danger/50
                rounded-lg py-2
                transition-colors duration-200
              "
            >
              ✕ Clear Canvas
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Canvas ── */}
      <main className="flex-1 relative">
        {sessionId ? (
          <TreeCanvas />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-nox-cobalt/20 to-nox-orange/20 border border-nox-surface-lighter flex items-center justify-center">
                <span className="text-3xl opacity-50">🌳</span>
              </div>
              <h2 className="text-xl font-semibold text-nox-text">
                No Tree Loaded
              </h2>
              <p className="text-sm text-nox-text-muted leading-relaxed">
                Upload a GEDCOM file to visualize your family tree.
                <br />
                Drag and drop a{' '}
                <span className="text-nox-orange font-medium">.ged</span> file
                into the sidebar.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
