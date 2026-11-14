"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, X, ArrowRight } from "lucide-react";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  metadata?: any;
  onAction?: () => void;
}

export function CelebrationModal({
  isOpen,
  onClose,
  title,
  message,
  metadata,
  onAction,
}: CelebrationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Confetti canvas animation
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#fbbf24"];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
      opacity: number;
    }> = [];

    // Spawn 90 particles from center
    for (let i = 0; i < 90; i++) {
      const angle = (Math.random() * Math.PI) + Math.PI; // upward burst
      const speed = Math.random() * 12 + 4;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 6,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        opacity: 1,
      });
    }

    let animationFrameId: number;
    let startTime = Date.now();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = Date.now() - startTime;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98; // drag
        p.rotation += p.vRot;

        if (elapsed > 2000) {
          p.opacity = Math.max(0, p.opacity - 0.02);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (elapsed < 3500) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
        {/* Confetti canvas */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-[100001]"
        />

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs"
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-[100002] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-amber-200/60 p-6 sm:p-8 text-center"
        >
          {/* Top close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Golden trophy badge */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 shadow-lg shadow-amber-500/25 ring-8 ring-amber-100/70">
            <Trophy className="h-10 w-10 text-amber-800" />
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white"
            >
              <Sparkles size={14} />
            </motion.div>
          </div>

          {/* Heading & Celebration title */}
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
            Workspace Milestone
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h2>

          {/* Message body */}
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {message}
          </p>

          {/* Stats highlight if present */}
          {metadata?.count && (
            <div className="mt-5 rounded-2xl bg-gradient-to-b from-amber-50/80 to-slate-50 border border-amber-100 p-4 text-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Verified Volume
              </span>
              <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-0.5">
                {Number(metadata.count).toLocaleString()}+
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            {onAction && (
              <button
                type="button"
                onClick={() => {
                  onAction();
                  onClose();
                }}
                className="w-full flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/15 cursor-pointer"
              >
                <span>View Insights</span>
                <ArrowRight size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Awesome!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
