import React, { useState } from 'react';
import { Search, Bell, Trash2 } from 'lucide-react';

export default function Header({ searchEngine, setSearchEngine, searchQuery, setSearchQuery, handleSearchSubmit }) {
  const [isDragOverTrash, setIsDragOverTrash] = useState(false);

  return (
    <header className="top-header" style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%' }}>
      <form className="search-wrapper" onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '480px' }}>
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={searchEngine === 'google' ? "Search Google or type a URL..." : "Search book shortcuts on shelf..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="search-engine-selector">
          <button
            type="button"
            className={`engine-pill ${searchEngine === 'google' ? 'active' : ''}`}
            onClick={() => setSearchEngine('google')}
          >
            Google
          </button>
          <button
            type="button"
            className={`engine-pill ${searchEngine === 'shelf' ? 'active' : ''}`}
            onClick={() => setSearchEngine('shelf')}
          >
            Shelf
          </button>
        </div>
      </form>

      {/* Header Actions Area (Notification & Trash dropzone) */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
        {/* Trash Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverTrash(true);
          }}
          onDragLeave={() => setIsDragOverTrash(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverTrash(false);
            const noteIdStr = e.dataTransfer.getData('text/plain');
            if (noteIdStr) {
              window.dispatchEvent(new CustomEvent('delete-note', { detail: { id: parseInt(noteIdStr, 10) } }));
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: isDragOverTrash ? 'var(--accent-color, #e85d56)' : 'rgba(0,0,0,0.03)',
            color: isDragOverTrash ? '#fff' : 'var(--text-secondary)',
            border: isDragOverTrash ? 'none' : '1px dashed var(--border-color)',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          title="Drag a note here to delete"
        >
          <Trash2 size={18} />
        </div>

        {/* Notification Bell */}
        <button
          className="notification-bell"
          aria-label="Notifications"
          style={{
            position: 'relative',
            background: 'rgba(0,0,0,0.03)',
            border: 'none',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Bell size={18} style={{ color: 'var(--text-primary)' }} />
          <span className="notification-dot" style={{ top: '10px', right: '10px' }}></span>
        </button>
      </div>
    </header>
  );
}
