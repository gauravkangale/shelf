import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Trash2, UserPlus, X, MessageSquare, Flame, BookOpen, Trophy, Users } from 'lucide-react';

const NOTIF_ICONS = {
  friend_request:  { Icon: UserPlus,      bg: '#e8f0fe', color: '#3a6df0' },
  group_message:   { Icon: MessageSquare, bg: '#edf6ec', color: '#2e7d32' },
  reading_streak:  { Icon: Flame,         bg: '#fff3e0', color: '#e65100' },
  book_suggestion: { Icon: BookOpen,      bg: '#f3e5f5', color: '#7b1fa2' },
  achievement:     { Icon: Trophy,        bg: '#fff8e1', color: '#f57f17' },
};

const SAMPLE_NOTIFICATIONS = [
  {
    id: 1, type: 'friend_request',
    title: 'New friend request',
    body: 'Priya Sharma wants to connect with you.',
    time: '2 min ago', read: false,
  },
  {
    id: 2, type: 'group_message',
    title: 'Design Systems group',
    body: 'Arjun posted a new message in the group.',
    time: '15 min ago', read: false,
  },
  {
    id: 3, type: 'reading_streak',
    title: 'Reading streak',
    body: "You're on a 5-day reading streak! Keep it up.",
    time: '1 hr ago', read: true,
  },
  {
    id: 4, type: 'book_suggestion',
    title: 'Book suggestion',
    body: 'Rohan suggested "Atomic Habits" based on your reading list.',
    time: '3 hrs ago', read: true,
  },
  {
    id: 5, type: 'achievement',
    title: 'Achievement unlocked',
    body: 'You finished 10 books this year. Amazing!',
    time: 'Yesterday', read: true,
  },
];

// ── Delete Confirmation Dialog ────────────────────────────────────────────────
function DeleteConfirmDialog({ item, onConfirm, onCancel }) {
  return (
    <div className="delete-confirm-overlay">
      <div className="delete-confirm-dialog">
        <div className="delete-confirm-icon">
          <Trash2 size={20} color="var(--danger-color, #d94a43)" strokeWidth={1.75} />
        </div>
        <h3 className="delete-confirm-title">Delete Bookmark?</h3>
        <p className="delete-confirm-body">
          Are you sure you want to delete{' '}
          <strong>"{item?.title || 'this bookmark'}"</strong>?{' '}
          This action cannot be undone.
        </p>
        <div className="delete-confirm-actions">
          <button className="delete-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="delete-confirm-ok" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({ notifications, onDismiss, onMarkAllRead }) {
  const unreadCount = notifications.filter(n => !n.read).length;
  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <div>
          <span className="notif-panel-title">Notifications</span>
          {unreadCount > 0 && (
            <span className="notif-panel-badge">{unreadCount} new</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="notif-mark-all-btn" onClick={onMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>
      <div className="notif-panel-list">
        {notifications.length === 0 ? (
          <div className="notif-panel-empty">
            <Bell size={28} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }} />
            <p>You're all caught up!</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item ${n.read ? 'notif-item-read' : 'notif-item-unread'}`}
            >
              {/* Icon badge */}
              <div className="notif-item-icon">
                {(() => {
                  const cfg = NOTIF_ICONS[n.type] || { Icon: Bell, bg: '#f0ede8', color: '#888' };
                  return (
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: cfg.bg, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <cfg.Icon size={16} style={{ color: cfg.color }} />
                    </div>
                  );
                })()}
              </div>
              <div className="notif-item-body">
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-text">{n.body}</div>
                <div className="notif-item-time">{n.time}</div>
              </div>
              {!n.read && <div className="notif-unread-dot" />}
              <button
                className="notif-dismiss-btn"
                onClick={() => onDismiss(n.id)}
                title="Dismiss"
              >×</button>
            </div>
          ))
        )}
      </div>
      {notifications.length > 0 && (
        <div className="notif-panel-footer">
          <button className="notif-view-all-btn">View all notifications</button>
        </div>
      )}
    </div>
  );
}

// ── Find Readers Panel (inline dropdown) ──────────────────────────────────────
function FindReadersPanel({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const tk = localStorage.getItem('shelf_auth_token');
        const headers = tk ? { Authorization: `Bearer ${tk}` } : {};
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(query.trim())}&limit=8`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.users || []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query]);

  const sendRequest = async (userId) => {
    setSentRequests(p => new Set([...p, userId]));
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ friendId: userId }),
      });
    } catch { /* silently ignore */ }
  };

  const initial = (u) => (u?.name || u?.username || '?').charAt(0).toUpperCase();
  const palettes = ['#c41e3a', '#1b3d2f', '#1e355c', '#61461b', '#4a1a5c', '#1a3d4f'];
  const avatarColor = (u) => palettes[(initial(u).charCodeAt(0) || 0) % palettes.length];

  return (
    <div className="find-readers-panel">
      {/* Header */}
      <div className="find-readers-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: 'var(--accent-color)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <UserPlus size={13} style={{ color: '#fff' }} />
          </div>
          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--ink)' }}>
            Find Readers
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brass)', padding: '0 2px' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Search Input */}
      <div className="find-readers-search">
        <Search size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or username..."
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: '12px', color: 'var(--ink)',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="find-readers-list">
        {loading && (
          <p style={{ textAlign: 'center', padding: '12px', color: 'var(--brass)', fontSize: '12px' }}>
            Searching...
          </p>
        )}
        {!loading && query.trim() && results.length === 0 && (
          <p style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>
            No readers found
          </p>
        )}
        {!loading && !query.trim() && (
          <p style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
            Search for readers to connect with
          </p>
        )}
        {results.map(user => {
          const sent = sentRequests.has(user.id);
          return (
            <div key={user.id} className="find-readers-item">
              {user.avatar_url || user.avatar ? (
                <img src={user.avatar_url || user.avatar} alt={user.name}
                  style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: avatarColor(user), color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {initial(user)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name || user.username}
                </div>
                {user.username && (
                  <div style={{ fontSize: '11px', color: 'var(--brass)' }}>@{user.username}</div>
                )}
              </div>
              <button
                onClick={() => !sent && sendRequest(user.id)}
                disabled={sent}
                style={{
                  background: sent ? 'var(--ui-hover-bg)' : 'var(--accent-color)',
                  color: sent ? 'var(--text-secondary)' : '#fff',
                  border: 'none', borderRadius: '14px',
                  padding: '4px 10px', fontSize: '11px', fontWeight: '700',
                  cursor: sent ? 'default' : 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s',
                }}
              >
                {sent ? '✓ Sent' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
export default function Header({
  searchEngine,
  setSearchEngine,
  searchQuery,
  setSearchQuery,
  handleSearchSubmit,
}) {
  const [isDragOverTrash, setIsDragOverTrash] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showFindReaders, setShowFindReaders] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const [pendingDelete, setPendingDelete] = useState(null);

  const notifRef = useRef(null);
  const findReadersRef = useRef(null);

  // ── Close panels on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
      if (findReadersRef.current && !findReadersRef.current.contains(e.target)) {
        setShowFindReaders(false);
      }
    };
    if (showNotifPanel || showFindReaders) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifPanel, showFindReaders]);

  // ── Listen for global open-suggest-users event ─────────────────────────────
  useEffect(() => {
    const handler = () => setShowFindReaders(v => !v);
    window.addEventListener('open-suggest-users', handler);
    return () => window.removeEventListener('open-suggest-users', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const dismissNotification = (id) => setNotifications(p => p.filter(n => n.id !== id));
  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));

  // ── Trash drop: encode type inside the text/plain payload ─────────────────
  // Bookmarks encode as "bookmark::<json>", notes encode as plain integer id
  const handleTrashDrop = (e) => {
    e.preventDefault();
    setIsDragOverTrash(false);

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;

    if (raw.startsWith('bookmark::')) {
      // Bookmark dragged to trash → show confirmation dialog
      try {
        const item = JSON.parse(raw.slice('bookmark::'.length));
        setPendingDelete({ id: item.id, title: item.title, type: 'bookmark' });
      } catch {
        setPendingDelete({ id: raw, title: 'this bookmark', type: 'bookmark' });
      }
    } else {
      // Note dragged to trash → delete immediately (existing behavior)
      const noteId = parseInt(raw, 10);
      if (!isNaN(noteId)) {
        window.dispatchEvent(new CustomEvent('delete-note', { detail: { id: noteId } }));
      }
    }
  };

  const confirmBookmarkDelete = () => {
    if (pendingDelete?.type === 'bookmark') {
      window.dispatchEvent(
        new CustomEvent('delete-bookmark', { detail: { id: pendingDelete.id } })
      );
    }
    setPendingDelete(null);
  };

  return (
    <>
      <header
        className="top-header"
        style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%' }}
      >
        {/* Search Bar */}
        <form className="search-wrapper" onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '480px' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={
              searchEngine === 'google'
                ? 'Search Google or type a URL...'
                : 'Search book shortcuts on shelf...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="search-engine-selector">
            <button
              type="button"
              className={`engine-pill ${searchEngine === 'google' ? 'active' : ''}`}
              onClick={() => setSearchEngine('google')}
            >Google</button>
            <button
              type="button"
              className={`engine-pill ${searchEngine === 'shelf' ? 'active' : ''}`}
              onClick={() => setSearchEngine('shelf')}
            >Shelf</button>
          </div>
        </form>

        {/* ── Header Action Buttons ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>

          {/* Trash Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOverTrash(true); }}
            onDragLeave={() => setIsDragOverTrash(false)}
            onDrop={handleTrashDrop}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '50%',
              background: isDragOverTrash ? 'var(--danger-color)' : 'var(--ui-hover-bg)',
              color: isDragOverTrash ? '#fff' : 'var(--text-secondary)',
              border: isDragOverTrash ? 'none' : '1.5px dashed var(--border-color)',
              transition: 'all 0.2s',
              cursor: 'default',
              transform: isDragOverTrash ? 'scale(1.18)' : 'scale(1)',
            }}
            title="Drag a note or bookmark here to delete"
          >
            <Trash2 size={17} />
          </div>

          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              id="notif-bell-btn"
              className="notification-bell"
              aria-label="Notifications"
              onClick={() => setShowNotifPanel(v => !v)}
              style={{
                background: showNotifPanel ? 'var(--accent-light)' : 'var(--ui-hover-bg)',
                border: showNotifPanel ? '1.5px solid var(--accent-color)' : 'none',
                width: '40px', height: '40px', borderRadius: '50%',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', position: 'relative', transition: 'all 0.2s',
              }}
            >
              <Bell size={18} style={{ color: 'var(--text-primary)' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '8px', right: '8px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--accent-color)', border: '1.5px solid var(--surface-bg)',
                }} />
              )}
            </button>
            {showNotifPanel && (
              <NotificationPanel
                notifications={notifications}
                onDismiss={dismissNotification}
                onMarkAllRead={markAllRead}
              />
            )}
          </div>

          {/* Find Readers / UserPlus Button */}
          <div ref={findReadersRef} style={{ position: 'relative' }}>
            <button
              id="add-friend-btn"
              aria-label="Find & suggest readers"
              title="Find readers to connect with"
              onClick={() => setShowFindReaders(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', borderRadius: '50%',
                background: showFindReaders ? 'var(--accent-color)' : 'var(--ui-hover-bg)',
                border: showFindReaders ? 'none' : 'none',
                cursor: 'pointer',
                color: showFindReaders ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (!showFindReaders) {
                  e.currentTarget.style.background = 'var(--accent-color)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={e => {
                if (!showFindReaders) {
                  e.currentTarget.style.background = 'var(--ui-hover-bg)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              <UserPlus size={17} />
            </button>

            {/* Inline dropdown anchored to the button */}
            {showFindReaders && (
              <FindReadersPanel onClose={() => setShowFindReaders(false)} />
            )}
          </div>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      {pendingDelete && (
        <DeleteConfirmDialog
          item={pendingDelete}
          onConfirm={confirmBookmarkDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
