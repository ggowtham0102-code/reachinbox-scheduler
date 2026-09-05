import { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}

export function Modal({ title, onClose, children, width = "max-w-2xl" }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6">
      <div
        className={`w-full ${width} rounded-md border border-ink-600 bg-ink-800 shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-ink-600 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-mist-50">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-mist-400 hover:text-mist-50"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
