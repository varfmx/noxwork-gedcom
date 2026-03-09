/**
 * ExportService — High-resolution export utility for genealogy trees.
 *
 * Captures the React Flow canvas as a print-friendly PNG or PDF
 * with white background, black text, visible borders, and Noxwork branding.
 */
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/* ─── Types ─────────────────────────────────────────────────── */

export type ExportFormat = 'png' | 'pdf';

export interface ExportOptions {
    /** Name used for the downloaded file (without extension) */
    fileName?: string;
    /** Pixel scale multiplier for PNG resolution (default: 2) */
    scale?: number;
    /** Callback to report progress (0–100) */
    onProgress?: (percent: number) => void;
}

/* ─── Constants ─────────────────────────────────────────────── */

const WATERMARK_TEXT = 'Powered by ';
const LOGO_PATH = '/noxwork_logo_blue.png';
const LOGO_HEIGHT = 20;      // base logo height in px
const WATERMARK_FONT_SIZE = 11;
const WATERMARK_PADDING = 16;
const DEFAULT_SCALE = 2;

/* ─── Print-Friendly CSS Override Sheet ─────────────────────── */

/**
 * CSS rules injected via a <style> tag to override dark-mode colors.
 * Using a <style> tag with !important is far more reliable than
 * per-element inline styles because html-to-image re-computes
 * styles from the stylesheet cascade — not inline snapshots.
 */
const PRINT_CSS = `
/* ── Root viewport ── */
.react-flow {
    background-color: #FFFFFF !important;
    background-image: none !important;
}

/* ── Hide UI overlays ── */
.react-flow__background,
.react-flow__minimap,
.react-flow__controls,
.react-flow__attribution,
.react-flow__panel {
    display: none !important;
}

/* ── Node wrapper ── */
.react-flow__node {
    color: #000000 !important;
}

/* ── Every div inside a node (card, header, body sections) ── */
.react-flow__node div {
    background-color: #FFFFFF !important;
    color: #000000 !important;
    border-color: #c8c8c8 !important;
}

/* ── The main card (first child div with relative positioning) ── */
.react-flow__node > div {
    background-color: #FFFFFF !important;
    border: 1px solid #aaaaaa !important;
    border-left: 4px solid currentColor !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1) !important;
}

/* ── Text elements ── */
.react-flow__node h3,
.react-flow__node p,
.react-flow__node span,
.react-flow__node div {
    color: #000000 !important;
}

/* ── Muted text: keep slightly dimmer for hierarchy ── */
.react-flow__node .text-nox-text-muted,
.react-flow__node .text-\\[10px\\],
.react-flow__node .text-\\[9px\\],
.react-flow__node .opacity-60 {
    color: #555555 !important;
    opacity: 1 !important;
}

/* ── Gender symbol ── */
.react-flow__node .text-lg {
    opacity: 0.7 !important;
}

/* ── Role badges ── */
.react-flow__node span[class*="rounded"] {
    background-color: #f0f0f0 !important;
    color: #333333 !important;
}

/* ── Multi-role warning badge ── */
.react-flow__node div[class*="bg-nox-warning"] {
    background-color: #f59e0b !important;
    color: #ffffff !important;
}

/* ── Gender colored borders — preserve meaning ── */
.react-flow__node .border-nox-male,
.react-flow__node > div:has(.border-nox-male) {
    border-left-color: #3b82f6 !important;
}
.react-flow__node .border-nox-female,
.react-flow__node > div:has(.border-nox-female) {
    border-left-color: #f97316 !important;
}
.react-flow__node .border-nox-unknown,
.react-flow__node > div:has(.border-nox-unknown) {
    border-left-color: #6b7280 !important;
}

/* ── Birth/death star icons — keep colored ── */
.react-flow__node .text-green-400 {
    color: #16a34a !important;
}
.react-flow__node .text-red-400 {
    color: #dc2626 !important;
}

/* ── Connection handles — subtle on print ── */
.react-flow__handle {
    background-color: #aaaaaa !important;
    border-color: #ffffff !important;
}

/* ── Edge lines ── */
.react-flow__edge path {
    stroke: #333333 !important;
}

/* ── Edge labels ── */
.react-flow__edge-text {
    fill: #000000 !important;
}

/* ── Section dividers inside cards ── */
.react-flow__node .border-t {
    border-color: #e0e0e0 !important;
}

/* ── Progress bars inside cards ── */
.react-flow__node .rounded-full {
    background-color: #e8e8e8 !important;
}
`;

/* ─── Style Injection Helpers ───────────────────────────────── */

function injectPrintStyleSheet(): HTMLStyleElement {
    const style = document.createElement('style');
    style.setAttribute('data-export-print', 'true');
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    return style;
}

function removePrintStyleSheet(style: HTMLStyleElement) {
    style.remove();
}

/* ─── Logo Loader ───────────────────────────────────────────── */

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

/* ─── Watermark with Logo ───────────────────────────────────── */

/**
 * Draws the Noxwork logo + branding text onto the bottom-right
 * corner of the captured image and returns a data URL.
 */
async function addWatermark(
    dataUrl: string,
    width: number,
    height: number,
): Promise<string> {
    const hiDpi = width > 2000 ? 2 : 1;
    const padding = WATERMARK_PADDING * hiDpi;
    const fontSize = WATERMARK_FONT_SIZE * hiDpi;
    const logoH = LOGO_HEIGHT * hiDpi;

    // Load both images in parallel
    const [treeImg, logoImg] = await Promise.all([
        loadImage(dataUrl),
        loadImage(LOGO_PATH).catch(() => null), // gracefully degrade if logo missing
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Draw tree capture
    ctx.drawImage(treeImg, 0, 0, width, height);

    // ── Measure logo dimensions ──
    const logoAspect = logoImg ? logoImg.naturalWidth / logoImg.naturalHeight : 1;
    const logoW = logoH * logoAspect;
    const gap = 6 * hiDpi;

    // Total watermark width: text + gap + logo (if present)
    ctx.font = `500 ${fontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
    const textWidth = ctx.measureText(WATERMARK_TEXT).width;
    const totalW = textWidth + (logoImg ? gap + logoW : 0);

    // Anchor everything from the right edge
    const blockX = width - padding - totalW;
    const centerY = height - padding - (logoH / 2);

    // ── Draw text first (left side) ──
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(WATERMARK_TEXT, blockX, centerY);

    // ── Draw logo to the right of text ──
    if (logoImg) {
        const logoX = blockX + textWidth + gap;
        const logoY = centerY - logoH / 2;

        ctx.globalAlpha = 0.45;
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
        ctx.globalAlpha = 1;
    }

    return canvas.toDataURL('image/png');
}

/* ─── Main Export Functions ──────────────────────────────────── */

/**
 * Captures the React Flow viewport element as a high-resolution
 * PNG data URL with print-friendly styling and watermark.
 */
async function captureTreeAsPng(
    viewportElement: HTMLElement,
    options: ExportOptions = {},
): Promise<string> {
    const { scale = DEFAULT_SCALE, onProgress } = options;

    onProgress?.(10);

    // Inject print-friendly stylesheet
    const printSheet = injectPrintStyleSheet();

    // Give the browser a frame to recompute styles
    await new Promise((r) => requestAnimationFrame(r));

    onProgress?.(25);

    try {
        // Capture at high resolution
        const rawDataUrl = await toPng(viewportElement, {
            backgroundColor: '#FFFFFF',
            pixelRatio: scale,
            cacheBust: true,
            filter: (node: HTMLElement) => {
                const className = node.className?.toString?.() ?? '';
                if (
                    className.includes('react-flow__minimap') ||
                    className.includes('react-flow__controls') ||
                    className.includes('react-flow__panel') ||
                    className.includes('react-flow__attribution')
                ) {
                    return false;
                }
                return true;
            },
        });

        onProgress?.(65);

        // Add watermark + logo
        const width = viewportElement.offsetWidth * scale;
        const height = viewportElement.offsetHeight * scale;
        const watermarked = await addWatermark(rawDataUrl, width, height);

        onProgress?.(90);

        return watermarked;
    } finally {
        removePrintStyleSheet(printSheet);
    }
}

/**
 * Export the tree as a downloadable PNG file.
 */
export async function exportAsPng(
    viewportElement: HTMLElement,
    options: ExportOptions = {},
): Promise<void> {
    const { fileName = 'family-tree', onProgress } = options;

    const dataUrl = await captureTreeAsPng(viewportElement, {
        ...options,
        onProgress: (p) => onProgress?.(Math.round(p * 0.9)),
    });

    // Trigger download
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    link.click();

    onProgress?.(100);
}

/**
 * Export the tree as a downloadable PDF file.
 */
export async function exportAsPdf(
    viewportElement: HTMLElement,
    options: ExportOptions = {},
): Promise<void> {
    const { fileName = 'family-tree', onProgress } = options;

    const dataUrl = await captureTreeAsPng(viewportElement, {
        ...options,
        onProgress: (p) => onProgress?.(Math.round(p * 0.7)),
    });

    onProgress?.(75);

    // Determine PDF page size from viewport aspect ratio
    const width = viewportElement.offsetWidth;
    const height = viewportElement.offsetHeight;
    const orientation = width > height ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [width, height],
        hotfixes: ['px_scaling'],
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);

    onProgress?.(90);

    pdf.save(`${fileName}.pdf`);

    onProgress?.(100);
}
