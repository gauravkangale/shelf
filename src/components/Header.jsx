  // eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef, useCallback } from 'react';
  // eslint-disable-next-line no-unused-vars
import { Search, Bell, Trash2, UserPlus, X, MessageSquare, Flame, BookOpen, Trophy, Users, Check, UserCheck, Clock, ArrowLeft } from 'lucide-react';
import Avatar from './Avatar';
import ProfileModal from './ProfileModal';

const NOTIF_ICONS = {
  friend_request: { Icon: UserPlus, bg: '#e8f0fe', color: '#3a6df0' },
  friend_accepted: { Icon: Users, bg: '#edf6ec', color: '#2e7d32' },
  group_message: { Icon: MessageSquare, bg: '#edf6ec', color: '#2e7d32' },
  reading_streak: { Icon: Flame, bg: '#fff3e0', color: '#e65100' },
  book_update: { Icon: BookOpen, bg: '#f3e5f5', color: '#7b1fa2' },
  book_suggestion: { Icon: BookOpen, bg: '#f3e5f5', color: '#7b1fa2' },
  achievement: { Icon: Trophy, bg: '#fff8e1', color: '#f57f17' },
};

function formatTime(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const diff = new Date() - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}



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
          <button className="delete-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="delete-confirm-ok" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({ notifications, onDismiss, onMarkAllRead, onFriendRespond, loading, onProfileClick }) {
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
        {loading && notifications.length === 0 ? (
          <div className="notif-panel-empty">
            <Bell size={28} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }} />
            <p>Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
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
              {/* Sender avatar / icon — clickable for profile */}
              <div
                className="notif-item-icon"
                onClick={() => n.senderId && onProfileClick?.({ id: n.senderId, name: n.senderName || n.title, friendship_status: n.friendship_status })}
                style={{ cursor: n.senderId ? 'pointer' : 'default' }}
              >
                {(n.senderAvatarUrl || n.senderAvatar) ? (
                  <img src={n.senderAvatarUrl || n.senderAvatar} alt=""
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : n.senderName ? (
                  <Avatar user={{ name: n.senderName, avatar_url: null }} size={36} />
                ) : (() => {
                  const cfg = NOTIF_ICONS[n.type] || { Icon: Bell, bg: '#f0ede8', color: '#888' };
                  return (
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
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
                <div className="notif-item-time">{formatTime(n.time)}</div>

                {/* Inline Accept / Decline — only shown for un-responded friend requests */}
                {n.type === 'friend_request' && !n.responded && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button
                      onClick={() => onFriendRespond(n, 'accept')}
                      style={{
                        padding: '5px 14px', fontSize: '11px', fontWeight: '700',
                        background: '#3a6df0', color: '#fff',
                        border: 'none', borderRadius: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px', transition: 'opacity 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <Check size={11} /> Accept
                    </button>
                    <button
                      onClick={() => onFriendRespond(n, 'decline')}
                      style={{
                        padding: '5px 14px', fontSize: '11px', fontWeight: '600',
                        background: 'var(--ui-hover-bg)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer',
                        transition: 'opacity 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Decline
                    </button>
                  </div>
                )}
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
          <button className="notif-view-all-btn" onClick={onMarkAllRead}>Mark all read</button>
        </div>
      )}
    </div>
  );
}

// ── Find Readers Panel — Instagram-style ──────────────────────────────────────
function FindReadersPanel({ onClose, onProfileClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  // Map of userId → status: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
  const [statusMap, setStatusMap] = useState({});
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Search users — server now returns friendship_status per user
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
          const users = data.users || [];
          setResults(users);
          // Initialize status map from server response
          const map = {};
          users.forEach(u => { map[u.id] = u.friendship_status || 'none'; });
          setStatusMap(prev => ({ ...prev, ...map }));
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const sendRequest = async (userId) => {
    // Optimistic update
    setStatusMap(prev => ({ ...prev, [userId]: 'pending_sent' }));
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ friendId: userId }),
      });
      if (!res.ok) {
        // Revert on error
        setStatusMap(prev => ({ ...prev, [userId]: 'none' }));
      }
    } catch {
      setStatusMap(prev => ({ ...prev, [userId]: 'none' }));
    }
  };

  const getActionButton = (user) => {
    const status = statusMap[user.id] || 'none';
    if (status === 'accepted') {
      return (
        <button
          onClick={() => onProfileClick?.(user)}
          style={{
            padding: '5px 14px', borderRadius: '14px', border: '1.5px solid var(--border-color)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <UserCheck size={11} /> Friends
        </button>
      );
    }
    if (status === 'pending_sent') {
      return (
        <button disabled style={{
          padding: '5px 14px', borderRadius: '14px', border: '1.5px solid var(--border-color)',
          background: 'transparent', color: 'var(--text-secondary)',
          fontSize: '11px', fontWeight: '600', cursor: 'default', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <Clock size={11} /> Pending
        </button>
      );
    }
    if (status === 'pending_received') {
      return (
        <button
          onClick={() => sendRequest(user.id)}
          style={{
            padding: '5px 14px', borderRadius: '14px', border: 'none',
            background: 'var(--accent-color, #b33533)', color: '#fff',
            fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          Accept
        </button>
      );
    }
    return (
      <button
        onClick={() => sendRequest(user.id)}
        style={{
          padding: '5px 14px', borderRadius: '14px', border: 'none',
          background: 'var(--accent-color, #b33533)', color: '#fff',
          fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap'
        }}
      >
        Add
      </button>
    );
  };

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
          placeholder="Search by name or @username..."
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
        {results.map(user => (
          <div key={user.id} className="find-readers-item">
            {/* Avatar — clickable → profile card */}
            <div
              onClick={() => onProfileClick?.({ ...user, friendship_status: statusMap[user.id] || user.friendship_status })}
              style={{ cursor: 'pointer', flexShrink: 0 }}
            >
              <Avatar user={user} size={38} />
            </div>

            {/* Name + username — clickable → profile card */}
            <div
              style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
              onClick={() => onProfileClick?.({ ...user, friendship_status: statusMap[user.id] || user.friendship_status })}
            >
              <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name || user.username}
              </div>
              {user.username && (
                <div style={{ fontSize: '11px', color: 'var(--brass)' }}>@{user.username}</div>
              )}
            </div>

            {getActionButton(user)}
          </div>
        ))}
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
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [profileCard, setProfileCard] = useState(null); // user to show in LibraryCardModal
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTimeoutRef = useRef(null);

  const notifRef = useRef(null);
  const findReadersRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('shelf_current_user') || 'null'); } catch { return null; }
  })();

  // ── Fetch real notifications from server ───────────────────────────────────
  // ── Fetch search suggestions ───────────────────────────────────────────────
  useEffect(() => {
    if (searchEngine !== 'google' || !searchQuery.trim()) {
  // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSelectedIndex(-1);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          // data format from Google: ["query", ["sugg1", "sugg2", ...]]
          if (data && data[1]) {
            setSuggestions(data[1].slice(0, 5)); // show up to 5
            setShowSuggestions(true);
          }
        }
   
  // eslint-disable-next-line no-unused-vars
  // eslint-disable-next-line no-empty
      } catch (err) { }
    }, 20);
  }, [searchQuery, searchEngine]);

  const fetchNotifications = useCallback(async () => {
    const tk = localStorage.getItem('shelf_auth_token');
    if (!tk) { setNotifications([]); return; }
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${tk}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Preserve local 'responded' state — if we responded, the server should have deleted it,
        // but as a safety net we filter out locally-responded notifications
        setNotifications(prev => {
          const respondedIds = new Set(prev.filter(n => n.responded).map(n => n.id));
          return (data.notifications || []).filter(n => !respondedIds.has(n.id));
        });
      }
  // eslint-disable-next-line no-empty
    } catch { } finally {
      setNotifLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    fetchNotifications();
    clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(fetchNotifications, 15000);
  }, [fetchNotifications]);

  useEffect(() => {
    const tk = localStorage.getItem('shelf_auth_token');
  // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tk) { setNotifLoading(true); startPolling(); }
    const handleAuthChange = () => {
      const newTk = localStorage.getItem('shelf_auth_token');
      if (newTk) { setNotifLoading(true); startPolling(); }
      else { clearInterval(pollIntervalRef.current); setNotifications([]); }
    };
    window.addEventListener('user-switched', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      clearInterval(pollIntervalRef.current);
      window.removeEventListener('user-switched', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [startPolling]);

  // Close panels on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false);
      if (findReadersRef.current && !findReadersRef.current.contains(e.target)) setShowFindReaders(false);
    };
    if (showNotifPanel || showFindReaders) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifPanel, showFindReaders]);

  useEffect(() => {
    const handler = () => setShowFindReaders(v => !v);
    window.addEventListener('open-suggest-users', handler);
    return () => window.removeEventListener('open-suggest-users', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Dismiss a notification
  const dismissNotification = async (id) => {
    setNotifications(p => p.filter(n => n.id !== id));
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tk}` }
      });
  // eslint-disable-next-line no-empty
    } catch { }
  };

  const markAllRead = async () => {
    setNotifications(p => p.map(n => ({ ...n, read: true })));
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({})
      });
  // eslint-disable-next-line no-empty
    } catch { }
  };

  // Accept / Decline friend request
  const handleFriendRespond = async (notif, action) => {
    // Immediately remove notification from UI — it will also be deleted on server
    setNotifications(p => p.filter(n => n.id !== notif.id));

    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({
          friendId: notif.refId,
          action,
          notificationId: notif.id
        })
      });
      window.dispatchEvent(new Event('user-switched'));
    } catch (err) {
      console.error('Friend respond error:', err);
    }
  };

  // Trash drop
  const handleTrashDrop = (e) => {
    e.preventDefault();
    setIsDragOverTrash(false);
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    if (raw.startsWith('bookmark::')) {
      try {
        const item = JSON.parse(raw.slice('bookmark::'.length));
        setPendingDelete({ id: item.id, title: item.title, type: 'bookmark' });
      } catch {
        setPendingDelete({ id: raw, title: 'this bookmark', type: 'bookmark' });
      }
    } else {
      const noteId = parseInt(raw, 10);
      if (!isNaN(noteId)) window.dispatchEvent(new CustomEvent('delete-note', { detail: { id: noteId } }));
    }
  };

  const confirmBookmarkDelete = () => {
    if (pendingDelete?.type === 'bookmark') {
      window.dispatchEvent(new CustomEvent('delete-bookmark', { detail: { id: pendingDelete.id } }));
    }
    setPendingDelete(null);
  };

  const openProfile = (user) => {
    setShowFindReaders(false);
    setShowNotifPanel(false);
    setProfileCard(user);
  };

  return (
    <>
      <header
        className="top-header"
        style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%' }}
      >
        {/* Search Bar */}
        <form className="search-wrapper" onSubmit={(e) => {
          e.preventDefault();
          setShowSuggestions(false);
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSearchSubmit({ preventDefault: () => { } }, suggestions[selectedIndex]);
            setSearchQuery(suggestions[selectedIndex]);
          } else {
            handleSearchSubmit(e);
          }
          setSelectedIndex(-1);
        }} style={{ flex: 1, maxWidth: '480px', position: 'relative' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            autoFocus
            placeholder={
              searchEngine === 'google'
                ? 'Search Google or type a URL...'
                : 'Search book shortcuts on shelf...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (!showSuggestions || suggestions.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, -1));
              }
            }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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

          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--book-page-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              zIndex: 1000
            }}>
              {suggestions.map((sugg, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                    background: selectedIndex === i ? 'var(--ui-hover-bg)' : 'transparent'
                  }}
                  onMouseDown={() => {
                    setSearchQuery(sugg);
                    setShowSuggestions(false);
                    // trigger search
                    handleSearchSubmit({ preventDefault: () => { } }, sugg);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onMouseLeave={() => setSelectedIndex(-1)}
                >
                  <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                  {sugg}
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Header Action Buttons */}
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
              transition: 'all 0.2s', cursor: 'default',
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
              onClick={() => {
                setShowNotifPanel(v => !v);
                if (!showNotifPanel) fetchNotifications();
              }}
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
                loading={notifLoading}
                onDismiss={dismissNotification}
                onMarkAllRead={markAllRead}
                onFriendRespond={handleFriendRespond}
                onProfileClick={openProfile}
              />
            )}
          </div>

          {/* Find Readers Button */}
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
                border: 'none', cursor: 'pointer',
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

            {showFindReaders && (
              <FindReadersPanel
                onClose={() => setShowFindReaders(false)}
                onProfileClick={openProfile}
              />
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

      {/* Library Card Profile Modal */}
      {profileCard && (
        <ProfileModal
          user={profileCard}
          currentUserId={currentUser?.id}
          onClose={() => setProfileCard(null)}
          onFriendAction={(userId, status) => {
            setProfileCard(prev => prev ? { ...prev, friendship_status: status } : null);
          }}
        />
      )}
    </>
  );
}
