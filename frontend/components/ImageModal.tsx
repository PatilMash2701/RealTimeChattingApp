"use client";

import React from "react";
import { X } from "lucide-react";

interface ImageModalProps {
  url: string | undefined;
  onClose: () => void;
  isOpen: boolean;
}

const ImageModal = ({ url, onClose, isOpen }: ImageModalProps) => {
  if (!isOpen || !url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xl animate-fade-up"
      style={{ background: "rgba(9, 8, 15, 0.92)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-xl text-white transition-all hover:scale-110 hover:rotate-90 glass-panel"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      <div
        className="relative max-w-[90vw] max-h-[85vh] overflow-hidden rounded-2xl"
        style={{
          border: "3px solid var(--border-strong)",
          boxShadow: "0 25px 80px var(--accent-glow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt="Preview"
          className="max-w-full max-h-[85vh] object-contain"
        />
      </div>
    </div>
  );
};

export default ImageModal;
