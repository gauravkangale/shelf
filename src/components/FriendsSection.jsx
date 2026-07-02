import React, { useState, useEffect, useRef } from 'react';
import {
  Search, MessageSquare, X, Send, Check, Trash2, ArrowLeft, Bell, BookOpen
} from 'lucide-react';
import { LibraryCardModal } from './Header';

// ── Decorative SVG Icons ──────────────────────────────────────────────────────
const WingIcon = ({ isLeft = true, color = 'currentColor', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: isLeft ? 'none' : 'scaleX(-1)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M22 6c-3.5 0-7 2-9 5-1-1.5-3-2.5-5-2.5-3.5 0-6 2.5-6 6 0 2 1.5 3.5 3 4 2.5.5 5.5-1.5 7-4 .5 1.5 1.5 2.5 3 2.5 2 0 3-1.5 3.5-3 .5 1 1.5 1.5 2.5 1.5 1.5 0 2-1 2-2.5 0-3.5-1-6-4-6z" />
    <path d="M13 11c-1.5 2-3.5 3-5.5 3" />
    <path d="M16 12.5c-1 1.5-2.5 2-4 2" />
  </svg>
);

const ButterflyIcon = ({ color = 'currentColor', size = 14, style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ fill: 'currentColor', color, ...style }}
  >
    <path d="M12 12C9 7 4 5 3 8C2 10 4 13 8 13C5 14 3 16 3 18C3 20 6 20 9 16C10 18 11 20 12 20" />
    <path d="M12 12C15 7 20 5 21 8C22 10 20 13 16 13C19 14 21 16 21 18C21 20 18 20 15 16C14 18 13 20 12 20" />
    <line x1="12" y1="6" x2="12" y2="20" strokeWidth="2.5" />
    <path d="M10 4c0-1 1-2 2-2s2 1 2 2" strokeWidth="1.5" fill="none" />
  </svg>
);

const SparkleIcon = ({ color = 'currentColor', size = 14, style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color, ...style }}
  >
    <path d="M12 2 Q12 12 22 12 Q12 12 12 22 Q12 12 2 12 Q12 12 12 2 Z" />
  </svg>
);

const BowIcon = ({ color = 'currentColor', size = 14, style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ fill: 'currentColor', color, ...style }}
  >
    <path d="M12 12 C9 6, 4 6, 4 12 C 4 18, 9 18, 12 12" />
    <path d="M12 12 C15 6, 20 6, 20 12 C 20 18, 15 18, 12 12" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    <path d="M10 14 L7 20" />
    <path d="M14 14 L17 20" />
  </svg>
);

const ShieldIcon = ({ size = 11, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const HeartIcon = ({ size = 11, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const CameraIcon = ({ size = 11, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M23 7l-7 5 7 5V7z"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ── Format time ───────────────────────────────────────────────────────────────
function formatTime(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 36 }) {
  const initial = (user?.name || user?.username || '?').charAt(0).toUpperCase();
  const palettes = ['#c41e3a', '#1b3d2f', '#1e355c', '#61461b', '#4a1a5c', '#1a3d4f'];
  const color = palettes[(initial.charCodeAt(0) || 0) % palettes.length];

  if (user?.avatar_url || user?.avatar) {
    return (
      <img src={user.avatar_url || user.avatar} alt={user.name || ''}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color, color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: '700',
      fontFamily: 'var(--font-serif, Georgia, serif)', userSelect: 'none'
    }}>
      {initial}
    </div>
  );
}

// ── Top Search Bar (shared) ───────────────────────────────────────────────────
function TopBar({ searchQuery, onSearchChange, searchPlaceholder, currentUser, rightAction, inputRef, onProfileClick, onBellClick }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 48px', borderBottom: '1px solid rgba(0,0,0,0.06)',
      background: 'var(--bg-color, #f5f4ee)',
      position: 'sticky', top: 0, zIndex: 30,
      backdropFilter: 'blur(12px)'
    }}>
      <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
        <Search size={14} style={{
          position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
          color: '#9a9a94', pointerEvents: 'none'
        }} />
        <input
          ref={inputRef}
          type="text" value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder || 'Search...'}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 16px 10px 40px',
            border: '1.5px solid transparent', borderRadius: '24px',
            background: 'rgba(0,0,0,0.05)',
            fontFamily: 'var(--font-sans)', fontSize: '14px',
            color: 'var(--ink)', outline: 'none', transition: 'border-color 0.2s, background 0.2s'
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--ink)'; e.target.style.background = 'var(--surface-bg)'; }}
          onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'rgba(0,0,0,0.05)'; }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {currentUser && (
          <button
            type="button"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
              background: 'transparent', border: 'none', padding: 0, fontFamily: 'var(--font-sans)'
            }}
            onClick={onProfileClick}
            aria-label="Open profile settings"
          >
            <Avatar user={currentUser} size={36} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ink)' }}>
              {currentUser.name || currentUser.username}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onBellClick}
          aria-label="Open activity notifications"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        >
          <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        {rightAction}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FriendsSection({ setActiveTab }) {
  const [shelfSearch, setShelfSearch] = useState('');
  const [teammates, setTeammates] = useState([]);
  const [selectedTeammate, setSelectedTeammate] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [activeProfileCard, setActiveProfileCard] = useState(null);

  useEffect(() => {
    const handleOpenProfile = (e) => {
      if (e.detail?.user) {
        setActiveProfileCard(e.detail.user);
      }
    };
    window.addEventListener('open-profile-card', handleOpenProfile);
    return () => window.removeEventListener('open-profile-card', handleOpenProfile);
  }, []);

  const [dmInput, setDmInput] = useState('');
  const [dmSendLoading, setDmSendLoading] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('shelf_auth_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shelf_current_user') || 'null'); } catch { return null; }
  });
  const currentUserId = currentUser?.id;

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const chatEndRef = useRef(null);
  const debouncedSearch = useDebounce(shelfSearch, 350);

  // Sync user token
  useEffect(() => {
    const handleSync = () => {
      setToken(localStorage.getItem('shelf_auth_token'));
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('shelf_current_user') || 'null'));
      } catch {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('user-switched', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('user-switched', handleSync);
    };
  }, []);

  // Fetch classmates (teammates)
  const fetchTeammates = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/teammates/mutual', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeammates(data.teammates || []);
      }
    } catch (err) {
      console.error('Failed to fetch teammates:', err);
    }
  };

  useEffect(() => {
    fetchTeammates();
    const interval = setInterval(fetchTeammates, 20000);
    return () => clearInterval(interval);
  }, [token]);

  // General user search
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const runSearch = async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter out self from search results
          setSearchResults((data.users || []).filter(u => u.id !== currentUserId));
        }
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    };
    runSearch();
  }, [debouncedSearch, token, currentUserId]);

  // Fetch DM messages
  const fetchPrivateMessages = async (friendId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/${friendId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrivateMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch DM messages:', err);
    }
  };

  useEffect(() => {
    if (!selectedTeammate) return;
    fetchPrivateMessages(selectedTeammate.id);
    const interval = setInterval(() => fetchPrivateMessages(selectedTeammate.id), 3000);
    return () => clearInterval(interval);
  }, [selectedTeammate?.id, token]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [privateMessages]);

  // Send Direct Message
  const handleSendDm = async (e) => {
    e.preventDefault();
    if (!dmInput.trim() || !selectedTeammate || dmSendLoading) return;

    const text = dmInput.trim();
    setDmInput('');
    setDmSendLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedTeammate.id,
          messageText: text
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setPrivateMessages(prev => [...prev, data.message]);
        }
      } else {
        alert('Failed to send message.');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setDmSendLoading(false);
    }
  };

  // Delete message handler (inline or bulk)
  const handleDeleteMessages = async (msgIdsToDelete) => {
    if (!msgIdsToDelete || msgIdsToDelete.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${msgIdsToDelete.length === 1 ? 'this message' : 'the selected messages'}?`)) return;

    try {
      const deletePromises = msgIdsToDelete.map(id =>
        fetch(`/api/chat/message/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );

      await Promise.all(deletePromises);

      setPrivateMessages(prev => prev.filter(m => !msgIdsToDelete.includes(m.id)));
      setSelectedMsgIds([]);
      setIsSelectMode(false);
    } catch (err) {
      console.error('Failed to delete messages:', err);
      alert('Failed to delete message(s).');
    }
  };

  const toggleSelectMessage = (id) => {
    setSelectedMsgIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openNotifications = () => {
    alert('Activity notifications list is coming soon!');
  };

  // ─── 1. Selected Teammate FULL PAGE DM Chat layout ───────────────────────
  if (selectedTeammate) {
    const teammateName = selectedTeammate.name || selectedTeammate.username || 'Teammate';
    const book = selectedTeammate.currentBook;
    const initial = teammateName.charAt(0).toUpperCase();
    const palettes = ['#c41e3a', '#1b3d2f', '#1e355c', '#61461b', '#4a1a5c', '#1a3d4f'];
    const avatarColor = palettes[(initial.charCodeAt(0) || 0) % palettes.length];

    return (
      <div style={{
        marginLeft: '80px', height: '100vh', display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-sans)', background: 'var(--bg-color, #f5f4ee)', overflow: 'hidden'
      }}>
        {/* Chat Header top section */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 28px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: 'var(--bg-color, #f5f4ee)', flexShrink: 0
        }}>
          {selectedMsgIds.length > 0 ? (
            /* Bulk delete action header */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>
                Selected {selectedMsgIds.length} {selectedMsgIds.length === 1 ? 'message' : 'messages'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleDeleteMessages(selectedMsgIds)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', background: 'var(--danger-color, #d94a43)',
                    color: '#fff', border: 'none', borderRadius: '18px',
                    fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} /> Delete Selected
                </button>
                <button
                  onClick={() => { setSelectedMsgIds([]); setIsSelectMode(false); }}
                  style={{
                    padding: '8px 16px', background: 'transparent',
                    border: '1.5px solid var(--border-color)', borderRadius: '18px',
                    fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Standard info header */
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', position: 'relative' }}>
              <button
                onClick={() => setSelectedTeammate(null)}
                aria-label="Back to chat list"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '8px', borderRadius: '50%', color: 'var(--ink)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ArrowLeft size={20} />
              </button>

              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                onClick={() => {
                  setActiveProfileCard(selectedTeammate);
                }}
              >
                {selectedTeammate.avatar_url || selectedTeammate.avatar ? (
                  <img src={selectedTeammate.avatar_url || selectedTeammate.avatar} alt={teammateName} style={{
                    width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover',
                    border: '2px solid var(--accent-color)', flexShrink: 0
                  }} />
                ) : (
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', background: avatarColor,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '700', fontSize: '16px', border: '2px solid var(--accent-color)', flexShrink: 0
                  }}>
                    {initial}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {teammateName}
                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>@{selectedTeammate.username}</span>
                  </h3>
                  {book ? (
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BookOpen size={12} style={{ color: 'var(--brass)' }} />
                      Reading <strong>{book.title}</strong> by {book.author} · {Math.round((book.currentPage / book.totalPages) * 100)}% progress
                    </p>
                  ) : (
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      Direct Conversations
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages List Area */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px',
          background: 'var(--option-bg, #f7f3e9)', borderRadius: '16px',
          margin: '12px 24px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          {privateMessages.length === 0 ? (
            <div style={{
              margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)',
              fontSize: '13px', fontStyle: 'italic', maxWidth: '280px', lineHeight: '1.6'
            }}>
              No messages here yet. Send a friendly greeting to start a conversation!
            </div>
          ) : (
            privateMessages.map((m) => {
              const isSelf = m.senderId === currentUserId;
              const msgDateLabel = formatTime(m.createdAt);
              const isSelected = selectedMsgIds.includes(m.id);

              const textLower = (m.text || '').toLowerCase();
              const isSystemNotification = textLower.includes('subscribed') || 
                                           textLower.includes('cheered') || 
                                           textLower.includes('tipped') || 
                                           textLower.includes('bits') ||
                                           textLower.includes('subscription');

              if (isSystemNotification) {
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '100%',
                      margin: '16px 0',
                      position: 'relative'
                    }}
                  >
                    {/* The centered pill */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 22px',
                        background: 'var(--accent-light)',
                        border: '2px solid var(--accent-color)',
                        borderRadius: '24px',
                        color: 'var(--accent-color)',
                        fontSize: '13px',
                        fontWeight: '600',
                        fontFamily: 'var(--font-sans)',
                        position: 'relative',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                        maxWidth: '80%',
                        textAlign: 'center'
                      }}
                    >
                      {/* Left wing */}
                      <WingIcon isLeft={true} color="var(--accent-color)" size={16} />
                      
                      {/* Center sparkles */}
                      <SparkleIcon color="var(--accent-color)" size={11} style={{ opacity: 0.8 }} />
                      
                      <span style={{ margin: '0 4px' }}>{m.text}</span>
                      
                      <SparkleIcon color="var(--accent-color)" size={11} style={{ opacity: 0.8 }} />
                      
                      {/* Right wing */}
                      <WingIcon isLeft={false} color="var(--accent-color)" size={16} />

                      {/* Sparkles flanking left/right outer */}
                      <SparkleIcon color="var(--accent-color)" size={10} style={{ position: 'absolute', left: '-18px', top: '12px' }} />
                      <SparkleIcon color="var(--accent-color)" size={10} style={{ position: 'absolute', right: '-18px', top: '12px' }} />

                      {/* Bow centered at the bottom of border */}
                      <BowIcon color="var(--accent-color)" size={13} style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)' }} />
                    </div>
                    {msgDateLabel && (
                      <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        {msgDateLabel}
                      </span>
                    )}
                  </div>
                );
              }

              const msgText = m.text || '';
              const role = isSelf 
                ? (msgText.length % 2 === 0 ? 'Streamer' : 'VIP')
                : (msgText.length % 2 === 0 ? 'Moderator' : 'Just User');

              let badgeStyle = {};
              let badgeText = '';
              let badgeIcon = null;
              let bubbleStyle = {};
              let decorators = [];

              if (role === 'Moderator') {
                badgeText = 'Moderator';
                badgeIcon = <ShieldIcon color="#ffffff" size={11} />;
                badgeStyle = {
                  background: 'var(--accent-color)',
                  color: '#ffffff',
                  border: 'none'
                };
                bubbleStyle = {
                  background: 'var(--surface-bg)',
                  border: '2px solid var(--accent-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '20px 20px 20px 4px',
                  padding: '12px 18px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                };
                // Decorators for Moderator: butterflies at top/bottom border, sparkles on left/right
                decorators = [
                  <ButterflyIcon key="m-b1" color="var(--accent-color)" size={12} style={{ position: 'absolute', top: '-7px', left: '45%' }} />,
                  <ButterflyIcon key="m-b2" color="var(--accent-color)" size={12} style={{ position: 'absolute', bottom: '-7px', right: '35%' }} />,
                  <SparkleIcon key="m-s1" color="var(--accent-color)" size={10} style={{ position: 'absolute', left: '-12px', top: '14px' }} />,
                  <SparkleIcon key="m-s2" color="var(--accent-color)" size={10} style={{ position: 'absolute', right: '-12px', bottom: '14px' }} />
                ];
              } else if (role === 'VIP') {
                badgeText = 'VIP';
                badgeIcon = <HeartIcon color="var(--accent-color)" size={11} />;
                badgeStyle = {
                  background: 'var(--surface-bg)',
                  border: '1.5px solid var(--accent-color)',
                  color: 'var(--accent-color)'
                };
                bubbleStyle = {
                  background: 'var(--accent-color)',
                  border: '2px solid var(--accent-color)',
                  color: '#ffffff',
                  borderRadius: '20px 20px 4px 20px',
                  padding: '12px 22px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                };
                // Decorators: VIP text flanked by wings inside, and some border sparkles
                decorators = [
                  <SparkleIcon key="vip-s1" color="var(--accent-color)" size={10} style={{ position: 'absolute', left: '-12px', bottom: '6px' }} />,
                  <SparkleIcon key="vip-s2" color="var(--accent-color)" size={10} style={{ position: 'absolute', right: '25%', bottom: '-7px' }} />
                ];
              } else if (role === 'Just User') {
                badgeText = 'Just User';
                badgeIcon = null;
                badgeStyle = {
                  background: 'var(--surface-bg)',
                  border: '1.5px solid var(--accent-color)',
                  color: 'var(--accent-color)'
                };
                bubbleStyle = {
                  background: 'var(--accent-light)',
                  border: '2px solid var(--accent-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '20px 20px 20px 4px',
                  padding: '12px 18px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
                };
                decorators = [
                  <ButterflyIcon key="ju-b1" color="var(--accent-color)" size={12} style={{ position: 'absolute', bottom: '-7px', left: '30%' }} />,
                  <SparkleIcon key="ju-s1" color="var(--accent-color)" size={10} style={{ position: 'absolute', right: '-12px', top: '10px' }} />,
                  <SparkleIcon key="ju-s2" color="var(--accent-color)" size={10} style={{ position: 'absolute', left: '-12px', bottom: '10px' }} />
                ];
              } else if (role === 'Streamer') {
                badgeText = 'Streamer';
                badgeIcon = <CameraIcon color="#ffffff" size={11} />;
                badgeStyle = {
                  background: 'var(--accent-color)',
                  color: '#ffffff',
                  border: 'none'
                };
                bubbleStyle = {
                  background: 'var(--surface-bg)',
                  border: '2px solid var(--accent-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '20px 20px 4px 20px',
                  padding: '12px 18px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                };
                decorators = [
                  <ButterflyIcon key="st-b1" color="var(--accent-color)" size={12} style={{ position: 'absolute', top: '-7px', right: '40%' }} />,
                  <ButterflyIcon key="st-b2" color="var(--accent-color)" size={12} style={{ position: 'absolute', bottom: '-7px', left: '35%' }} />,
                  <SparkleIcon key="st-s1" color="var(--accent-color)" size={10} style={{ position: 'absolute', left: '-12px', top: '8px' }} />,
                  <SparkleIcon key="st-s2" color="var(--accent-color)" size={10} style={{ position: 'absolute', right: '-12px', bottom: '8px' }} />
                ];
              }

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isSelf ? 'flex-end' : 'flex-start',
                    width: '100%',
                    margin: '18px 0',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      maxWidth: '85%',
                      flexDirection: isSelf ? 'row-reverse' : 'row',
                      position: 'relative'
                    }}
                    className="msg-bubble-row"
                  >
                    {/* Checkbox select square */}
                    {(isSelectMode || isSelected) && (
                      <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', marginRight: isSelf ? 0 : '4px', marginLeft: isSelf ? '4px' : 0 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectMessage(m.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                        />
                      </div>
                    )}

                    {/* Sender Profile Avatar image next to bubble */}
                    <div 
                      style={{ flexShrink: 0, marginTop: '14px', cursor: 'pointer' }}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-profile-card', { detail: { user: isSelf ? currentUser : selectedTeammate } }));
                      }}
                    >
                      {isSelf ? (
                        <Avatar user={currentUser} size={30} />
                      ) : (
                        <Avatar user={selectedTeammate} size={30} />
                      )}
                    </div>

                    {/* Message Bubble Container */}
                    <div style={{ position: 'relative', marginTop: '12px' }}>
                      {/* Badge Tab on Top of Bubble */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-12px',
                          [isSelf ? 'right' : 'left']: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '10px 10px 0 0',
                          fontSize: '10px',
                          fontWeight: '700',
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase',
                          boxShadow: '0 -2px 5px rgba(0,0,0,0.03)',
                          zIndex: 2,
                          ...badgeStyle
                        }}
                      >
                        <span>{badgeText}</span>
                        {badgeIcon}
                      </div>

                      {/* Bubble itself */}
                      <div
                        onClick={() => {
                          if (isSelectMode) {
                            toggleSelectMessage(m.id);
                          }
                        }}
                        style={{
                          cursor: isSelectMode ? 'pointer' : 'default',
                          userSelect: 'text',
                          position: 'relative',
                          fontSize: '13.5px',
                          lineHeight: '1.5',
                          ...bubbleStyle
                        }}
                      >
                        {/* If VIP, flank with wings inside */}
                        {role === 'VIP' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <WingIcon isLeft={true} color="#ffffff" size={16} />
                            <span>{msgText}</span>
                            <WingIcon isLeft={false} color="#ffffff" size={16} />
                          </div>
                        ) : (
                          msgText
                        )}
                        {m.imageUrl && (
                          <div style={{ marginTop: msgText ? '8px' : '0' }}>
                            <img src={m.imageUrl} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                          </div>
                        )}

                        {/* Outer/border absolute-positioned decorations */}
                        {decorators}
                      </div>
                    </div>

                    {/* Hover controls (Trash icon & checkbox triggers) */}
                    {!isSelectMode && (
                      <div
                        className="msg-hover-controls"
                        style={{
                          display: 'none',
                          gap: '6px',
                          alignItems: 'center',
                          position: 'absolute',
                          [isSelf ? 'left' : 'right']: '-42px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'var(--surface-bg)',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: '1.5px solid var(--border-color)',
                          zIndex: 10
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => { setIsSelectMode(true); toggleSelectMessage(m.id); }}
                          title="Select message"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brass)', padding: '2px', display: 'flex' }}
                        >
                          <Check size={13} />
                        </button>
                        {isSelf && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessages([m.id])}
                            title="Delete message"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)', padding: '2px', display: 'flex' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <span style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                    marginLeft: isSelf ? '0' : '48px',
                    marginRight: isSelf ? '48px' : '0'
                  }}>
                    {msgDateLabel}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message DM Input form at bottom */}
        <form onSubmit={handleSendDm} style={{
          display: 'flex', gap: '12px', padding: '16px 28px 24px 28px',
          background: 'var(--bg-color, #f5f4ee)', flexShrink: 0
        }}>
          <input
            type="text"
            className="form-input"
            placeholder={`Message ${teammateName}...`}
            style={{
              flex: 1,
              fontSize: '13.5px',
              padding: '12px 20px',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-bg)',
              fontFamily: 'var(--font-sans)',
              outline: 'none'
            }}
            value={dmInput}
            onChange={(e) => setDmInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!dmInput.trim() || dmSendLoading}
            style={{
              width: '42px', height: '42px',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent-color, var(--rust))',
              border: 'none', color: '#fff',
              cursor: dmInput.trim() ? 'pointer' : 'not-allowed',
              opacity: dmInput.trim() ? 1 : 0.5,
              transition: 'all 0.2s',
              boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
            }}
          >
            <Send size={16} />
          </button>
        </form>

        <style>{`
          .msg-bubble-row:hover .msg-hover-controls {
            display: flex !important;
          }
        `}</style>
      </div>
    );
  }

  // ─── 2. DEFAULT Chats List layout ──────────────────────────────────────────
  const filteredTeammates = teammates.filter(mate => {
    const term = shelfSearch.toLowerCase();
    return (
      (mate.name || '').toLowerCase().includes(term) ||
      (mate.username || '').toLowerCase().includes(term) ||
      (mate.currentBook?.title || '').toLowerCase().includes(term)
    );
  });

  return (
    <div style={{
      marginLeft: '80px', minHeight: '100vh', overflowY: 'auto',
      background: 'var(--bg-color, #f5f4ee)', fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column'
    }}>
      <TopBar
        searchQuery={shelfSearch}
        onSearchChange={setShelfSearch}
        searchPlaceholder="Search teammates, book name, or find users..."
        currentUser={currentUser}
        onProfileClick={() => setActiveTab?.('settings')}
        onBellClick={openNotifications}
      />

      <div style={{ padding: '36px 60px' }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: '700',
          color: 'var(--ink)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          Direct Conversations <span style={{ fontSize: '11px', color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>· chats</span>
        </h2>

        {shelfSearch.length >= 2 ? (
          /* Search results section */
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
              Search Results
            </h3>
            {searchLoading ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Searching for users...</p>
            ) : searchResults.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No users match "{shelfSearch}"</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {searchResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedTeammate(u)}
                    style={{
                      background: 'var(--library-card-bg)',
                      border: '1.5px solid var(--library-card-border)',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--library-card-border)'; }}
                  >
                    <Avatar user={u} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.name || u.username}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        @{u.username}
                      </div>
                    </div>
                    <MessageSquare size={16} style={{ color: 'var(--brass)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Recent teammate conversations */
          <div>
            {filteredTeammates.length === 0 ? (
              <div style={{
                padding: '24px 30px', background: 'var(--option-bg)', borderRadius: '16px',
                border: '1.5px dashed var(--library-card-border)', color: 'var(--text-secondary)',
                fontSize: '13.5px', fontStyle: 'italic', maxWidth: '400px'
              }}>
                No active conversations. Use the search bar at the top to search for users in the library system and start a chat!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredTeammates.map((mate) => {
                  const displayName = mate.name || mate.username || 'Teammate';
                  const initial = displayName.charAt(0).toUpperCase();
                  const palettes = ['#c41e3a', '#1b3d2f', '#1e355c', '#61461b', '#4a1a5c', '#1a3d4f'];
                  const avatarColor = palettes[(initial.charCodeAt(0) || 0) % palettes.length];
                  const hasBook = !!mate.currentBook;

                  return (
                    <div
                      key={mate.id}
                      onClick={() => setSelectedTeammate(mate)}
                      style={{
                        background: 'var(--library-card-bg)',
                        border: '1.5px solid var(--library-card-border)',
                        borderRadius: '20px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 6px 14px rgba(0,0,0,0.02)',
                        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = 'var(--library-card-border)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {mate.avatar_url || mate.avatar ? (
                          <img src={mate.avatar_url || mate.avatar} alt={displayName} style={{
                            width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid var(--accent-color)'
                          }} />
                        ) : (
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '50%', background: avatarColor,
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '700', fontSize: '17px', border: '2px solid var(--accent-color)'
                          }}>
                            {initial}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {displayName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            @{mate.username || 'teammate'}
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '12px' }}>
                        {hasBook ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--brass)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Current Progress</span>
                            <span style={{ fontSize: '12px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              📖 {mate.currentBook.title}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.min(100, (mate.currentBook.currentPage / mate.currentBook.totalPages) * 100)}%`,
                                  height: '100%',
                                  background: 'var(--accent-color)'
                                }} />
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                {Math.round((mate.currentBook.currentPage / mate.currentBook.totalPages) * 100)}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            No active reading details updated recently.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div style={{
        marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '15px 60px', borderTop: '1px solid rgba(0,0,0,0.06)',
        color: 'var(--text-secondary)', fontSize: '13px', background: 'var(--bg-color)'
      }}>
        <div>
          ⓘ&nbsp; Search for other library accounts by username or name to start a Direct Conversation.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--danger-color)', fontWeight: '700', fontSize: '16px' }}>
            {String(teammates.length).padStart(2, '0')}
          </span>
          <span>active conversations</span>
        </div>
      </div>
      {activeProfileCard && (
        <LibraryCardModal
          user={activeProfileCard}
          currentUserId={currentUser?.id}
          onClose={() => setActiveProfileCard(null)}
        />
      )}
    </div>
  );
}

