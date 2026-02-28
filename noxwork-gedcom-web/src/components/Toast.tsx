import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

/* ─── Types ──────────────────────────────────────────────────── */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    addToast: (message: string, type?: ToastType) => void;
}

/* ─── Context ─────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue>({
    addToast: () => undefined,
});

/* ─── Hook ───────────────────────────────────────────────────── */

export function useToast() {
    return useContext(ToastContext);
}

/* ─── Toast Item ─────────────────────────────────────────────── */

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
};

const STYLES: Record<ToastType, string> = {
    success: 'border-nox-orange bg-nox-orange/10 text-nox-orange',
    error:   'border-nox-danger bg-nox-danger/10 text-nox-danger',
    info:    'border-nox-cobalt-light bg-nox-cobalt/10 text-nox-cobalt-light',
    warning: 'border-nox-warning bg-nox-warning/10 text-nox-warning',
};

const ICON_STYLES: Record<ToastType, string> = {
    success: 'bg-nox-orange text-white',
    error:   'bg-nox-danger text-white',
    info:    'bg-nox-cobalt-light text-white',
    warning: 'bg-nox-warning text-white',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const [visible, setVisible] = useState(false);

    /* mount fade-in */
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    /* auto-dismiss */
    useEffect(() => {
        const t = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onRemove(toast.id), 300);
        }, 4000);
        return () => clearTimeout(t);
    }, [toast.id, onRemove]);

    return (
        <div
            className={`
                flex items-center gap-3 min-w-[280px] max-w-sm
                border rounded-xl px-4 py-3 shadow-2xl
                transition-all duration-300
                ${STYLES[toast.type]}
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
        >
            <span
                className={`
                    w-5 h-5 rounded-full flex items-center justify-center
                    text-[11px] font-bold flex-shrink-0
                    ${ICON_STYLES[toast.type]}
                `}
            >
                {ICONS[toast.type]}
            </span>
            <p className="text-sm font-medium leading-snug flex-1">{toast.message}</p>
            <button
                onClick={() => {
                    setVisible(false);
                    setTimeout(() => onRemove(toast.id), 300);
                }}
                className="text-current opacity-50 hover:opacity-100 transition-opacity ml-1 flex-shrink-0"
                aria-label="Dismiss"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

/* ─── Provider ───────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counterRef = useRef(0);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = `toast-${++counterRef.current}`;
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {createPortal(
                <div
                    aria-live="polite"
                    className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
                >
                    {toasts.map((t) => (
                        <div key={t.id} className="pointer-events-auto">
                            <ToastItem toast={t} onRemove={removeToast} />
                        </div>
                    ))}
                </div>,
                document.body,
            )}
        </ToastContext.Provider>
    );
}
