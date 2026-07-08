  // eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { X, UserCheck, MessageSquare, Clock, UserPlus } from 'lucide-react';
import Avatar from './Avatar';

export function ProfileModal({ user, onClose, currentUserId, onFriendAction }) {
  const [friendStatus, setFriendStatus] = useState(user.friendship_status || 'none');
  const [loading, setLoading] = useState(false);
  const [isHoveredCancel, setIsHoveredCancel] = useState(false);
  const name = user.name || user.username || 'Reader';
  const profileUrl = `${window.location.origin}/u/${(user.username || 'reader').toLowerCase()}`;

  useEffect(() => {
    // If the user object didn't strictly provide friendship_status, or to be safe, fetch it directly
    const fetchStatus = async () => {
      try {
        const tk = localStorage.getItem('shelf_auth_token');
        if (!tk || user.id === currentUserId) return;

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/friends/status`, {
          headers: { Authorization: `Bearer ${tk}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.friends?.some(f => String(f.id) === String(user.id))) {
            setFriendStatus('accepted');
          } else if (data.pendingIncoming?.some(f => String(f.id) === String(user.id))) {
            setFriendStatus('pending_received');
          } else if (data.pendingOutgoing?.some(f => String(f.id) === String(user.id))) {
            setFriendStatus('pending_sent');
          } else {
            setFriendStatus('none');
          }
        }
      } catch (e) {
        console.error('Failed to fetch friend status', e);
      }
    };

    if (user.friendship_status === undefined) {
      fetchStatus();
    }
  }, [user.id, currentUserId, user.friendship_status]);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ friendId: user.id }),
      });
      if (res.ok) {
        setFriendStatus('pending_sent');
        onFriendAction?.(user.id, 'pending_sent');
      }
  // eslint-disable-next-line no-empty
    } catch { } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const tk = localStorage.getItem('shelf_auth_token');
      if (!tk) return;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/friends/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ friendId: user.id }),
      });
      if (res.ok) {
        setFriendStatus('none');
        onFriendAction?.(user.id, 'none');
      }
  // eslint-disable-next-line no-empty
    } catch { } finally { setLoading(false); }
  };

  const book = user.currentBook || null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.15s ease'
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--library-card-bg, #fcfaf2)',
          border: '1px solid var(--library-card-border, #c8b99a)',
          borderTop: '8px solid var(--rust, #b33533)',
          borderRadius: '6px',
          padding: '28px 32px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          maxWidth: '380px', width: '90vw',
          fontFamily: 'var(--font-sans)',
          position: 'relative',
          animation: 'slideUp 0.2s ease'
        }}
      >
        <button onClick={onClose} style={{
          position: 'absolute', top: '12px', right: '14px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', opacity: 0.6, fontSize: '18px'
        }}>×</button>

        {/* Card header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif, Georgia)', fontSize: '14px', fontWeight: '700', color: 'var(--rust, #b33533)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Shelf Public Library
            </div>
            <div style={{ fontSize: '10px', color: 'var(--brass)', fontFamily: 'monospace', textTransform: 'uppercase', margin: '4px 0 0' }}>
              Official Borrower Card
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=56x56&color=2b2927&bgcolor=fcfaf2&margin=0&data=${encodeURIComponent(profileUrl)}`}
              style={{ width: '56px', height: '56px', border: '1px solid var(--library-card-border)' }}
              alt="QR"
            />
            <div style={{ fontSize: '8px', fontFamily: 'monospace', color: 'var(--brass)', marginTop: '2px' }}>
              {user.id ? `ID-${user.id.slice(0, 8).toUpperCase()}` : 'GUEST'}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '2px solid var(--rust, #b33533)', paddingTop: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Photo */}
          <div style={{
            width: '80px', height: '96px', flexShrink: 0,
            border: '1.5px solid var(--library-card-border)', background: '#eae6d9',
            padding: '3px', borderRadius: '2px', boxShadow: '2px 4px 10px rgba(0,0,0,0.08)',
            transform: 'rotate(-1.5deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
          }}>
            <Avatar user={user} size={74} />
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif, Georgia)', fontSize: '18px', fontWeight: '700', color: 'var(--ink)', marginBottom: '2px', textTransform: 'uppercase' }}>{name}</div>
            {user.username && (
              <div style={{ fontSize: '13px', color: 'var(--brass)', fontFamily: 'monospace', marginBottom: '14px' }}>@{user.username}</div>
            )}

            {user.bio && (
              <div style={{ fontSize: '13px', color: 'var(--brass)', fontFamily: 'monospace', marginBottom: '14px' }}>{user.bio}</div>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div style={{ fontSize: '10px', color: 'var(--brass)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Currently Reading</div>
              {book ? (
                <>
                  <div style={{ fontWeight: '700', color: 'var(--ink)', fontSize: '14px', marginBottom: '2px' }}>📖 {book.title}</div>
                  {book.author && <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>by {book.author}</div>}
                  {book.currentPage && book.totalPages && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: 'var(--ink)' }}>
                        <span>Page {book.currentPage}</span>
                        <span>{Math.round((book.currentPage / book.totalPages) * 100)}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (book.currentPage / book.totalPages) * 100)}%`, height: '100%', background: 'var(--rust, #b33533)' }} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No reading activity yet</div>
              )}
            </div>

            {/* Action button */}
            {user.id !== currentUserId && (
              <div style={{ marginTop: '20px' }}>
                {friendStatus === 'accepted' ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button disabled style={{ padding: '8px 16px', borderRadius: '16px', border: '1.5px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'default', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={14} /> Friends
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        const targetUser = {
                          id: user.id,
                          name: user.name || user.username,
                          username: user.username,
                          avatar_url: user.avatar_url || user.avatar,
                          friendship_status: friendStatus
                        };
                        try {
                          localStorage.setItem('shelf_active_chat_user', JSON.stringify(targetUser));
                        } catch (e) {
                          console.warn('LocalStorage error:', e);
                        }
                        window.dispatchEvent(new CustomEvent('open-direct-chat', { detail: { user: targetUser } }));
                        window.location.hash = `library/chat/${user.id}`;
                      }}
                      style={{
                        padding: '8px 18px', borderRadius: '16px', border: 'none',
                        background: 'var(--accent-color, #b33533)', color: '#fff',
                        fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <MessageSquare size={14} /> Message
                    </button>
                  </div>
                ) : friendStatus === 'pending_sent' ? (
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    onMouseEnter={() => setIsHoveredCancel(true)}
                    onMouseLeave={() => setIsHoveredCancel(false)}
                    style={{
                      padding: '8px 18px', borderRadius: '16px',
                      border: '1.5px solid var(--border-color)',
                      background: isHoveredCancel ? 'rgba(217, 74, 67, 0.1)' : 'transparent',
                      color: isHoveredCancel ? 'var(--danger-color)' : 'var(--text-secondary)',
                      fontSize: '13px', fontWeight: '600', cursor: loading ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isHoveredCancel ? <X size={14} /> : <Clock size={14} />}
                    {isHoveredCancel ? 'Cancel' : 'Pending'}
                  </button>
                ) : friendStatus === 'pending_received' ? (
                  <button
                    onClick={handleAdd}
                    disabled={loading}
                    style={{
                      padding: '8px 18px', borderRadius: '16px', border: 'none',
                      background: 'var(--accent-color, #b33533)', color: '#fff',
                      fontSize: '13px', fontWeight: '700', cursor: loading ? 'default' : 'pointer'
                    }}
                  >
                    Accept Request
                  </button>
                ) : (
                  <button
                    onClick={handleAdd} disabled={loading}
                    style={{
                      padding: '8px 20px', borderRadius: '16px', border: 'none',
                      background: 'var(--accent-color, #b33533)', color: '#fff',
                      fontSize: '13px', fontWeight: '700', cursor: loading ? 'default' : 'pointer',
                      opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <UserPlus size={14} /> Add Friend
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;