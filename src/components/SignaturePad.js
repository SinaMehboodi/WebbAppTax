"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight signature canvas — pointer events (mouse, pen, touch).
 * Responsive height: 220px on mobile, 280px on desktop. onCapture(pngDataUrl,
 * { consent: true }) fires when the user clicks "Save signature" after ticking
 * the explicit consent checkbox.
 */
export default function SignaturePad({ onCapture, onCancel, signerName, consentLabel }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [consent, setConsent] = useState(false);

  // Set up high-DPI canvas & re-size on viewport changes (rotate, font scale).
  useEffect(() => {
    function setup() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const prev = canvas.toDataURL("image/png");
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      if (hasInk) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = prev;
      }
    }
    setup();
    const ro = new ResizeObserver(setup);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  }
  function end(e) {
    e?.preventDefault();
    setDrawing(false);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  }

  function save() {
    if (!hasInk || !consent) return;
    const url = canvasRef.current.toDataURL("image/png");
    onCapture?.(url, { consent: true });
  }

  const defaultConsentLabel =
    consentLabel ||
    "J'accepte que ma signature manuscrite numérisée et les preuves techniques (date, IP, navigateur) soient utilisées pour authentifier ce document.";

  const canSave = hasInk && consent;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">Signez ici · Sign here</div>
          <div className="text-xs text-[var(--fg-muted)] mt-0.5">
            <b>{signerName}</b>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800/60">
          eIDAS · niveau simple
        </span>
      </div>

      <div ref={wrapRef} className="rounded-xl border border-[var(--border)] bg-white relative overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          className="block w-full h-[220px] sm:h-[260px] touch-none cursor-crosshair"
          style={{ touchAction: "none" }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-300 text-sm select-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 mr-1.5"><path d="m3 21 1.5-4.5L17 4l4 4L8.5 19.5 4 21" /></svg>
            Signez avec votre doigt ou stylet
          </div>
        )}
        <div className="absolute left-6 right-6 bottom-7 border-t border-dashed border-zinc-200 pointer-events-none" />
      </div>

      <label className="flex items-start gap-2 text-xs text-[var(--fg-muted)] leading-relaxed cursor-pointer select-none">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[color:var(--brand-500)]"
        />
        <span>{defaultConsentLabel}</span>
      </label>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={clear}
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            Effacer
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              Annuler
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="btn-brand rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50 disabled:shadow-none"
        >
          ✓ Valider la signature
        </button>
      </div>
    </div>
  );
}
