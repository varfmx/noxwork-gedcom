import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

/* ─── GEDCOM month abbreviations ─────────────────────────────── */

const GEDCOM_MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

const MONTH_LABELS: Record<string, string> = {
    JAN: 'Jan', FEB: 'Feb', MAR: 'Mar', APR: 'Apr',
    MAY: 'May', JUN: 'Jun', JUL: 'Jul', AUG: 'Aug',
    SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dec',
};

/* ─── Props ──────────────────────────────────────────────────── */

interface GedcomDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

/* ─── Helpers ────────────────────────────────────────────────── */

function parseGedcomDate(val: string): { day: string; month: string; year: string } {
    if (!val) return { day: '', month: '', year: '' };

    // Try to parse "D MMM YYYY" or "MMM YYYY" or "YYYY"
    const parts = val.trim().split(/\s+/);

    if (parts.length === 3) {
        return { day: parts[0], month: parts[1].toUpperCase(), year: parts[2] };
    }
    if (parts.length === 2) {
        // Could be "MMM YYYY"
        if (GEDCOM_MONTHS.includes(parts[0].toUpperCase() as typeof GEDCOM_MONTHS[number])) {
            return { day: '', month: parts[0].toUpperCase(), year: parts[1] };
        }
        return { day: parts[0], month: '', year: parts[1] };
    }
    if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
        return { day: '', month: '', year: parts[0] };
    }

    return { day: '', month: '', year: val };
}

function formatGedcomDate(day: string, month: string, year: string): string {
    const parts: string[] = [];
    if (day.trim()) parts.push(day.trim());
    if (month) parts.push(month);
    if (year.trim()) parts.push(year.trim());
    return parts.join(' ');
}

/* ─── Component ──────────────────────────────────────────────── */

export function GedcomDatePicker({ value, onChange, placeholder }: GedcomDatePickerProps) {
    const parsed = useMemo(() => parseGedcomDate(value), [value]);
    const [day, setDay] = useState(parsed.day);
    const [month, setMonth] = useState(parsed.month);
    const [year, setYear] = useState(parsed.year);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync when external value changes
    useEffect(() => {
        const p = parseGedcomDate(value);
        setDay(p.day);
        setMonth(p.month);
        setYear(p.year);
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = useCallback(
        (newDay: string, newMonth: string, newYear: string) => {
            setDay(newDay);
            setMonth(newMonth);
            setYear(newYear);
            onChange(formatGedcomDate(newDay, newMonth, newYear));
        },
        [onChange],
    );

    const displayValue = useMemo(() => {
        if (!day && !month && !year) return '';
        return formatGedcomDate(day, month, year);
    }, [day, month, year]);

    const currentYear = new Date().getFullYear();

    return (
        <div ref={containerRef} className="relative">
            {/* Display field */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="
                    w-full bg-nox-surface-light border border-nox-surface-lighter rounded-lg
                    px-3 py-2 text-sm text-left
                    focus:outline-none focus:ring-2 focus:ring-nox-cobalt/40 focus:border-nox-cobalt
                    transition-all flex items-center justify-between
                "
            >
                <span className={displayValue ? 'text-nox-text' : 'text-nox-text-muted'}>
                    {displayValue || placeholder || 'Select date…'}
                </span>
                <svg className="w-4 h-4 text-nox-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="
                    absolute top-full left-0 right-0 mt-1 z-50
                    bg-nox-surface-light border border-nox-surface-lighter rounded-xl
                    shadow-2xl p-3 space-y-3
                    animate-in fade-in-50 slide-in-from-top-1
                ">
                    {/* Result preview */}
                    <div className="text-center text-xs text-nox-cobalt-light font-mono bg-nox-cobalt/10 rounded-lg py-1.5">
                        {displayValue || '—'}
                    </div>

                    {/* Day + Year row */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[9px] text-nox-text-muted uppercase tracking-wider block mb-1">Day</label>
                            <input
                                type="number"
                                min={1}
                                max={31}
                                value={day}
                                onChange={(e) => handleChange(e.target.value, month, year)}
                                placeholder="—"
                                className="
                                    w-full bg-nox-surface border border-nox-surface-lighter rounded-lg
                                    px-2 py-1.5 text-sm text-nox-text text-center
                                    placeholder:text-nox-text-muted
                                    focus:outline-none focus:ring-1 focus:ring-nox-cobalt/40
                                    [&::-webkit-inner-spin-button]:appearance-none
                                    [&::-webkit-outer-spin-button]:appearance-none
                                    [-moz-appearance:textfield]
                                "
                            />
                        </div>
                        <div>
                            <label className="text-[9px] text-nox-text-muted uppercase tracking-wider block mb-1">Year</label>
                            <input
                                type="number"
                                min={1500}
                                max={currentYear}
                                value={year}
                                onChange={(e) => handleChange(day, month, e.target.value)}
                                placeholder="—"
                                className="
                                    w-full bg-nox-surface border border-nox-surface-lighter rounded-lg
                                    px-2 py-1.5 text-sm text-nox-text text-center
                                    placeholder:text-nox-text-muted
                                    focus:outline-none focus:ring-1 focus:ring-nox-cobalt/40
                                    [&::-webkit-inner-spin-button]:appearance-none
                                    [&::-webkit-outer-spin-button]:appearance-none
                                    [-moz-appearance:textfield]
                                "
                            />
                        </div>
                    </div>

                    {/* Month grid */}
                    <div>
                        <label className="text-[9px] text-nox-text-muted uppercase tracking-wider block mb-1">Month</label>
                        <div className="grid grid-cols-4 gap-1">
                            {GEDCOM_MONTHS.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => handleChange(day, month === m ? '' : m, year)}
                                    className={`
                                        py-1.5 rounded-lg text-xs font-medium
                                        border transition-all duration-100
                                        ${month === m
                                            ? 'bg-nox-cobalt/20 border-nox-cobalt text-nox-cobalt-light'
                                            : 'bg-nox-surface border-nox-surface-lighter text-nox-text-muted hover:text-nox-text hover:border-nox-text-muted'
                                        }
                                    `}
                                >
                                    {MONTH_LABELS[m]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                handleChange('', '', '');
                                setIsOpen(false);
                            }}
                            className="flex-1 py-1.5 rounded-lg text-[10px] text-nox-text-muted border border-nox-surface-lighter hover:text-nox-text transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-nox-cobalt/20 border border-nox-cobalt/30 text-nox-cobalt-light hover:bg-nox-cobalt/30 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
