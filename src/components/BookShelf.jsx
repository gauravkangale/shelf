import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Plus, ArrowUpAZ, ArrowDownAZ, Star, LayoutGrid, RotateCcw, X } from 'lucide-react';
import BookCard from './BookCard';

export default function BookShelf({ displayedShortcuts, openEditModal, openAddModal, onViewAll }) {
  const [showMenu, setShowMenu] = useState(false);
  const [sortMode, setSortMode] = useState('default'); // 'default' | 'az' | 'za'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'custom'
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // Apply sort & filter
  let processedShortcuts = [...displayedShortcuts];

  if (filterMode === 'custom') {
    processedShortcuts = processedShortcuts.filter(s => !s.isDefault);
  }

  if (sortMode === 'az') {
    processedShortcuts = processedShortcuts.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortMode === 'za') {
    processedShortcuts = processedShortcuts.sort((a, b) => b.title.localeCompare(a.title));
  }

  const visibleShortcuts = processedShortcuts.slice(0, 5);

  const menuItems = [
    {
      icon: <ArrowUpAZ size={14} />,
      label: 'Sort A → Z',
      active: sortMode === 'az',
      onClick: () => { setSortMode(sortMode === 'az' ? 'default' : 'az'); setShowMenu(false); }
    },
    {
      icon: <ArrowDownAZ size={14} />,
      label: 'Sort Z → A',
      active: sortMode === 'za',
      onClick: () => { setSortMode(sortMode === 'za' ? 'default' : 'za'); setShowMenu(false); }
    },
    { divider: true },
    {
      icon: <Star size={14} />,
      label: 'My shortcuts only',
      active: filterMode === 'custom',
      onClick: () => { setFilterMode(filterMode === 'custom' ? 'all' : 'custom'); setShowMenu(false); }
    },
    {
      icon: <LayoutGrid size={14} />,
      label: 'Show all',
      active: filterMode === 'all',
      onClick: () => { setFilterMode('all'); setShowMenu(false); }
    },
    { divider: true },
    {
      icon: <RotateCcw size={14} />,
      label: 'Reset sort & filter',
      danger: false,
      onClick: () => { setSortMode('default'); setFilterMode('all'); setShowMenu(false); }
    },
  ];

  const isFiltered = sortMode !== 'default' || filterMode !== 'all';

  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">
          Popular Now
          {isFiltered && (
            <span style={{
              marginLeft: '8px', fontSize: '10px', fontWeight: '600',
              background: 'var(--accent-color, var(--rust))', color: 'var(--button-text)',
              borderRadius: '10px', padding: '2px 8px',
              verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Filtered
            </span>
          )}
        </h2>
        <div className="section-actions" style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'center' }} ref={menuRef}>
          {processedShortcuts.length > 5 && onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              style={{
                fontSize: '11px', fontWeight: '600', padding: '6px 12px',
                borderRadius: '14px', border: '1px solid #e4e3da',
                background: 'var(--surface-bg)', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              ({processedShortcuts.length})
            </button>
          )}
          <button
            title="Filter & Sort shortcuts"
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
            style={{
              background: showMenu ? 'var(--accent-color, var(--ink))' : 'rgba(0,0,0,0.04)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: showMenu ? 'var(--surface-bg)' : 'var(--text-secondary, var(--text-secondary))',
              transition: 'all 0.2s'
            }}
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <div style={{
              position: 'absolute', top: '40px', right: 0,
              background: 'var(--surface-bg)', borderRadius: '14px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
              padding: '8px', zIndex: 200, minWidth: '190px',
              animation: 'bookshelf-menu-in 0.15s ease'
            }}>
              <div style={{
                fontSize: '10px', fontWeight: '700', color: '#9a9a94',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '4px 12px 8px'
              }}>Sort & Filter</div>
              {menuItems.map((item, i) =>
                item.divider ? (
                  <div key={i} style={{ height: '1px', background: '#f0eee8', margin: '4px 0' }} />
                ) : (
                  <button
                    key={i}
                    onClick={item.onClick}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 12px', background: item.active ? '#f5f4ee' : 'none',
                      border: 'none', borderRadius: '9px',
                      cursor: 'pointer', fontSize: '13px',
                      color: item.danger ? 'var(--danger-color)' : item.active ? 'var(--ink)' : '#3e3a35',
                      fontWeight: item.active ? '600' : '400',
                      fontFamily: 'inherit',
                      transition: 'background 0.12s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = item.active ? '#eeede6' : 'var(--option-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = item.active ? '#f5f4ee' : 'none'}
                  >
                    <span style={{ color: item.active ? 'var(--accent-color, var(--rust))' : '#9a9a94' }}>{item.icon}</span>
                    {item.label}
                    {item.active && <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--rust)' }}>✓</span>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="book-shelf">
        {visibleShortcuts.map((item) => (
          <BookCard
            key={item.id}
            item={item}
            openEditModal={openEditModal}
          />
        ))}

        {/* Add Custom Website Shortcut */}
        <div className="add-book-card" onClick={openAddModal}>
          <div className="add-book-cover">
            <div className="add-icon-circle">
              <Plus size={20} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Add Shortcut</span>
          </div>
          <div className="book-card-title">Add Website</div>
          <div className="book-card-subtitle">As book cover</div>
        </div>
      </div>

      <style>{`
        @keyframes bookshelf-menu-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}
