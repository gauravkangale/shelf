import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserMinus, ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { applyTheme, DEFAULT_THEME_KEY } from '../utils/themePresets';

export default function UserProfilePage({ targetUsername }) {
  const [profile, setProfile] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('shelf_auth_token');
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('shelf_current_user') || 'null');
    } catch {
      return null;
    }
  })();

  const isSelf = currentUser && currentUser.username?.toLowerCase() === targetUsername.toLowerCase();

  // Apply saved theme settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('shelf_theme_key') || DEFAULT_THEME_KEY;
    const savedTextTone = localStorage.getItem('shelf_text_tone') || 'standard';
    const savedOverrides = JSON.parse(localStorage.getItem('shelf_theme_overrides') || '{}');
    applyTheme(savedTheme, savedTextTone, savedOverrides);
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/profile/${targetUsername}`, { headers });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('User not found');
        }
        throw new Error('Failed to load profile');
      }

      const data = await res.json();
      setProfile(data.user);
      setFriendshipStatus(data.friendshipStatus || 'none');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetUsername) {
      fetchProfile();
    }
  }, [targetUsername]);

  const handleSendRequest = async () => {
    if (!token) {
      window.location.href = `/login.html?redirect=/u/${targetUsername}`;
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendId: profile.id })
      });
      if (res.ok) {
        setFriendshipStatus('pending_outgoing');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to send request');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/friends/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendId: profile.id, action: 'accept' })
      });
      if (res.ok) {
        setFriendshipStatus('accepted');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to accept friend request');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!window.confirm(`Are you sure you want to remove ${profile.name || profile.username} from your friends?`)) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/friends/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendId: profile.id })
      });
      if (res.ok) {
        setFriendshipStatus('none');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to remove friend');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-color)' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--rust)', marginBottom: '16px' }} />
        <span style={{ fontSize: '15px', color: 'var(--brass)', fontFamily: 'var(--sans)' }}>Opening borrower files...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-color)', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--library-card-bg)', border: '1px solid var(--library-card-border)', padding: '32px', borderRadius: '4px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '22px', color: 'var(--rust)', marginBottom: '12px' }}>Borrower Record Not Found</h2>
          <p style={{ color: 'var(--brass)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
            {error === 'User not found' ? `The user "${targetUsername}" does not exist in our library files.` : 'Failed to retrieve public borrower record.'}
          </p>
          <button onClick={() => window.location.href = '/'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
            <ArrowLeft size={16} /> Return Home
          </button>
        </div>
      </div>
    );
  }

  const profileUrl = `${window.location.origin}/u/${profile.username.trim().toLowerCase()}`;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      padding: '24px 16px',
      boxSizing: 'border-box',
      userSelect: 'none'
    }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>
        {/* Vintage Library Card */}
        <div className="library-card" style={{
          background: 'var(--library-card-bg)',
          border: '1px solid var(--library-card-border)',
          borderTop: '8px solid var(--rust)',
          borderRadius: '4px',
          padding: '24px 32px 32px 32px',
          boxShadow: '0 12px 35px rgba(110, 90, 70, 0.15)',
          position: 'relative',
          fontFamily: 'var(--sans)',
          color: 'var(--message-other-text)'
        }}>
          {/* Card Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid var(--rust)',
            paddingBottom: '12px',
            marginBottom: '28px'
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--serif)',
                fontSize: '18px',
                fontWeight: '700',
                letterSpacing: '0.05em',
                color: 'var(--rust)',
                textTransform: 'uppercase'
              }}>Shelf Public Library</div>
              <div style={{
                fontSize: '11px',
                color: 'var(--brass)',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                marginTop: '2px'
              }}>Official Borrower Card</div>
            </div>

            {/* Profile QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
              <div style={{
                width: '68px',
                height: '68px',
                border: '1px solid var(--library-card-border)',
                padding: '3px',
                background: '#fff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '2px'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&color=2b2927&bgcolor=ffffff&margin=0&data=${encodeURIComponent(profileUrl)}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt="Profile QR Code"
                />
              </div>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--brass)', marginTop: '2px' }}>
                ID-{profile.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Borrower Info & Avatar */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '32px' }}>
            {/* Stapled Avatar Photo */}
            <div style={{
              position: 'relative',
              width: '100px',
              height: '115px',
              padding: '6px 6px 16px 6px',
              background: '#fcfbf7',
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
              transform: 'rotate(-1.5deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flexShrink: 0
            }}>
              {/* Staple representation */}
              <div style={{
                position: 'absolute',
                top: '-4px',
                width: '28px',
                height: '8px',
                background: '#b0b5bc',
                borderRadius: '1px',
                opacity: 0.8,
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)',
                transform: 'rotate(2deg)'
              }} />
              <img
                src={profile.avatar_url || '/profile.jpeg'}
                onError={(e) => { e.target.src = '/profile.jpeg'; }}
                alt="Avatar"
                style={{ width: '100%', height: '84px', objectFit: 'cover', background: '#eee' }}
              />
              <div style={{ fontSize: '7px', color: 'var(--brass)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Photo Verified
              </div>
            </div>

            {/* Info Text Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brass)', fontWeight: 600, marginBottom: '2px' }}>Borrower Name</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '3px' }}>
                  {profile.name || 'Anonymous Reader'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brass)', fontWeight: 600, marginBottom: '2px' }}>Username</div>
                <div style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--rust)', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '3px' }}>
                  @{profile.username}
                </div>
              </div>

              {profile.bio && (
                <div>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brass)', fontWeight: 600, marginBottom: '2px' }}>Personal Bio</div>
                  <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    "{profile.bio}"
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--library-card-border)', paddingTop: '20px' }}>
            <button
              onClick={() => { window.location.href = '/'; }}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={14} /> Go to Dashboard
            </button>

            {isSelf ? (
              <span style={{ fontSize: '13px', color: 'var(--brass)', fontWeight: 600 }}>This is your card</span>
            ) : !token ? (
              <button
                onClick={() => { window.location.href = `/login.html?redirect=/u/${profile.username}`; }}
                style={{
                  background: 'var(--rust)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <LogIn size={14} /> Login to Connect
              </button>
            ) : friendshipStatus === 'accepted' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(46, 125, 50, 0.1)',
                  color: '#2e7d32',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  <UserCheck size={14} /> Friends
                </span>
                <button
                  onClick={handleUnfriend}
                  disabled={actionLoading}
                  style={{
                    background: 'transparent',
                    border: '1px solid #d32f2f',
                    color: '#d32f2f',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserMinus size={14} /> Remove
                </button>
              </div>
            ) : friendshipStatus === 'pending_outgoing' ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(230, 81, 0, 0.1)',
                color: '#e65100',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600
              }}>
                Request Sent
              </span>
            ) : friendshipStatus === 'pending_incoming' ? (
              <button
                onClick={handleAcceptRequest}
                disabled={actionLoading}
                style={{
                  background: '#2e7d32',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <UserCheck size={14} /> Accept Request
              </button>
            ) : (
              <button
                onClick={handleSendRequest}
                disabled={actionLoading}
                style={{
                  background: 'var(--rust)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Add Friend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
