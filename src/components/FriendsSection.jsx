import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Send, ArrowLeft, BookOpen, Trash2, Users, MessageSquare, Image, X, MoreVertical, BookUser, MessageCircle } from 'lucide-react';
import Avatar from './Avatar';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Compress image before sending to avoid payload limits and speed up transfers
function compressImage(base64Str, maxWidth = 1000, maxHeight = 1000) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str);
  });
}



// ─── Chat Conversation View ───────────────────────────────────────────────────
function ChatView({ friend, currentUser, token, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Extract true user ID from token to perfectly identify own messages
  const tokenUserId = React.useMemo(() => {
    try {
      if (!token) return currentUser?.id;
      return JSON.parse(atob(token.split('.')[1])).sub || currentUser?.id;
    } catch {
      return currentUser?.id;
    }
  }, [token, currentUser]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Clear drafting state when switching users or friends
  useEffect(() => {
    setImagePreview(null);
    setInput('');
    setError(null);
  }, [currentUser?.id, friend?.id]);

  // Message selection states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);
  const [showMenu, setShowMenu] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const menuRef = useRef(null);

  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!token || !friend?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetchWithTimeout(`/api/chat/${friend.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }, 10000);

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setError(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (isInitial) setError(errData.error || 'Could not load messages.');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        if (isInitial) setError('Request timed out. Check your connection.');
      } else if (isInitial) {
        setError('Network error. Please try again.');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [token, friend?.id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessages([]);
    setImagePreview(null);
    setIsSelectMode(false);
    setSelectedMsgIds([]);
    fetchMessages(true);

    pollRef.current = setInterval(() => fetchMessages(false), 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [friend?.id]);

  // Handle clicking outside 3-dot dropdown to close it
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu]);

  // Message context menu trigger hook
  const [activeMsgMenuId, setActiveMsgMenuId] = useState(null);

  useEffect(() => {
    const closeMsgMenu = () => setActiveMsgMenuId(null);
    document.addEventListener('click', closeMsgMenu);
    return () => document.removeEventListener('click', closeMsgMenu);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // Compress image client side down to safe dimensions and size
        const compressed = await compressImage(reader.result);
        setImagePreview(compressed);
      } catch (err) {
        console.error('Image compression failed, using original:', err);
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    const image = imagePreview;

    if ((!text && !image) || sending || !token) return;

    setInput('');
    setImagePreview(null);
    setSending(true);

    // Optimistic update
    const tempId = `opt-${Date.now()}`;
    const optimistic = {
      id: tempId,
      senderId: tokenUserId,
      text,
      imageUrl: image,
      createdAt: new Date().toISOString(),
      optimistic: true
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: friend.id, messageText: text, imageUrl: image })
      }, 15000);

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.id === tempId ? (data.message || { ...m, optimistic: false }) : m));
        setError(null);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to send.');
        setTimeout(() => setError(null), 4000);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError('Send failed. Check your connection.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      await fetchWithTimeout(`/api/chat/message/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch { }
  };

  const handleDeleteSelected = async () => {
    if (selectedMsgIds.length === 0) return;
    if (!window.confirm(`Delete the ${selectedMsgIds.length} selected message(s)?`)) return;

    setMessages(prev => prev.filter(m => !selectedMsgIds.includes(m.id)));
    const ids = [...selectedMsgIds];
    setSelectedMsgIds([]);
    setIsSelectMode(false);

    try {
      await Promise.all(ids.map(id =>
        fetchWithTimeout(`/api/chat/message/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }, 8000)
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear all messages in this conversation? This cannot be undone.')) return;
    setMessages([]);
    setShowMenu(false);
    try {
      const ids = messages.map(m => m.id);
      await Promise.all(ids.map(id =>
        fetchWithTimeout(`/api/chat/message/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }, 8000)
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const friendName = friend?.name || friend?.username || 'Reader';
  const currentBook = friend?.currentBook;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--option-bg, #f7f3e9)',
      position: 'relative'
    }}>
      {/* Chat Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--surface-bg)',
        flexShrink: 0,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        zIndex: 10,
        position: 'relative'
      }}>
        {isSelectMode ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--ink)' }}>
              Selected {selectedMsgIds.length} {selectedMsgIds.length === 1 ? 'message' : 'messages'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedMsgIds.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', background: selectedMsgIds.length > 0 ? 'var(--danger-color, #d94a43)' : 'rgba(0,0,0,0.06)',
                  color: selectedMsgIds.length > 0 ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '18px',
                  fontSize: '12px', fontWeight: '700', cursor: selectedMsgIds.length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
              <button
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedMsgIds([]);
                }}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: '1.5px solid var(--border-color)', borderRadius: '18px',
                  fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              {/* Back button for mobile view */}
              <button
                className="chat-back-btn"
                onClick={onBack}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
                  borderRadius: '50%', color: 'var(--ink)', display: 'none',
                  alignItems: 'center', transition: 'background 0.2s', marginRight: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <ArrowLeft size={20} />
              </button>

              <Avatar user={friend} size={42} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {friendName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--brass)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>@{friend.username}</span>
                  {currentBook && (
                    <>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <BookOpen size={10} style={{ color: 'var(--brass)' }} />
                        Reading <strong>{currentBook.title}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 3-dot dropdown menu trigger */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMenu(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
                  borderRadius: '50%', color: 'var(--ink)', display: 'flex',
                  alignItems: 'center', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                title="Options"
              >
                <MoreVertical size={20} />
              </button>

              {showMenu && (
                <div
                  ref={menuRef}
                  style={{
                    position: 'absolute', right: '0', top: '40px',
                    background: 'var(--surface-bg)', border: '1px solid var(--border-color)',
                    borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    padding: '6px 0', zIndex: 100, minWidth: '150px'
                  }}
                >
                  <button
                    onClick={() => {
                      setIsSelectMode(true);
                      setShowMenu(false);
                    }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 16px',
                      background: 'none', border: 'none', textAlign: 'left',
                      fontSize: '13px', cursor: 'pointer', color: 'var(--ink)',
                      fontFamily: 'var(--font-sans)', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Select Messages
                  </button>
                  <button
                    onClick={handleClearChat}
                    style={{
                      display: 'block', width: '100%', padding: '10px 16px',
                      background: 'none', border: 'none', textAlign: 'left',
                      fontSize: '13px', cursor: 'pointer', color: 'var(--danger-color, #d94a43)',
                      fontFamily: 'var(--font-sans)', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,74,67,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Clear Chat
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          background: `
      radial-gradient(circle at top right, rgba(255, 214, 102, 0.12), transparent 35%),
      radial-gradient(circle at bottom left, rgba(99, 102, 241, 0.08), transparent 40%),
      linear-gradient(180deg, #fffdf8 0%, #fcfaf4 100%)
    `,
          borderLeft: '1px solid rgba(0,0,0,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
          scrollBehavior: 'smooth',
          position: 'relative'
        }}
      >
        {loading && (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid rgba(0,0,0,0.08)',
              borderTopColor: 'var(--accent-color)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 10px'
            }} />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading messages...</div>
          </div>
        )}

        {!loading && error && (
          <div style={{
            margin: 'auto', textAlign: 'center', padding: '24px 28px',
            background: '#fff0f0', border: '1px solid #f5c6c6',
            borderRadius: '20px', maxWidth: '340px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>⚠️</div>
            <div style={{ fontSize: '13px', color: '#c0392b', fontWeight: '600', marginBottom: '12px' }}>{error}</div>
            <button
              onClick={() => { setError(null); setLoading(true); fetchMessages(true); }}
              style={{
                padding: '9px 20px', borderRadius: '20px', border: 'none',
                background: 'var(--accent-color, #b33533)', color: '#fff',
                fontSize: '13px', fontWeight: '700', cursor: 'pointer'
              }}
            >Try again</button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div style={{
            margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)',
            fontSize: '13px', fontStyle: 'italic', maxWidth: '260px', lineHeight: 1.6
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}><MessageCircle /></div>
            <div style={{ fontWeight: '700', color: 'var(--ink)', fontSize: '14px', marginBottom: '4px' }}>No messages yet</div>
            Start the conversation by sending a message or sharing an image!
          </div>
        )}

        {messages.map((m, i) => {
          const isSelf = m.senderId === tokenUserId;
          const showTime = i === 0 ||
            new Date(m.createdAt) - new Date(messages[i - 1]?.createdAt) > 30 * 60 * 1000;
          const isSelected = selectedMsgIds.includes(m.id);
          const isMenuOpen = activeMsgMenuId === m.id;

          return (
            <React.Fragment key={m.id}>
              {showTime && (
                <div style={{
                  textAlign: 'center', fontSize: '11px', color: 'var(--brass)',
                  margin: '16px 0 8px', fontWeight: '700', letterSpacing: '0.05em'
                }}>
                  {new Date(m.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(m.createdAt)}
                </div>
              )}
              <div style={{
                display: 'flex',
                flexDirection: isSelf ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '12px',
                opacity: m.optimistic ? 0.65 : 1,
                transition: 'opacity 0.3s',
                position: 'relative'
              }}>
                {isSelectMode && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    alignSelf: 'center', [isSelf ? 'marginLeft' : 'marginRight']: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedMsgIds(prev =>
                          prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                        );
                      }}
                      style={{
                        width: '16px', height: '16px', cursor: 'pointer',
                        accentColor: 'var(--accent-color, #b33533)'
                      }}
                    />
                  </div>
                )}

                {!isSelf && <div style={{ marginTop: '2px' }}><Avatar user={friend} size={36} /></div>}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '65%' }}>
                  <div style={{ maxWidth: '100%', position: 'relative' }} className="msg-wrap">
                    <div
                      onClick={() => {
                        if (isSelectMode) {
                          setSelectedMsgIds(prev =>
                            prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                          );
                        }
                      }}
                      style={{
                        borderRadius: isSelf ? '22px 22px 6px 22px' : '22px 22px 22px 6px',
                        background: isSelf ? '#fad3d8' : '#e6f2fb',
                        color: '#443c3d',
                        fontSize: '14.5px',
                        fontWeight: '500',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        border: isSelected ? '2px solid var(--accent-color, #b33533)' : (isSelf ? '2px solid #eab7bc' : '2px solid #b8d0e6'),
                        cursor: isSelectMode ? 'pointer' : 'default',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      {m.imageUrl && (
                        <div style={{ position: 'relative', overflow: 'hidden' }}>
                          <a href={m.imageUrl} target="_blank" rel="noreferrer" style={{ display: 'block', outline: 'none' }} onClick={e => isSelectMode && e.preventDefault()}>
                            <img
                              src={m.imageUrl}
                              alt="Shared media"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '280px',
                                width: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                transition: 'transform 0.3s ease'
                              }}
                              className="chat-image"
                            />
                          </a>
                        </div>
                      )}
                      {m.text && (
                        <div style={{ padding: m.imageUrl ? '12px 16px' : '12px 18px' }}>
                          {m.text}
                        </div>
                      )}
                    </div>

                    {/* Inline Options Menu Trigger next to bubble */}
                    {!isSelectMode && !m.optimistic && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMsgMenuId(isMenuOpen ? null : m.id);
                        }}
                        className="msg-menu-btn"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          [isSelf ? 'left' : 'right']: '-32px',
                          background: 'var(--surface-bg)',
                          border: '1.5px solid var(--border-color)',
                          borderRadius: '50%',
                          width: '26px',
                          height: '26px',
                          display: 'none',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--brass)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                          zIndex: 5
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    )}

                    {/* Bubble Options Dropdown Menu */}
                    {isMenuOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(12px)',
                          [isSelf ? 'left' : 'right']: '0px',
                          background: 'var(--surface-bg)',
                          border: '1.5px solid var(--border-color)',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                          padding: '6px 0',
                          zIndex: 20,
                          minWidth: '120px'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.text || '');
                            setActiveMsgMenuId(null);
                          }}
                          style={{
                            display: 'block', width: '100%', padding: '8px 16px',
                            background: 'none', border: 'none', textAlign: 'left',
                            fontSize: '12.5px', cursor: 'pointer', color: 'var(--ink)',
                            fontFamily: 'var(--font-sans)', transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          Copy Text
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(m.id);
                            setActiveMsgMenuId(null);
                          }}
                          style={{
                            display: 'block', width: '100%', padding: '8px 16px',
                            background: 'none', border: 'none', textAlign: 'left',
                            fontSize: '12.5px', cursor: 'pointer', color: 'var(--danger-color, #d94a43)',
                            fontFamily: 'var(--font-sans)', transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,74,67,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          Delete Message
                        </button>
                      </div>
                    )}
                  </div>

                  {/* INLINE TIMESTAMP */}
                  <div style={{ fontSize: '10.5px', color: 'var(--brass)', marginTop: '4px', opacity: 0.8, padding: '0 4px', fontWeight: '600' }}>
                    {formatTime(m.createdAt)}
                  </div>
                </div>

                {isSelf && <div style={{ marginTop: '2px' }}><Avatar user={currentUser} size={36} /></div>}
              </div>
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Image Preview bar before sending */}
      {imagePreview && (
        <div style={{
          padding: '12px 24px',
          background: 'var(--surface-bg)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}>
          <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={() => setImagePreview(null)}
              style={{
                position: 'absolute', top: 2, right: 2,
                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', padding: 0
              }}
            >
              <X size={10} />
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Image selected. Type a message or click send.
          </div>
        </div>
      )}

      {/* Send Input Bar */}
      <form onSubmit={handleSend} style={{
        display: 'flex', gap: '8px', padding: '16px 24px 20px',
        background: 'var(--surface-bg)', flexShrink: 0,
        borderTop: '1px solid var(--border-color)',
        alignItems: 'center'
      }}>
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            width: '40px', height: '40px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--brass)', transition: 'background 0.2s', flexShrink: 0
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          title="Share an image"
        >
          <Image size={18} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <input
          ref={inputRef}
          type="text"
          placeholder={imagePreview ? "Add a caption..." : `Message ${friendName}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{
            flex: 1, padding: '11px 18px', borderRadius: '24px',
            border: '1.5px solid var(--border-color)',
            background: 'var(--bg-color)', color: 'var(--ink)',
            fontFamily: 'var(--font-sans)', fontSize: '13.5px',
            outline: 'none', transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-color)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />

        <button
          type="submit"
          disabled={(!input.trim() && !imagePreview) || sending}
          style={{
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: (input.trim() || imagePreview) && !sending ? 'var(--accent-color, #b33533)' : 'rgba(0,0,0,0.08)',
            border: 'none', color: (input.trim() || imagePreview) && !sending ? '#fff' : 'rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (input.trim() || imagePreview) && !sending ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: (input.trim() || imagePreview) && !sending ? '0 4px 10px rgba(179,53,51,0.2)' : 'none'
          }}
        >
          <Send size={15} />
        </button>
      </form>

      <style>{`
      `}</style>
    </div>
  );
}

// ─── Friend Card (list item) ──────────────────────────────────────────────────
function FriendCard({ friend, active, onClick }) {
  const name = friend.name || friend.username || 'Reader';
  const book = friend.currentBook;
  const isUnseen = friend.unreadCount > 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderRadius: '14px',
        background: active ? 'rgba(0,0,0,0.04)' : 'var(--surface-bg)',
        border: active ? '1.5px solid var(--accent-color)' : '1.5px solid var(--border-color)',
        cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: active ? '0 4px 12px rgba(0,0,0,0.05)' : '0 2px 6px rgba(0,0,0,0.02)'
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--accent-color)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.transform = '';
        }
      }}
    >
      <Avatar user={friend} size={42} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: isUnseen ? '800' : '700',
          fontSize: '13.5px',
          color: 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {name}
          {isUnseen && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--accent-color, #b33533)', display: 'inline-block'
            }} />
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--brass)', marginBottom: '2px' }}>
          @{friend.username || 'reader'}
        </div>
        {book ? (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
            <BookOpen size={10} style={{ flexShrink: 0, color: 'var(--brass)' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Reading <strong>{book.title}</strong>
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No active reading
          </div>
        )}
      </div>

      {/* Message action/badge count container */}
      <div style={{ flexShrink: 0 }}>
        {isUnseen ? (
          <div style={{
            minWidth: '22px', height: '22px', padding: '0 6px', borderRadius: '11px',
            background: 'var(--accent-color, #b33533)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '10.5px', fontWeight: '800',
            boxShadow: '0 3px 8px rgba(179,53,51,0.3)',
            boxSizing: 'border-box'
          }}>
            {friend.unreadCount}
          </div>
        ) : (
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--accent-light, rgba(179,53,51,0.05))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MessageSquare size={13} style={{ color: 'var(--accent-color)' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main FriendsSection ─────────────────────────────────────────────────────
export default function FriendsSection({ setActiveTab }) {
  const [friends, setFriends] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);

  // Independent loading states
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [teammatesLoading, setTeammatesLoading] = useState(true);

  const [token, setToken] = useState(() => localStorage.getItem('shelf_auth_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shelf_current_user') || 'null'); } catch { return null; }
  });

  const debouncedSearch = useDebounce(searchQuery, 350);

  // Sync auth on switches
  useEffect(() => {
    const sync = () => {
      setToken(localStorage.getItem('shelf_auth_token'));
      try { setCurrentUser(JSON.parse(localStorage.getItem('shelf_current_user') || 'null')); } catch { }
    };
    window.addEventListener('storage', sync);
    window.addEventListener('user-switched', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('user-switched', sync);
    };
  }, []);

  // Handle open-direct-chat events from app
  useEffect(() => {
    const handleOpenChat = (e) => {
      if (e.detail?.user) {
        setSelectedChat(e.detail.user);
        localStorage.removeItem('shelf_pending_chat_target');
      }
    };
    const pendingRaw = localStorage.getItem('shelf_pending_chat_target');
    if (pendingRaw) {
      try { setSelectedChat(JSON.parse(pendingRaw)); } catch { }
      localStorage.removeItem('shelf_pending_chat_target');
    }
    window.addEventListener('open-direct-chat', handleOpenChat);
    return () => window.removeEventListener('open-direct-chat', handleOpenChat);
  }, []);

  // Fetch accepted friends
  const fetchFriends = useCallback(async () => {
    if (!token) { setFriends([]); setFriendsLoading(false); return; }
    try {
      const res = await fetchWithTimeout('/api/friends', {
        headers: { Authorization: `Bearer ${token}` }
      }, 8000);
      if (res.ok) {
        const d = await res.json();
        setFriends(d.friends || []);
      }
    } catch {
    } finally {
      setFriendsLoading(false);
    }
  }, [token]);

  // Fetch cohort teammates
  const fetchTeammates = useCallback(async () => {
    if (!token) { setTeammates([]); setTeammatesLoading(false); return; }
    try {
      const res = await fetchWithTimeout('/api/teammates/mutual', {
        headers: { Authorization: `Bearer ${token}` }
      }, 8000);
      if (res.ok) {
        const d = await res.json();
        setTeammates(d.teammates || []);
      }
    } catch {
    } finally {
      setTeammatesLoading(false);
    }
  }, [token]);

  // Load and poll list data
  useEffect(() => {
    setFriendsLoading(true);
    setTeammatesLoading(true);
    fetchFriends();
    fetchTeammates();

    // Poll contacts list every 8 seconds to clear read badges rapidly
    const interval = setInterval(() => {
      fetchFriends();
      fetchTeammates();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchFriends, fetchTeammates]);

  // User search
  useEffect(() => {
    if (debouncedSearch.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    setSearchLoading(true);
    fetchWithTimeout(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }, 8000)
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => {
        if (!cancelled) {
          setSearchResults((d.users || []).filter(u => u.id !== currentUser?.id));
        }
      })
      .catch(() => { if (!cancelled) setSearchResults([]); })
      .finally(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, token, currentUser?.id]);

  // Merge contacts
  const allChattable = useMemo(() => {
    const selfId = currentUser?.id;
    const seen = new Set();
    const merged = [];
    for (const f of friends) {
      if (!seen.has(f.id) && f.id !== selfId) { seen.add(f.id); merged.push(f); }
    }
    for (const t of teammates) {
      if (!seen.has(t.id) && t.id !== selfId) { seen.add(t.id); merged.push(t); }
    }
    return merged;
  }, [friends, teammates, currentUser?.id]);

  const sidebarLoading = friendsLoading || teammatesLoading;
  const isSearchMode = searchQuery.length >= 2;

  const filteredList = useMemo(() => {
    if (isSearchMode) return [];
    return allChattable;
  }, [allChattable, isSearchMode]);

  // Clear unreadCount locally when active chat changes
  const handleSelectChat = (friend) => {
    setSelectedChat(friend);
    // Mark as read in local state immediately so badge clears instantly
    setFriends(prev => prev.map(f => f.id === friend.id ? { ...f, unreadCount: 0 } : f));
    setTeammates(prev => prev.map(t => t.id === friend.id ? { ...t, unreadCount: 0 } : t));
  };

  return (
    <div style={{
      marginLeft: '80px',
      flex: 1,
      width: 'calc(100% - 80px)',
      height: '100vh',
      background: 'var(--bg-color, #f5f4ee)',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      overflow: 'hidden'
    }} className="split-chat-container">

      {/* LEFT SIDEBAR PANEL (Contacts/List) */}
      <div style={{
        width: '360px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--surface-bg)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0
      }} className={`chat-left-pane ${selectedChat ? 'chat-pane-hidden-mobile' : ''}`}>

        {/* Sidebar Header */}
        <div style={{
          padding: '24px 20px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--surface-bg)',
          flexShrink: 0
        }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: '700',
            color: 'var(--ink)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <Users size={18} style={{ color: 'var(--brass)' }} />
            Direct Conversations
          </h2>

          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--brass)', pointerEvents: 'none'
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search or find new readers..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px 9px 36px', border: '1.5px solid transparent',
                borderRadius: '20px', background: 'rgba(0,0,0,0.05)',
                fontFamily: 'var(--font-sans)', fontSize: '13px',
                color: 'var(--ink)', outline: 'none', transition: 'all 0.2s'
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.background = 'var(--surface-bg)'; }}
              onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'rgba(0,0,0,0.05)'; }}
            />
          </div>
        </div>

        {/* Contacts List Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {!token ? (
            <div style={{
              padding: '24px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px dashed var(--border-color)'
            }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔐</div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--ink)', marginBottom: '4px' }}>Sign in to chat</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Log in to talk with other readers.</div>
            </div>
          ) : isSearchMode ? (
            // Search Mode Results
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 4px 4px' }}>
                Search Results
              </div>
              {searchLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', padding: '0 6px' }}>
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0 6px' }}>
                  No readers found matching "{searchQuery}"
                </div>
              ) : (
                searchResults.map(u => (
                  <FriendCard
                    key={u.id}
                    friend={u}
                    active={selectedChat?.id === u.id}
                    onClick={() => handleSelectChat(u)}
                  />
                ))
              )}
            </>
          ) : sidebarLoading && filteredList.length === 0 ? (
            // Loading Mode
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', padding: '0 6px' }}>
              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--brass)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Loading contacts...
            </div>
          ) : filteredList.length === 0 ? (
            // Empty State
            <div style={{
              padding: '24px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.01)', borderRadius: '16px', border: '1px dashed var(--border-color)'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}><BookUser /></div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--ink)', marginBottom: '4px' }}>No contacts yet</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Search for readers by name above to start a conversation.
              </div>
            </div>
          ) : (
            // Render all list items
            filteredList.map(u => (
              <FriendCard
                key={u.id}
                friend={u}
                active={selectedChat?.id === u.id}
                onClick={() => handleSelectChat(u)}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT CHAT CONTENT CONVERSATION PANEL */}
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }} className={`chat-right-pane ${!selectedChat ? 'chat-pane-hidden-mobile' : ''}`}>
        {selectedChat ? (
          <ChatView
            friend={selectedChat}
            currentUser={currentUser}
            token={token}
            onBack={() => setSelectedChat(null)}
          />
        ) : (
          /* Empty Chat State (No conversation active) */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'var(--option-bg, #f7f3e9)',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'var(--surface-bg)', border: '1.5px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)', marginBottom: '24px',
              animation: 'bounceSlow 4s ease-in-out infinite'
            }}>
              <MessageSquare size={48} style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
            </div>

            <h3 style={{
              fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '22px', fontWeight: '700',
              color: 'var(--ink)', margin: '0 0 10px 0'
            }}>
              Your Library Chatroom
            </h3>

            <p style={{
              fontSize: '13.5px', color: 'var(--text-secondary)',
              maxWidth: '360px', lineHeight: 1.6, margin: 0
            }}>
              Select a conversation from the sidebar to view messages, share ideas, and exchange book progress reports!
            </p>
          </div>
        )}
      </div>

      {/* Styled Responsive Rules and Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .chat-image:hover {
          transform: scale(1.02);
        }

        /* Mobile Responsive View overrides */
        @media (max-width: 768px) {
          .split-chat-container {
            margin-left: 0 !important;
            padding-bottom: 60px; /* Leave space for bottom nav bar if any */
          }
          .chat-left-pane {
            width: 100% !important;
          }
          .chat-right-pane {
            width: 100% !important;
          }
          .chat-pane-hidden-mobile {
            display: none !important;
          }
          .chat-back-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
