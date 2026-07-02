import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MoreHorizontal, MessageSquare, Send, X, Users, UserPlus, Search } from 'lucide-react';
import { userKey } from '../utils/userKey';
import { cachedFetch, invalidateCache, getCached } from '../utils/apiCache';

const GRP_CACHE = 'fl_cached_groups';
const TM_CACHE = 'fl_cached_teammates';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently';
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} ${diffHrs === 1 ? 'hr' : 'hrs'} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
}

function Avatar({ user, size = 28 }) {
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
      background: color, color: 'var(--button-text)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: '700',
      fontFamily: 'var(--font-serif, Georgia, serif)', userSelect: 'none'
    }}>
      {initial}
    </div>
  );
}

const WingIcon = ({ isLeft, color }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: isLeft ? 'scaleX(1)' : 'scaleX(-1)',
      opacity: 0.8,
      margin: '0 2px',
      alignSelf: 'center'
    }}
  >
    <path d="M12 12c-2-3-6-4-10-2 1.5 3 4 5 7 5 3 0 5-1 5-3Z" fill={`${color}15`} />
    <path d="M12 12c-1.5-2.5-4.5-3.5-7.5-2 1 2.5 3 4 5.5 4 2 0 3.5-.5 3.5-1.5Z" />
    <path d="M12 12c-1-2-3-2.5-5-1.5.5 1.5 1.5 2.5 3.5 2.5 1.5 0 2-.5 2-1Z" />
  </svg>
);

export default function FriendsList() {
  // ── Unified chats & teammates state ───────────────────────────────────────
  const [recentChats, setRecentChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey('shelf_recent_chats')) || '[]'); } catch { return []; }
  });
  const [teammates, setTeammates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(TM_CACHE)) || '[]'); } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const chatEndRef = useRef(null);

  // Quick reply and dismiss state
  const [replyingChatId, setReplyingChatId] = useState(null);
  const [quickReplyText, setQuickReplyText] = useState('');

  // ── Suggest Users state ───────────────────────────────────────────────────
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestResults, setSuggestResults] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());
  const suggestRef = useRef(null);

  // ── Token state (reactive) ────────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem('shelf_auth_token'));

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('shelf_current_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });
  const currentUserId = currentUser?.id;

  useEffect(() => {
    const handleSync = () => {
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('shelf_current_user') || 'null'));
        setToken(localStorage.getItem('shelf_auth_token'));
      } catch { }
    };
    const handleOpenSuggest = () => setSuggestOpen(true);
    window.addEventListener('storage', handleSync);
    window.addEventListener('reader-activity-updated', handleSync);
    window.addEventListener('open-suggest-users', handleOpenSuggest);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('reader-activity-updated', handleSync);
      window.removeEventListener('open-suggest-users', handleOpenSuggest);
    };
  }, []);

  // ── Fetch data (parallel, with AbortController) ──────────────────────────
  const fetchTeammateData = async (tk, signal) => {
    const authToken = tk || localStorage.getItem('shelf_auth_token');
    if (!authToken) { setLoading(false); return; }
    const headers = { 'Authorization': `Bearer ${authToken}` };

    // Instant hydrate from memory cache while network refreshes
    const cachedChats = getCached('/api/chats/recent', { headers });
    const cachedTeammates = getCached('/api/teammates/mutual', { headers });
    if (cachedChats) {
      setRecentChats(cachedChats.chats || []);
    }
    if (cachedTeammates) {
      setTeammates(cachedTeammates.teammates || []);
    }

    try {
      const [chatsData, teammatesData] = await Promise.all([
        cachedFetch('/api/chats/recent', { headers }, 25000, signal),
        cachedFetch('/api/teammates/mutual', { headers }, 25000, signal)
      ]);
      const filteredChats = (chatsData.chats || []).filter(c => c.type !== 'cohort');
      setRecentChats(filteredChats);
      localStorage.setItem(userKey('shelf_recent_chats'), JSON.stringify(filteredChats));

      const tm = teammatesData.teammates || [];
      setTeammates(tm);
      localStorage.setItem(userKey(TM_CACHE), JSON.stringify(tm));
    } catch (err) {
      if (err.name !== 'AbortError') {
        // silently ignore network errors
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Main effect: re-runs when token changes ───────────────────────────────
  useEffect(() => {
    if (!token) { setLoading(false); return; }

    const controller = new AbortController();
    fetchTeammateData(token, controller.signal);

    const handleActivityUpdate = () => {
      const tk = localStorage.getItem('shelf_auth_token');
      if (tk) fetchTeammateData(tk);
    };
    const handleUserSwitched = () => {
      try {
        setRecentChats(JSON.parse(localStorage.getItem(userKey('shelf_recent_chats')) || '[]'));
        setTeammates(JSON.parse(localStorage.getItem(userKey(TM_CACHE)) || '[]'));
      } catch { }
      invalidateCache('/api/teammates');
      handleActivityUpdate();
    };

    window.addEventListener('reader-activity-updated', handleActivityUpdate);
    window.addEventListener('user-switched', handleUserSwitched);

    // Poll every 60s
    const interval = setInterval(handleActivityUpdate, 60000);

    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener('reader-activity-updated', handleActivityUpdate);
      window.removeEventListener('user-switched', handleUserSwitched);
    };
  }, [token]);

  // ── Chat Messages (unified) ────────────────────────────────────────────────
  const fetchChatMessages = async (chat) => {
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      const endpoint = chat.type === 'cohort'
        ? `/api/chat/cohort/${chat.id}`
        : `/api/chat/${chat.id}`;
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${tk}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  };

  useEffect(() => {
    if (!activeChat) return;
    fetchChatMessages(activeChat);
    const interval = setInterval(() => fetchChatMessages(activeChat), 8000);
    return () => clearInterval(interval);
  }, [activeChat]);

  useEffect(() => {
    if (activeChat) {
      localStorage.setItem(userKey(`last_viewed_${activeChat.type}_${activeChat.id}`), new Date().toISOString());
    }
  }, [activeChat, chatMessages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChat) return;
    const text = newMessageText.trim();
    setNewMessageText('');
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      const endpoint = activeChat.type === 'cohort'
        ? '/api/chat/cohort'
        : '/api/chat';
      const body = activeChat.type === 'cohort'
        ? { groupId: activeChat.id, messageText: text }
        : { receiverId: activeChat.id, messageText: text };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tk}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) setChatMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const hasNewMessages = (chat) => {
    if (!chat.lastMessageAt) return false;

    // Check if dismissed
    const dismissedTime = localStorage.getItem(userKey(`dismissed_chat_${chat.id}`));
    if (dismissedTime && new Date(chat.lastMessageAt) <= new Date(dismissedTime)) {
      return false;
    }

    if (activeChat?.id === chat.id) return false;
    const lastViewed = localStorage.getItem(userKey(`last_viewed_${chat.type}_${chat.id}`));
    if (!lastViewed) return true;
    return new Date(chat.lastMessageAt) > new Date(lastViewed);
  };

  // ── Suggest users search ──────────────────────────────────────────────────
  const handleSuggestSearch = useCallback(async (q) => {
    if (!q.trim()) { setSuggestResults([]); return; }
    setSuggestLoading(true);
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      const headers = tk ? { 'Authorization': `Bearer ${tk}` } : {};
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=8`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSuggestResults(data.users || []);
      } else {
        // Fallback demo suggestions when not authenticated
        setSuggestResults([
          { id: 'demo1', name: 'Priya Sharma', username: 'priya_reads', avatar_url: null },
          { id: 'demo2', name: 'Arjun Mehta', username: 'arjunbooks', avatar_url: null },
          { id: 'demo3', name: 'Rohan Verma', username: 'rohan_v', avatar_url: null },
        ].filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase())));
      }
    } catch {
      setSuggestResults([]);
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSuggestSearch(suggestQuery), 350);
    return () => clearTimeout(t);
  }, [suggestQuery, handleSuggestSearch]);

  const handleSendFriendRequest = async (userId) => {
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) { setSentRequests(p => new Set([...p, userId])); return; }
      await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tk}` },
        body: JSON.stringify({ friendId: userId }),
      });
      setSentRequests(p => new Set([...p, userId]));
    } catch {
      setSentRequests(p => new Set([...p, userId]));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const noToken = !token;

  const isChatDismissed = (chat) => {
    const dismissedTime = localStorage.getItem(userKey(`dismissed_chat_${chat.id}`));
    if (!dismissedTime || !chat.lastMessageAt) return false;
    return new Date(chat.lastMessageAt) <= new Date(dismissedTime);
  };

  const handleQuickReply = async (e, chat) => {
    e.preventDefault();
    if (!quickReplyText.trim()) return;
    const text = quickReplyText.trim();
    setQuickReplyText('');
    setReplyingChatId(null);
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      const endpoint = chat.type === 'cohort'
        ? '/api/chat/cohort'
        : '/api/chat';
      const body = chat.type === 'cohort'
        ? { groupId: chat.id, messageText: text }
        : { receiverId: chat.id, messageText: text };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tk}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        // Update local preview immediately
        setRecentChats(prev => prev.map(c => {
          if (c.id === chat.id) {
            return {
              ...c,
              lastMessageText: text,
              lastMessageAt: new Date().toISOString(),
              lastMessageSenderName: 'You'
            };
          }
          return c;
        }));
        // Mark as read
        localStorage.setItem(userKey(`last_viewed_${chat.type}_${chat.id}`), new Date().toISOString());
      }
    } catch (err) {
      console.error('Error sending quick reply:', err);
    }
  };

  const sortedChats = [...recentChats].filter(c => !isChatDismissed(c)).sort((a, b) => {
    const aNew = hasNewMessages(a);
    const bNew = hasNewMessages(b);
    if (aNew !== bNew) return aNew ? -1 : 1;
    if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    return 0;
  });

  return (
    <>
      <section className="friends-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 1. Chats / Messages Section */}
        <div>
          <div className="section-header" style={{ marginBottom: '8px' }}>
            <h2 className="calendar-title" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brass)' }}>
              Messages
            </h2>
            <div className="section-actions">
              <MoreHorizontal size={18} />
            </div>
          </div>

          {noToken ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', lineHeight: '1.4' }}>
              Sign in to see your messages.
            </p>
          ) : recentChats.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', lineHeight: '1.4' }}>
              {loading ? 'Updating...' : "No messages yet. Open Cohorts and connect with teammates."}
            </p>
          ) : sortedChats.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', lineHeight: '1.4' }}>
              No active un-dismissed notifications.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedChats.map(chat => {
                const isCohort = chat.type === 'cohort';
                // Use friend name & avatar for direct chat cards
                const displayName = isCohort ? `[Cohort] ${chat.name}` : chat.name;
                const displayAvatar = isCohort
                  ? (chat.lastMessageSenderAvatarUrl ? { avatar_url: chat.lastMessageSenderAvatarUrl, name: chat.lastMessageSenderName } : { name: chat.name })
                  : { avatar_url: chat.avatarUrl, name: chat.name };

                let previewText = '';
                if (chat.lastMessageText) {
                  previewText = chat.lastMessageText;
                } else if (chat.lastMessageImageUrl) {
                  previewText = '📷 Photo';
                } else {
                  previewText = chat.description || (isCohort ? 'Cohort Workspace Chat' : 'Direct Conversation');
                }

                // Append 'You: ' sender tag if current user sent it
                const prefix = isCohort 
                  ? (chat.lastMessageSenderName ? `${chat.lastMessageSenderName}: ` : '')
                  : (chat.lastMessageSenderName === 'You' ? 'You: ' : '');

                const shortPreview = previewText.length > 72 ? `${previewText.slice(0, 72)}...` : previewText;
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      const targetUser = {
                        id: chat.id,
                        name: chat.name,
                        username: chat.username,
                        avatar_url: chat.avatarUrl
                      };
                      localStorage.setItem('shelf_pending_chat_target', JSON.stringify(targetUser));
                      window.dispatchEvent(new CustomEvent('open-direct-chat', { detail: { user: targetUser } }));
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--surface-bg)',
                      border: '1px solid #e4e3da',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: hasNewMessages(chat) ? '0 8px 20px rgba(179,57,51,0.14)' : '0 2px 8px rgba(0,0,0,0.05)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      borderColor: hasNewMessages(chat) ? 'var(--rust)' : '#e4e3da'
                    }}
                    title="Click to view chat"
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                      <Avatar user={displayAvatar} size={38} />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--message-other-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {displayName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '10px', color: 'var(--brass)' }}>{formatRelativeTime(chat.lastMessageAt)}</span>
                            {hasNewMessages(chat) && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rust)', flexShrink: 0 }} />
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prefix}{shortPreview}
                          </div>
                          {chat.lastMessageImageUrl && (
                            <div style={{
                              width: '80px',
                              height: '54px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1.5px solid #5c5545',
                              background: '#fcfbf7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '2px',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.06)'
                            }}>
                              <img
                                src={chat.lastMessageImageUrl}
                                alt="Sent media thumbnail"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                  display: 'block'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Inline Reply Row */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderTop: '1px dashed #eae6d9', paddingTop: '6px' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          if (replyingChatId === chat.id) {
                            setReplyingChatId(null);
                          } else {
                            setReplyingChatId(chat.id);
                            setQuickReplyText('');
                          }
                        }}
                        style={{
                          background: replyingChatId === chat.id ? 'var(--brass)' : 'transparent',
                          border: '1.5px solid var(--accent-color)', cursor: 'pointer',
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                          fontWeight: '700', color: replyingChatId === chat.id ? '#fff' : 'var(--accent-color)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {replyingChatId === chat.id ? 'Cancel' : 'Reply'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          localStorage.setItem(userKey(`dismissed_chat_${chat.id}`), chat.lastMessageAt || new Date().toISOString());
                          setRecentChats(prev => prev.filter(c => c.id !== chat.id));
                        }}
                        style={{
                          background: 'transparent',
                          border: '1.5px solid var(--text-secondary)', cursor: 'pointer',
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                          fontWeight: '600', color: 'var(--text-secondary)',
                          transition: 'all 0.2s'
                        }}
                      >
                        Dismiss
                      </button>
                    </div>

                    {/* Inline Quick Reply Form */}
                    {replyingChatId === chat.id && (
                      <form
                        onSubmit={(e) => handleQuickReply(e, chat)}
                        style={{
                          display: 'flex', gap: '8px', width: '100%',
                          padding: '6px 10px', background: 'var(--option-bg)', borderRadius: '12px',
                          boxSizing: 'border-box', border: '1px solid var(--library-card-border)', marginTop: '4px'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={quickReplyText}
                          onChange={(e) => setQuickReplyText(e.target.value)}
                          placeholder="Type a quick reply..."
                          autoFocus
                          style={{
                            flex: 1, border: 'none', background: 'transparent',
                            fontSize: '12px', outline: 'none', color: 'var(--ink)',
                            minWidth: 0
                          }}
                        />
                        <button
                          type="submit"
                          disabled={!quickReplyText.trim()}
                          style={{
                            border: 'none', background: 'none', cursor: 'pointer',
                            color: quickReplyText.trim() ? 'var(--accent-color)' : '#9a9a94',
                            display: 'flex', alignItems: 'center', flexShrink: 0
                          }}
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Mutual Teammates Section */}
        <div>
          <div className="section-header" style={{ marginBottom: '8px' }}>
            <h2 className="calendar-title" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brass)' }}>
              Mutual Teammates
            </h2>
            <button
              title="Find & suggest readers"
              onClick={() => setSuggestOpen(v => !v)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brass)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '6px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ui-hover-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <UserPlus size={14} />
            </button>
          </div>

          {noToken ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', lineHeight: '1.4' }}>
              Sign in to see mutual teammates.
            </p>
          ) : teammates.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', lineHeight: '1.4' }}>
              {loading ? 'Updating...' : 'No mutual work teammates. Join cohorts to connect with other active readers.'}
            </p>
          ) : (
            teammates.map((mate) => {
              const avatarUrl = mate.avatar_url || null;
              const displayName = mate.name || mate.username;
              const commentText = mate.latestNote ? mate.latestNote.text : 'Working on active group shelves.';
              const relativeTime = formatRelativeTime(mate.lastActive);

              return (
                <div
                  className="friend-item"
                  key={mate.id}
                  onClick={() => setActiveChat({ id: mate.id, type: 'private', name: displayName, avatarUrl })}
                  style={{
                    display: 'flex', alignItems: 'flex-start', padding: '8px 10px',
                    borderBottom: '1px dashed #eae6d9', cursor: 'pointer', borderRadius: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar user={mate} size={32} />
                  <div style={{ flex: 1, minWidth: 0, marginLeft: '10px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--message-other-text)' }}>{displayName}</div>
                    <p style={{ fontSize: '12px', color: '#6b6457', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {commentText}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--brass)', marginTop: '2px' }}>
                      <span>Teammate</span>
                      <span>{relativeTime}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Chat Box Overlay */}
        {activeChat && (
          <div style={{
            position: 'fixed', bottom: '20px', right: '20px',
            width: '320px', height: '400px',
            background: 'var(--library-card-bg)', border: '1px solid var(--library-card-border)',
            borderRadius: '8px', boxShadow: '0 8px 30px rgba(110, 90, 70, 0.25)',
            display: 'flex', flexDirection: 'column', zIndex: 9999,
            fontFamily: 'var(--sans)'
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--library-card-border)',
              background: 'var(--paper)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--rust)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--button-text)'
                }}>
                  <MessageSquare size={14} />
                </div>
                <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ink)' }}>
                  {activeChat.name}
                </span>
              </div>
              <button
                onClick={() => setActiveChat(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brass)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              {chatMessages.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--brass)', fontSize: '12px', fontStyle: 'italic', marginTop: '40px' }}>
                  No messages yet. Send a note to connect!
                </p>
              ) : (
                chatMessages.map((m, i) => {
                  const isSelf = m.senderId === currentUserId;
                  const senderName = m.name || m.username || 'Member';
                  const prevMsg = chatMessages[i - 1];
                  const showLabel = !isSelf && (!prevMsg || prevMsg.senderId !== m.senderId);

                  return (
                    <div key={m.id} style={{
                      display: 'flex', flexDirection: isSelf ? 'row-reverse' : 'row',
                      alignItems: 'flex-end', gap: '6px',
                      alignSelf: isSelf ? 'flex-end' : 'flex-start',
                      maxWidth: '85%', margin: '4px 0'
                    }}>
                      {!isSelf && (
                        <div style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
                          <Avatar user={{ name: senderName, username: m.username, avatar_url: m.avatar_url }} size={24} />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                        {showLabel && (
                          <span style={{ fontSize: '10px', color: 'var(--brass)', marginBottom: '2px', marginLeft: '4px' }}>
                            {senderName}
                          </span>
                        )}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <WingIcon isLeft={true} color={isSelf ? 'var(--rust)' : 'var(--brass)'} />
                          <div style={{
                            padding: '10px 16px', borderRadius: '20px',
                            background: isSelf ? 'var(--rust)' : 'var(--library-card-bg)',
                            color: isSelf ? 'var(--surface-bg)' : 'var(--message-other-text)',
                            fontSize: '13px', lineHeight: '1.4',
                            border: isSelf ? '1px solid var(--rust)' : '1px solid var(--library-card-border)',
                            boxShadow: isSelf
                              ? '0 0 0 1.5px var(--library-card-bg), 0 0 0 2.5px var(--rust), 0 2px 5px rgba(0,0,0,0.05)'
                              : '0 0 0 1.5px var(--library-card-bg), 0 0 0 2.5px var(--library-card-border), 0 2px 5px rgba(0,0,0,0.03)',
                            wordBreak: 'break-word', position: 'relative', minWidth: '50px'
                          }}>
                            <div style={{
                              position: 'absolute', top: '-8px',
                              ...(isSelf ? { right: '12px' } : { left: '12px' }),
                              background: isSelf ? 'var(--rust)' : 'var(--library-card-bg)',
                              color: isSelf ? 'var(--surface-bg)' : 'var(--rust)',
                              border: isSelf ? '1px solid var(--surface-bg)' : '1px solid var(--library-card-border)',
                              borderRadius: '8px', padding: '0px 6px',
                              fontSize: '7px', fontFamily: 'monospace', fontWeight: '700',
                              textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 2
                            }}>
                              {isSelf ? 'You' : 'Reader'}
                            </div>
                            {m.text}
                          </div>
                          <WingIcon isLeft={false} color={isSelf ? 'var(--rust)' : 'var(--brass)'} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSendMessage} style={{
              padding: '12px', borderTop: '1px solid var(--library-card-border)',
              background: 'var(--paper)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px',
              display: 'flex', gap: '8px', alignItems: 'center'
            }}>
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Message teammate..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '20px',
                  border: '1px solid var(--library-card-border)', background: 'var(--surface-bg)',
                  fontSize: '13px', outline: 'none'
                }}
              />
              <button type="submit" style={{
                background: 'var(--rust)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--button-text)', cursor: 'pointer'
              }}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </section>

      {/* ── Suggest Users Floating Panel ──────────────────────────────────────── */}
      {suggestOpen && (
        <div
          ref={suggestRef}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '300px',
            background: 'var(--library-card-bg)',
            border: '1px solid var(--library-card-border)',
            borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(110,90,70,0.22)',
            zIndex: 9998,
            fontFamily: 'var(--font-sans)',
            overflow: 'hidden',
          }}
        >
          {/* Panel Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--library-card-border)',
            background: 'var(--panel-bg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--accent-color)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#fff'
              }}>
                <UserPlus size={14} />
              </div>
              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--ink)' }}>
                Find Readers
              </span>
            </div>
            <button
              onClick={() => { setSuggestOpen(false); setSuggestQuery(''); setSuggestResults([]); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brass)', fontSize: '20px', lineHeight: 1 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Input */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--library-card-border)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--surface-bg)', borderRadius: '20px',
              padding: '8px 14px', border: '1px solid var(--border-color)',
            }}>
              <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                value={suggestQuery}
                onChange={(e) => setSuggestQuery(e.target.value)}
                placeholder="Search by name or username..."
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: '13px', color: 'var(--ink)',
                }}
              />
            </div>
          </div>

          {/* Results */}
          <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '8px 0' }}>
            {suggestLoading && (
              <p style={{ textAlign: 'center', padding: '16px', color: 'var(--brass)', fontSize: '12px' }}>
                Searching...
              </p>
            )}
            {!suggestLoading && suggestQuery.trim() && suggestResults.length === 0 && (
              <p style={{ textAlign: 'center', padding: '16px', color: 'var(--brass)', fontSize: '12px', fontStyle: 'italic' }}>
                No readers found for "{suggestQuery}"
              </p>
            )}
            {!suggestLoading && !suggestQuery.trim() && (
              <p style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                Start typing to search for readers to connect with.
              </p>
            )}
            {suggestResults.map((user) => {
              const sent = sentRequests.has(user.id);
              return (
                <div
                  key={user.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 16px', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ui-hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar user={user} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name || user.username}
                    </div>
                    {user.username && (
                      <div style={{ fontSize: '11px', color: 'var(--brass)' }}>@{user.username}</div>
                    )}
                  </div>
                  <button
                    onClick={() => !sent && handleSendFriendRequest(user.id)}
                    disabled={sent}
                    style={{
                      background: sent ? 'var(--ui-hover-bg)' : 'var(--accent-color)',
                      color: sent ? 'var(--text-secondary)' : '#fff',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: sent ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    {sent ? '✓ Sent' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
