import React from 'react';
import { Pencil } from 'lucide-react';

export default function BookCard({ item, openEditModal }) {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierName = isMac ? 'Ctrl' : 'Alt';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="book-card"
      title={`Click to visit website. ${modifierName} + ${item.shortcutKey} to launch.`}
      style={{ textDecoration: 'none' }}
    >
      <div className="book-cover-wrapper">
        <div
          className="book-cover"
          style={{
            backgroundImage: (item.customImage || item.coverImage) ? `url(${item.customImage || item.coverImage})` : item.gradient,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="book-cover-content">
            <span className="shortcut-badge" title={`Keyboard Shortcut: ${modifierName}+${item.shortcutKey}`}>
              {item.shortcutKey}
            </span>

            {/* Pencil Edit Icon at top-right corner */}
            <button
              className="pencil-edit-icon"
              title="Edit Shortcut Book"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openEditModal(e, item);
              }}
            >
              <Pencil size={11} />
            </button>

            <div className="book-cover-title">{item.title}</div>
            <div className="book-cover-author">{item.author}</div>
          </div>
        </div>
      </div>
      <div className="book-card-title">{item.title}</div>
      <div className="book-card-subtitle">{item.subtitle || 'Website shortcut'}</div>
    </a>
  );
}
