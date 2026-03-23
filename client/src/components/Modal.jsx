import { X } from '@phosphor-icons/react';

export default function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X weight="bold" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
