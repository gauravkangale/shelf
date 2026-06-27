import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, MessageSquare, Send, X, Users } from 'lucide-react';
import { userKey } from '../utils/userKey';
import { cachedFetch, invalidateCache, getCached } from '../utils/apiCache';

const GRP_CACHE = 'fl_cached_groups';
const TM_CACHE  = 'fl_cached_teammates';

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
      background: color, color: '#fff', display: 'flex',
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
  // ── Instant cache-first state ─────────────────────────────────────────────
  const [joinedGroups, setJoinedGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(GRP_CACHE)) || '[]'); } catch { return []; }
  });
  const [teammates, setTeammates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(TM_CACHE)) || '[]'); } catch { return []; }
  });
  const [loading, setLoading] = useState(false); // false: cache already shown
  const [activeGroupChat, setActiveGroupChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const chatEndRef = useRef(null);

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
      } catch {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('reader-activity-updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('reader-activity-updated', handleSync);
    };
  }, []);

  // ── Fetch data (parallel, with AbortController) ──────────────────────────
  const fetchTeammateData = async (tk, signal) => {
    const authToken = tk || localStorage.getItem('shelf_auth_token');
    if (!authToken) { setLoading(false); return; }
    const headers = { 'Authorization': `Bearer ${authToken}` };

    // Instant hydrate from memory cache while network refreshes
    const cachedGroups = getCached('/api/groups', { headers });
    const cachedTeammates = getCached('/api/teammates/mutual', { headers });
    if (cachedGroups) {
      const joined = (cachedGroups.groups || []).filter(g => g.isMember);
      setJoinedGroups(joined);
    }
    if (cachedTeammates) {
      setTeammates(cachedTeammates.teammates || []);
    }

    try {
      const [groupsData, teammatesData] = await Promise.all([
        cachedFetch('/api/groups', { headers }, 25000, signal),
        cachedFetch('/api/teammates/mutual', { headers }, 25000, signal)
      ]);
      const joined = (groupsData.groups || []).filter(g => g.isMember);
      setJoinedGroups(joined);
      localStorage.setItem(userKey(GRP_CACHE), JSON.stringify(joined));

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

    const handleOpenGroupChat = (e) => setActiveGroupChat(e.detail);
    const handleActivityUpdate = () => {
      const tk = localStorage.getItem('shelf_auth_token');
      if (tk) fetchTeammateData(tk);
    };
    const handleUserSwitched = () => {
      try {
        setJoinedGroups(JSON.parse(localStorage.getItem(userKey(GRP_CACHE)) || '[]'));
        setTeammates(JSON.parse(localStorage.getItem(userKey(TM_CACHE)) || '[]'));
      } catch {}
      invalidateCache('/api/groups');
      invalidateCache('/api/teammates');
      handleActivityUpdate();
    };

    window.addEventListener('open-group-chat', handleOpenGroupChat);
    window.addEventListener('reader-activity-updated', handleActivityUpdate);
    window.addEventListener('user-switched', handleUserSwitched);

    // Poll every 60s — was 30s, halved to reduce server load
    const interval = setInterval(handleActivityUpdate, 60000);

    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener('open-group-chat', handleOpenGroupChat);
      window.removeEventListener('reader-activity-updated', handleActivityUpdate);
      window.removeEventListener('user-switched', handleUserSwitched);
    };
  }, [token]);

  // ── Group chat messages ───────────────────────────────────────────────────
  const fetchGroupMessages = async (groupId) => {
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      const res = await fetch(`/api/chat/group/${groupId}`, {
        headers: { 'Authorization': `Bearer ${tk}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching group messages:', err);
    }
  };

  useEffect(() => {
    if (!activeGroupChat) return;
    fetchGroupMessages(activeGroupChat.id);
    const interval = setInterval(() => fetchGroupMessages(activeGroupChat.id), 8000);
    return () => clearInterval(interval);
  }, [activeGroupChat]);

  useEffect(() => {
    if (activeGroupChat) {
      localStorage.setItem(userKey(`last_viewed_group_${activeGroupChat.id}`), new Date().toISOString());
    }
  }, [activeGroupChat, chatMessages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeGroupChat) return;
    const text = newMessageText.trim();
    setNewMessageText('');
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      const res = await fetch('/api/chat/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tk}` },
        body: JSON.stringify({ groupId: activeGroupChat.id, messageText: text })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) setChatMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Error sending group message:', err);
    }
  };

  const hasNewMessages = (group) => {
    if (!group.lastMessageAt) return false;
    if (activeGroupChat?.id === group.id) return false;
    const lastViewed = localStorage.getItem(userKey(`last_viewed_group_${group.id}`));
    if (!lastViewed) return true;
    return new Date(group.lastMessageAt) > new Date(lastViewed);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const noToken = !token;

  const sortedGroups = [...joinedGroups].sort((a, b) => {
    const aNew = hasNewMessages(a);
    const bNew = hasNewMessages(b);
    if (aNew !== bNew) return aNew ? -1 : 1;
    if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    return (b.members?.length || 0) - (a.members?.length || 0);
  });

  return (
    <section className="friends-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* 1. Group Chats Section */}
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
        ) : joinedGroups.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', lineHeight: '1.4' }}>
            {loading ? 'Updating...' : "You haven't joined any groups yet. Open the Bookshelf tab to join group shelves."}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedGroups.map(group => {
              const previewText = group.lastMessageText || group.description || `Chat with ${group.members.length} ${group.members.length === 1 ? 'member' : 'members'}`;
              const previewSender = group.lastMessageSenderName || group.lastMessageSenderUsername || 'Someone';
              const previewSenderAvatar = group.lastMessageSenderAvatarUrl ? { avatar_url: group.lastMessageSenderAvatarUrl, name: previewSender } : { name: previewSender };
              const shortPreview = previewText.length > 72 ? `${previewText.slice(0, 72)}...` : previewText;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupChat(group)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    background: '#fff',
                    border: '1px solid #e4e3da',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: hasNewMessages(group) ? '0 8px 20px rgba(179,57,51,0.14)' : '0 2px 8px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    borderColor: hasNewMessages(group) ? '#b33933' : '#e4e3da'
                  }}
                  title="Open message"
                >
                  <Avatar user={previewSenderAvatar} size={38} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#2b2927' }}>{previewSender}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#8a826f' }}>{formatRelativeTime(group.lastMessageAt)}</span>
                        {hasNewMessages(group) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '10px', height: '10px', borderRadius: '999px', background: '#b33933', flexShrink: 0 }} />
                        )}
                      </div>
                    </div>
                    <div style={{
                      padding: '8px 10px', borderRadius: '12px',
                      background: '#fcfaf2', color: '#2b2927', fontSize: '12px',
                      lineHeight: '1.4', border: '1px solid #f0ece4',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {shortPreview}
                    </div>
                  </div>
                </button>
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
        </div>

        {noToken ? (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', lineHeight: '1.4' }}>
            Sign in to see mutual teammates.
          </p>
        ) : teammates.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', lineHeight: '1.4' }}>
            {loading ? 'Updating...' : 'No mutual work teammates. Join groups to connect with other active readers.'}
          </p>
        ) : (
          teammates.map((mate) => {
            const avatarUrl = mate.avatar_url || null;
            const displayName = mate.name || mate.username;
            const commentText = mate.latestNote ? mate.latestNote.text : 'Working on active group shelves.';
            const relativeTime = formatRelativeTime(mate.lastActive);

            return (
              <div className="friend-item" key={mate.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px dashed #eae6d9' }}>
                <Avatar user={mate} size={32} />
                <div style={{ flex: 1, minWidth: 0, marginLeft: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#2b2927' }}>{displayName}</div>
                  <p style={{ fontSize: '12px', color: '#6b6457', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {commentText}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#8a826f', marginTop: '2px' }}>
                    <span>Teammate</span>
                    <span>{relativeTime}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Group Chat Box */}
      {activeGroupChat && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px',
          width: '320px', height: '400px',
          background: '#fcfaf2', border: '1px solid #d5cebf',
          borderRadius: '8px', boxShadow: '0 8px 30px rgba(110, 90, 70, 0.25)',
          display: 'flex', flexDirection: 'column', zIndex: 9999,
          fontFamily: 'var(--sans)'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #d5cebf',
            background: 'var(--paper)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#b33933', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
              }}>
                <Users size={14} />
              </div>
              <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ink)' }}>
                {activeGroupChat.name}
              </span>
            </div>
            <button
              onClick={() => setActiveGroupChat(null)}
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
                No messages yet. Start group discussion!
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
                        <span style={{ fontSize: '10px', color: '#8a826f', marginBottom: '2px', marginLeft: '4px' }}>
                          {senderName}
                        </span>
                      )}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <WingIcon isLeft={true} color={isSelf ? '#b33933' : '#8a826f'} />
                        <div style={{
                          padding: '10px 16px', borderRadius: '20px',
                          background: isSelf ? '#b33933' : '#fcfaf2',
                          color: isSelf ? '#ffffff' : '#2b2927',
                          fontSize: '13px', lineHeight: '1.4',
                          border: isSelf ? '1px solid #b33933' : '1px solid #d5cebf',
                          boxShadow: isSelf
                            ? '0 0 0 1.5px #fcfaf2, 0 0 0 2.5px #b33933, 0 2px 5px rgba(0,0,0,0.05)'
                            : '0 0 0 1.5px #fcfaf2, 0 0 0 2.5px #d5cebf, 0 2px 5px rgba(0,0,0,0.03)',
                          wordBreak: 'break-word', position: 'relative', minWidth: '50px'
                        }}>
                          <div style={{
                            position: 'absolute', top: '-8px',
                            ...(isSelf ? { right: '12px' } : { left: '12px' }),
                            background: isSelf ? '#b33933' : '#fcfaf2',
                            color: isSelf ? '#ffffff' : '#b33933',
                            border: isSelf ? '1px solid #ffffff' : '1px solid #d5cebf',
                            borderRadius: '8px', padding: '0px 6px',
                            fontSize: '7px', fontFamily: 'monospace', fontWeight: '700',
                            textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 2
                          }}>
                            {isSelf ? 'You' : 'Reader'}
                          </div>
                          {m.text}
                        </div>
                        <WingIcon isLeft={false} color={isSelf ? '#b33933' : '#8a826f'} />
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
            padding: '12px', borderTop: '1px solid #d5cebf',
            background: 'var(--paper)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px',
            display: 'flex', gap: '8px', alignItems: 'center'
          }}>
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Message group..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '20px',
                border: '1px solid #d5cebf', background: '#ffffff',
                fontSize: '13px', outline: 'none'
              }}
            />
            <button type="submit" style={{
              background: '#b33933', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', cursor: 'pointer'
            }}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
