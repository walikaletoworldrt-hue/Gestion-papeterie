import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
  size = "default",
  backdropClassName = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "large";
  backdropClassName?: string;
}) {
  return (
    <div className={`modal-backdrop ${backdropClassName}`.trim()} role="presentation" onClick={onClose}>
      <div
        className={`modal-card ${size === "large" ? "large" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-btn" type="button" onClick={onClose} aria-label="Fermer la fenetre">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        ...
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
