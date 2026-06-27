import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Plus, ChevronUp, ChevronDown, MessageSquare,
  Users, X, Send, UserPlus, MoreHorizontal, Bell,
  BookOpen, Check, ArrowUpRight, Copy
} from 'lucide-react';
import { cachedFetch, invalidateCache, getCached } from '../utils/apiCache';

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

// ── Wing Icon for chat bubbles ────────────────────────────────────────────────
const WingIcon = ({ isLeft, color }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{
      transform: isLeft ? 'scaleX(1)' : 'scaleX(-1)',
      opacity: 0.8,
      margin: '0 4px',
      alignSelf: 'center'
    }}
  >
    <path d="M12 12c-2-3-6-4-10-2 1.5 3 4 5 7 5 3 0 5-1 5-3Z" fill={`${color}15`} />
    <path d="M12 12c-1.5-2.5-4.5-3.5-7.5-2 1 2.5 3 4 5.5 4 2 0 3.5-.5 3.5-1.5Z" />
    <path d="M12 12c-1-2-3-2.5-5-1.5.5 1.5 1.5 2.5 3.5 2.5 1.5 0 2-.5 2-1Z" />
  </svg>
);

// ── Book Cover Themes ─────────────────────────────────────────────────────────
const THEMES = [
  {
    bg: 'linear-gradient(170deg, #0d0b26 0%, #1a1650 45%, #251e7a 100%)',
    spine: '#080620', accent: '#c9a96e', glowColor: 'rgba(201,169,110,0.2)',
    ornament: '✦', borderColor: 'rgba(201,169,110,0.35)'
  },
  {
    bg: 'linear-gradient(170deg, #1a0404 0%, #5c0e0e 45%, #8b1717 100%)',
    spine: '#0d0202', accent: '#e8c87a', glowColor: 'rgba(232,200,122,0.18)',
    ornament: '❧', borderColor: 'rgba(232,200,122,0.35)'
  },
  {
    bg: 'linear-gradient(170deg, #031409 0%, #0d3d1c 45%, #165e2e 100%)',
    spine: '#010a04', accent: '#a8d8b8', glowColor: 'rgba(168,216,184,0.15)',
    ornament: '✿', borderColor: 'rgba(168,216,184,0.35)'
  },
  {
    bg: 'linear-gradient(170deg, #150d02 0%, #432900 45%, #6e4410 100%)',
    spine: '#0a0601', accent: '#f0ca7a', glowColor: 'rgba(240,202,122,0.18)',
    ornament: '◈', borderColor: 'rgba(240,202,122,0.35)'
  },
  {
    bg: 'linear-gradient(170deg, #050520 0%, #12124a 45%, #1e1e70 100%)',
    spine: '#020210', accent: '#9ab4f8', glowColor: 'rgba(154,180,248,0.15)',
    ornament: '⟡', borderColor: 'rgba(154,180,248,0.3)'
  },
  {
    bg: 'linear-gradient(170deg, #12021a 0%, #3d0c50 45%, #65207a 100%)',
    spine: '#08010e', accent: '#e0b0f0', glowColor: 'rgba(224,176,240,0.15)',
    ornament: '✧', borderColor: 'rgba(224,176,240,0.3)'
  },
];

// ── Book Cover (with optional cursor-reactive 3D tilt) ───────────────────────
function BookCover({ group, index, width = 140, height = 210, tilt = false, reactive = false }) {
  const t = THEMES[index % THEMES.length];
  const memberCount = group?.members?.length || 0;
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const bookRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!reactive || !bookRef.current) return;
    const rect = bookRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);   // -1 to 1
    const dy = (e.clientY - cy) / (rect.height / 2);  // -1 to 1
    setRot({ x: -dy * 18, y: dx * 22 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRot({ x: 0, y: 0 });
  };

  const baseTransform = tilt
    ? `perspective(900px) rotateY(-12deg) rotateX(2deg)`
    : 'none';

  const reactiveTransform = reactive && isHovered
    ? `perspective(800px) rotateX(${rot.x}deg) rotateY(${rot.y}deg) scale(1.04)`
    : reactive
    ? `perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)`
    : baseTransform;

  return (
    <div
      ref={bookRef}
      onMouseMove={reactive ? handleMouseMove : undefined}
      onMouseEnter={reactive ? () => setIsHovered(true) : undefined}
      onMouseLeave={reactive ? handleMouseLeave : undefined}
      style={{
        width, height, position: 'relative', flexShrink: 0,
        borderRadius: '3px 10px 10px 3px',
        background: t.bg,
        boxShadow: (tilt || (reactive && isHovered))
          ? `0 30px 70px rgba(0,0,0,0.6), -6px 0 0 ${t.spine}, 10px 0 30px rgba(0,0,0,0.25)`
          : `0 10px 28px rgba(0,0,0,0.35), -4px 0 0 ${t.spine}, 3px 3px 10px rgba(0,0,0,0.2)`,
        transform: reactiveTransform,
        transformOrigin: 'center center',
        overflow: 'hidden',
        border: `1px solid ${t.borderColor}`,
        transition: reactive
          ? 'transform 0.08s ease-out, box-shadow 0.3s ease'
          : 'all 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: reactive ? 'pointer' : 'default',
        willChange: 'transform',
      }}>
      {/* Spine shadow */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 7,
        background: 'linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.05))',
        zIndex: 2
      }} />

      {/* Radial center glow */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: `radial-gradient(ellipse at 55% 45%, ${t.glowColor} 0%, transparent 65%)`
      }} />

      {/* Top horizontal rule */}
      <div style={{
        position: 'absolute', top: height * 0.08, left: width * 0.13, right: width * 0.13,
        height: 1, background: `linear-gradient(to right, transparent, ${t.accent}, transparent)`,
        opacity: 0.6, zIndex: 3
      }} />
      {/* Bottom horizontal rule */}
      <div style={{
        position: 'absolute', bottom: height * 0.08, left: width * 0.13, right: width * 0.13,
        height: 1, background: `linear-gradient(to right, transparent, ${t.accent}, transparent)`,
        opacity: 0.6, zIndex: 3
      }} />

      {/* Oval decorative frame */}
      <div style={{
        position: 'absolute', top: '18%', left: '14%', right: '14%', bottom: '22%',
        border: `1px solid ${t.accent}`, borderRadius: '50%', opacity: 0.2, zIndex: 3
      }} />

      {/* Center ornament */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -55%)',
        fontSize: height * 0.22, color: t.accent,
        opacity: 0.22, zIndex: 3, lineHeight: 1, userSelect: 'none',
        pointerEvents: 'none'
      }}>
        {t.ornament}
      </div>

      {/* Corner decorations */}
      {[
        { top: '8%', left: '14%' }, { top: '8%', right: '14%' },
        { bottom: '9%', left: '14%' }, { bottom: '9%', right: '14%' }
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos, width: 4, height: 4,
          background: t.accent, borderRadius: '50%', opacity: 0.4, zIndex: 3
        }} />
      ))}

      {/* Content overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 4,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: `${height * 0.1}px ${width * 0.12}px`
      }}>
        {/* Top label */}
        <div style={{
          textAlign: 'center', color: t.accent, opacity: 0.85,
          fontSize: Math.max(7, width * 0.065), fontFamily: 'monospace',
          textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: '600'
        }}>
          GROUP
        </div>

        {/* Title */}
        <div style={{
          textAlign: 'center', color: '#ffffff', fontWeight: '700',
          fontSize: Math.max(9, width * 0.09), lineHeight: 1.25,
          textShadow: '0 2px 10px rgba(0,0,0,0.6)',
          fontFamily: 'var(--font-serif, Georgia, serif)'
        }}>
          {group?.name || 'Group'}
        </div>

        {/* Member count */}
        <div style={{
          textAlign: 'center', color: t.accent, opacity: 0.75,
          fontSize: Math.max(7, width * 0.06), fontFamily: 'monospace', letterSpacing: '0.08em'
        }}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </div>
      </div>

      {/* Sheen */}
      <div style={{
        position: 'absolute', top: 0, left: '18%', width: '22%', bottom: 0,
        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent)',
        zIndex: 5, pointerEvents: 'none'
      }} />
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 36 }) {
  const initial = (user?.name || user?.username || '?').charAt(0).toUpperCase();
  const palettes = ['#c41e3a', '#1b3d2f', '#1e355c', '#61461b', '#4a1a5c', '#1a3d4f'];
  const color = palettes[(initial.charCodeAt(0) || 0) % palettes.length];

  if (user?.avatar_url) {
    return (
      <img src={user.avatar_url} alt={user.name || ''}
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

// ── Member ID Card ────────────────────────────────────────────────────────────
function MemberIDCard({ member }) {
  const formattedDate = member.created_at
    ? new Date(member.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown Date';

  const currentBook = member.books || {};
  const hasBook = !!currentBook.title;

  return (
    <div style={{
      background: '#fcfaf2',
      border: '1px solid #d5cebf',
      borderTop: '8px solid #b33933',
      borderRadius: '4px',
      padding: '24px',
      boxShadow: '0 8px 30px rgba(110, 90, 70, 0.15)',
      position: 'relative',
      fontFamily: 'var(--font-sans)',
      color: '#2b2927',
      width: '100%',
      maxWidth: '340px',
      minHeight: '260px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box'
    }}>
      {/* Staple simulation */}
      <div style={{
        position: 'absolute',
        top: '-5px',
        left: '20px',
        width: '20px',
        height: '5px',
        border: '1px solid #7a7263',
        background: '#c5bfb0',
        borderRadius: '1px',
        transform: 'rotate(-4deg)',
        zIndex: 3
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1.5px solid #b33933',
        paddingBottom: '8px',
        marginBottom: '18px'
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            fontWeight: '700',
            color: '#b33933',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Shelf Public Library</div>
          <div style={{
            fontSize: '9px',
            color: '#8a826f',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            marginTop: '1px'
          }}>Official Borrower Card</div>
        </div>
        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#8a826f' }}>
          ID-{member.id ? member.id.slice(0, 8).toUpperCase() : 'GUEST'}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1, marginBottom: '16px' }}>
        {/* Avatar Photo */}
        <div style={{
          width: '74px',
          height: '90px',
          border: '1.5px solid #d5cebf',
          background: '#eae6d9',
          padding: '4px',
          borderRadius: '2px',
          boxShadow: '1px 2px 6px rgba(0,0,0,0.06)',
          transform: 'rotate(-2deg)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {member.avatar_url ? (
            <img src={member.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#b5ae9f' }}>
              {(member.name || member.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#8a826f', textTransform: 'uppercase' }}>Borrower</span>
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#3e3a35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.name || 'Anonymous'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#8a826f', textTransform: 'uppercase' }}>Username</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#b33933' }}>
              @{member.username || 'unknown'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#8a826f', textTransform: 'uppercase' }}>Registered</span>
            <span style={{ fontSize: '11px', color: '#6b6457' }}>
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Currently Reading */}
      <div style={{
        borderTop: '1px dashed #d5cebf',
        paddingTop: '10px',
        marginTop: 'auto'
      }}>
        {hasBook ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#8a826f', marginBottom: '3px' }}>
              <span style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>Current Checkout:</span>
              <span>{currentBook.currentPage} / {currentBook.totalPages} p.</span>
            </div>
            <div style={{ fontWeight: '600', fontSize: '13px', color: '#3e3a35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentBook.title}>
              {currentBook.title}
            </div>
            <div style={{ fontSize: '11px', color: '#8a826f', fontStyle: 'italic' }}>
              by {currentBook.author || 'Unknown'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#8a826f', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
            No active book checkouts.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Group Members Modal ───────────────────────────────────────────────────────
function GroupMembersModal({ group, onClose, initialMember, onRemoveMember, currentUserId }) {
  const [selectedMember, setSelectedMember] = useState(initialMember || group.members?.[0] || null);

  useEffect(() => {
    setSelectedMember(initialMember || group.members?.[0] || null);
  }, [initialMember, group.id]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#ffffff', borderRadius: '20px', padding: '32px',
        maxWidth: '700px', width: '90%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,0.2)', fontFamily: 'var(--font-sans)',
        maxHeight: '85vh', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: '700', color: '#1e2022', margin: 0 }}>
              Group Workspace Info
            </h2>
            <p style={{ fontSize: '13px', color: '#6e7072', margin: '4px 0 0 0' }}>
              {group.name} — {group.members?.length} active {group.members?.length === 1 ? 'member' : 'members'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e7072', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content columns */}
        <div style={{ display: 'flex', gap: '32px', overflow: 'hidden', flex: 1, minHeight: '340px' }}>
          {/* Left list: Members */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#6e7072', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              Select Member to View Card
            </span>
            {group.members?.length === 0 ? (
              <p style={{ color: '#9a9a94', fontSize: '13px', fontStyle: 'italic' }}>No members in this group yet.</p>
            ) : (
              group.members.map(m => {
                const isSelected = selectedMember?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', borderRadius: '12px',
                      cursor: 'pointer', background: isSelected ? '#f5f4ee' : 'transparent',
                      border: isSelected ? '1px solid #e4e3da' : '1px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Avatar user={m} size={36} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#1e2022', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {m.name || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6e7072' }}>
                        @{m.username || 'unknown'}
                      </div>
                    </div>
                    {onRemoveMember && m.id !== currentUserId && (
                      <button
                        type="button"
                        title="Remove member"
                        onClick={(e) => { e.stopPropagation(); onRemoveMember(m.id); }}
                        style={{
                          padding: '4px 8px', fontSize: '10px', fontWeight: '600',
                          background: '#fff5f5', color: '#e85d56', border: '1px solid #f5c6c6',
                          borderRadius: '8px', cursor: 'pointer', flexShrink: 0
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Vertical divider */}
          <div style={{ width: '1px', background: '#f0eee8', alignSelf: 'stretch' }} />

          {/* Right side: Borrower ID Card */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f9f8f4', borderRadius: '16px', padding: '16px' }}>
            {selectedMember ? (
              <MemberIDCard member={selectedMember} />
            ) : (
              <p style={{ color: '#9a9a94', fontSize: '13px', fontStyle: 'italic' }}>Select a member to view details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Group name is required.'); return; }
    setLoading(true); setErr('');
    try {
      const token = localStorage.getItem('shelf_auth_token');
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed to create.'); return; }
      onCreated(data.group);
    } catch { setErr('Network error. Please try again.'); } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#ffffff', borderRadius: '20px', padding: '40px',
        maxWidth: '440px', width: '90%', boxShadow: '0 30px 80px rgba(0,0,0,0.2)',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: '700', color: '#1e2022', margin: 0 }}>
            New Group
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e7072', padding: '4px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#6e7072', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              Group Name *
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Design Team, Book Club..."
              autoFocus maxLength={50}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '13px 16px',
                border: '1.5px solid #e4e3da', borderRadius: '12px',
                fontFamily: 'var(--font-sans)', fontSize: '15px', color: '#1e2022', outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#1e2022'}
              onBlur={e => e.target.style.borderColor = '#e4e3da'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#6e7072', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              Description
            </label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What is this group about?" rows={3} maxLength={200}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '13px 16px',
                border: '1.5px solid #e4e3da', borderRadius: '12px',
                fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#1e2022',
                outline: 'none', resize: 'vertical', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#1e2022'}
              onBlur={e => e.target.style.borderColor = '#e4e3da'}
            />
          </div>
          {err && <p style={{ color: '#e85d56', fontSize: '13px', margin: 0 }}>{err}</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '12px 22px', background: 'transparent', border: '1.5px solid #e4e3da',
              borderRadius: '24px', fontFamily: 'var(--font-sans)', fontSize: '14px',
              cursor: 'pointer', color: '#6e7072', transition: 'all 0.2s'
            }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              padding: '12px 26px', background: loading ? '#6e7072' : '#1e2022',
              color: '#fff', border: 'none', borderRadius: '24px',
              fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
            }}>
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
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
            color: '#1e2022', outline: 'none', transition: 'border-color 0.2s, background 0.2s'
          }}
          onFocus={e => { e.target.style.borderColor = '#1e2022'; e.target.style.background = '#fff'; }}
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
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e2022' }}>
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
          <Bell size={18} style={{ color: '#6e7072' }} />
        </button>
        {rightAction}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FriendsSection({ setActiveTab }) {
  const [groups, setGroups] = useState(() => {
    const initToken = localStorage.getItem('shelf_auth_token');
    if (initToken) {
      const cached = getCached('/api/groups', { headers: { 'Authorization': `Bearer ${initToken}` } });
      if (cached && cached.groups) return cached.groups;
    }
    return [];
  });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(groups.length === 0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [shelfSearch, setShelfSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [quickReplyTo, setQuickReplyTo] = useState(null);
  const [directRecipient, setDirectRecipient] = useState(null);
  const [directMsg, setDirectMsg] = useState('');
  const [directSendLoading, setDirectSendLoading] = useState(false);
  const [directSendStatus, setDirectSendStatus] = useState('');
  const chatEndRef = useRef(null);
  const shelfRef = useRef(null);
  const searchInputRef = useRef(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedMemberForModal, setSelectedMemberForModal] = useState(null);
  const [showFeaturedMenu, setShowFeaturedMenu] = useState(false);

  const debouncedMemberSearch = useDebounce(memberSearch, 350);
  const [token, setToken] = useState(() => localStorage.getItem('shelf_auth_token'));

  // ── Current user (fetched from API so it's always accurate) ─────────────────
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shelf_current_user') || 'null'); } catch { return null; }
  });
  const currentUserId = currentUser?.id;

  useEffect(() => {
    const handleSync = () => {
      setToken(localStorage.getItem('shelf_auth_token'));
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('shelf_current_user') || 'null'));
      } catch {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('reader-activity-updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('reader-activity-updated', handleSync);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setCurrentUser(data.user);
          // Cache for next render
          localStorage.setItem('shelf_current_user', JSON.stringify(data.user));
        }
      })
      .catch(() => {});
  }, [token]);

  // ── Fetch groups ────────────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    const freshToken = localStorage.getItem('shelf_auth_token');
    if (!freshToken) { setGroups([]); setLoading(false); return; }
    try {
      const data = await cachedFetch('/api/groups', { headers: { 'Authorization': `Bearer ${freshToken}` } }, 25000);
      const g = data.groups || [];
      setGroups(g);
      if (selectedGroup) {
        const updated = g.find(x => x.id === selectedGroup.id);
        if (updated) setSelectedGroup(updated);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [token, selectedGroup?.id]);

  useEffect(() => {
    fetchGroups();
    const iv = setInterval(fetchGroups, 60000);
    const onUserSwitched = () => {
      invalidateCache('/api/groups');
      fetchGroups();
    };
    window.addEventListener('user-switched', onUserSwitched);
    return () => {
      clearInterval(iv);
      window.removeEventListener('user-switched', onUserSwitched);
    };
  }, [token]);  // re-run when token changes (login/logout)

  // ── Member search ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedGroup || debouncedMemberSearch.length < 2) { setMemberResults([]); return; }
    const run = async () => {
      setMemberSearchLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedMemberSearch)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setMemberResults((await res.json()).users || []);
      } catch {} finally { setMemberSearchLoading(false); }
    };
    run();
  }, [debouncedMemberSearch, token, selectedGroup?.id]);

  // ── Chat ────────────────────────────────────────────────────────────────────
  const fetchMessages = async (groupId) => {
    try {
      const res = await fetch(`/api/chat/group/${groupId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setChatMessages((await res.json()).messages || []);
    } catch {}
  };

  useEffect(() => {
    if (!selectedGroup || !showChat) return;
    fetchMessages(selectedGroup.id);
    const iv = setInterval(() => fetchMessages(selectedGroup.id), 8000);
    return () => clearInterval(iv);
  }, [selectedGroup?.id, showChat]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    if (!selectedGroup) {
      setDirectRecipient(null);
      setDirectMsg('');
      setDirectSendStatus('');
      return;
    }
    const defaultRecipient = selectedGroup.members?.find(m => m.id !== currentUserId) || selectedGroup.members?.[0] || null;
    setDirectRecipient(defaultRecipient);
    setDirectMsg('');
    setDirectSendStatus('');
  }, [selectedGroup?.id, selectedGroup?.members?.length, currentUserId]);

  const handleSendDirect = async (e) => {
    e.preventDefault();
    if (!directRecipient || !directMsg.trim()) return;
    setDirectSendLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ receiverId: directRecipient.id, messageText: directMsg.trim() })
      });
      if (res.ok) {
        setDirectMsg('');
        setDirectSendStatus(`Message sent to ${directRecipient.name || directRecipient.username || 'member'}`);
      } else {
        setDirectSendStatus('Failed to send direct message.');
      }
    } catch {
      setDirectSendStatus('Failed to send direct message.');
    } finally {
      setDirectSendLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedGroup) return;
    const text = newMsg.trim(); setNewMsg('');
    try {
      const res = await fetch('/api/chat/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ groupId: selectedGroup.id, messageText: text })
      });
      if (res.ok) {
        const d = await res.json();
        if (d.message) setChatMessages(p => [...p, d.message]);
        setQuickReplyTo(null);
      }
    } catch {}
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ groupId: selectedGroup.id })
      });
      if (res.ok) { invalidateCache('/api/groups'); await fetchGroups(); window.dispatchEvent(new Event('reader-activity-updated')); }
    } catch {}
  };

  const handleAddMember = async (userId) => {
    if (!selectedGroup) return;
    setMemberActionLoading(true);
    try {
      const res = await fetch('/api/groups/members/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ groupId: selectedGroup.id, userId })
      });
      if (res.ok) { invalidateCache('/api/groups'); await fetchGroups(); setMemberSearch(''); setMemberResults([]); }
    } catch {} finally { setMemberActionLoading(false); }
  };

  const navigateGroup = (dir) => {
    const ni = Math.max(0, Math.min(groups.length - 1, selectedIdx + dir));
    setSelectedIdx(ni);
    setSelectedGroup(groups[ni]);
    setShowChat(false); setChatMessages([]);
    setMemberSearch(''); setMemberResults([]);
  };

  const handleSelectGroup = (group, idx) => {
    setSelectedGroup(group); setSelectedIdx(idx);
    setShowChat(false); setChatMessages([]);
    setMemberSearch(''); setMemberResults([]);
    setShowMoreMenu(false);
  };

  const handleCopyGroupId = () => {
    if (!selectedGroup?.id) return;
    navigator.clipboard.writeText(selectedGroup.id).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {});
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        invalidateCache('/api/groups');
        setShowMoreMenu(false);
        setSelectedGroup(null);
        setShowChat(false);
        await fetchGroups();
        window.dispatchEvent(new Event('reader-activity-updated'));
      }
    } catch {}
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedGroup) return;
    try {
      const res = await fetch('/api/groups/members/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ groupId: selectedGroup.id, userId: memberId })
      });
      if (res.ok) {
        invalidateCache('/api/groups');
        await fetchGroups();
        const updated = groups.find(g => g.id === selectedGroup.id);
        if (updated) setSelectedGroup(updated);
      }
    } catch {}
  };

  const openNotifications = () => {
    window.dispatchEvent(new Event('open-notifications-panel'));
    setActiveTab?.('home');
  };

  useEffect(() => {
    const h = (e) => { setSelectedGroup(e.detail); setShowChat(true); };
    window.addEventListener('open-group-chat', h);
    return () => window.removeEventListener('open-group-chat', h);
  }, []);

  const memberIds = new Set((selectedGroup?.members || []).map(m => m.id));

  // ── Not logged in ───────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={{
        marginLeft: '80px', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-color, #f5f4ee)', fontFamily: 'var(--font-sans)'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '340px' }}>
          <BookOpen size={44} style={{ color: '#c8c7c0', marginBottom: '20px' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', color: '#1e2022', marginBottom: '12px' }}>
            Library Workspaces
          </h2>
          <p style={{ color: '#6e7072', fontSize: '15px', lineHeight: '1.65', marginBottom: '24px' }}>
            Sign in to access group shelves and collaborate with your team.
          </p>
          <button
            onClick={() => {
              const width = 500;
              const height = 650;
              const left = window.screen.width / 2 - width / 2;
              const top = window.screen.height / 2 - height / 2;
              window.open(
                '/login.html',
                'GoogleSignIn',
                `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
              );
            }}
            style={{
              padding: '12px 28px',
              background: '#1e2022',
              color: '#fff',
              border: 'none',
              borderRadius: '24px',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              transition: 'background 0.2s'
            }}
          >
            Check In / Sign In
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW — opened when a book is selected
  // ═══════════════════════════════════════════════════════════════════════════
  if (selectedGroup) {
    const gIdx = groups.findIndex(g => g.id === selectedGroup.id);
    const curIdx = gIdx >= 0 ? gIdx : selectedIdx;
    const canUp = curIdx > 0;
    const canDown = curIdx < groups.length - 1;
    const adminMember = selectedGroup.members?.[0];
    const isCurrentUserAdmin = !!currentUserId && adminMember?.id === currentUserId;

    return (
      <>
        <div style={{
          marginLeft: '80px', minHeight: '100vh', overflowY: 'auto',
          fontFamily: 'var(--font-sans)',
          background: `linear-gradient(to bottom, var(--bg-color, #f5f4ee) 400px, #ffffff 400px)`
        }}>
        {/* Top bar */}
        <TopBar
          searchQuery={memberSearch}
          onSearchChange={setMemberSearch}
          searchPlaceholder="Search name or username to add member..."
          currentUser={currentUser}
          inputRef={searchInputRef}
          onProfileClick={() => setActiveTab?.('settings')}
          rightAction={
            <button onClick={() => { setSelectedGroup(null); setShowChat(false); setShowMoreMenu(false); }} style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#1e2022', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}>
              <X size={15} />
            </button>
          }
        />

        {/* Hero: two-column */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr',
          gap: '56px', padding: '52px 60px 0 60px',
          alignItems: 'flex-start'
        }}>
          {/* LEFT: nav arrows + large book cover */}
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            {/* Arrows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[{ dir: -1, icon: <ChevronUp size={16} />, disabled: !canUp },
                { dir: 1, icon: <ChevronDown size={16} />, disabled: !canDown }].map(({ dir, icon, disabled }) => (
                <button key={dir} onClick={() => navigateGroup(dir)} disabled={disabled} style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  border: '1.5px solid #e4e3da', background: '#fff',
                  cursor: disabled ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: disabled ? '#c8c7c0' : '#1e2022',
                  boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s'
                }}>
                  {icon}
                </button>
              ))}
            </div>

            {/* Cursor-reactive 3D book cover */}
            <div style={{
              filter: 'drop-shadow(20px 28px 44px rgba(0,0,0,0.38))',
            }}>
              <BookCover group={selectedGroup} index={curIdx} width={230} height={346} reactive />
            </div>
          </div>

          {/* RIGHT: Group info */}
          <div style={{ paddingTop: '16px', maxWidth: '500px' }}>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontSize: '46px', fontWeight: '700',
              color: '#1e2022', lineHeight: 1.1, margin: '0 0 20px 0'
            }}>
              {selectedGroup.name}
            </h1>

            {/* Admin row */}
            {adminMember && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <Avatar user={adminMember} size={30} />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e2022' }}>
                    {adminMember.name || adminMember.username}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6e7072' }}>group admin</div>
                </div>
              </div>
            )}

            {selectedGroup.description && (
              <p style={{
                fontStyle: 'italic', color: '#6e7072', fontSize: '15px',
                lineHeight: '1.75', margin: '0 0 30px 0', maxWidth: '420px'
              }}>
                "{selectedGroup.description}"
              </p>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', position: 'relative' }}>
              {!selectedGroup.isMember ? (
                <button onClick={handleJoin} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '13px 28px', background: '#1e2022', color: '#fff',
                  border: 'none', borderRadius: '28px', fontFamily: 'var(--font-sans)',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
                }}>
                  Join Group <ArrowUpRight size={15} />
                </button>
              ) : (
                <button
                  onClick={() => { setShowChat(v => !v); setShowMoreMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '13px 28px',
                    background: showChat ? '#333' : '#1e2022',
                    color: '#fff', border: 'none', borderRadius: '28px',
                    fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: '600',
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
                  }}
                >
                  <MessageSquare size={15} />
                  {showChat ? 'Close Chat' : 'Start Chat'}
                  {!showChat && <ArrowUpRight size={15} />}
                </button>
              )}

              {/* Add Member — focuses the search input */}
              <button
                title="Add member"
                onClick={() => {
                  setShowMoreMenu(false);
                  // Scroll to top and focus the search input
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setTimeout(() => searchInputRef.current?.focus(), 300);
                }}
                style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  border: '1.5px solid #e4e3da', background: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6e7072', boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
              >
                <UserPlus size={16} />
              </button>

              {/* More options dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  title="More options"
                  onClick={() => setShowMoreMenu(v => !v)}
                  style={{
                    width: '46px', height: '46px', borderRadius: '50%',
                    border: '1.5px solid #e4e3da',
                    background: showMoreMenu ? '#1e2022' : '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: showMoreMenu ? '#fff' : '#6e7072',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {showMoreMenu && (
                  <div style={{
                    position: 'absolute', top: '54px', right: 0,
                    background: '#fff', borderRadius: '12px',
                    border: '1px solid #e4e3da',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    padding: '8px', zIndex: 100, minWidth: '200px'
                  }}>
                    <button
                      onClick={handleCopyGroupId}
                      style={{
                        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', background: 'none', border: 'none',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                        color: '#1e2022', fontFamily: 'var(--font-sans)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9f8f4'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Copy size={14} />
                      {copySuccess ? 'Copied!' : 'Copy Group ID'}
                    </button>
                    <button
                      onClick={() => { setShowMoreMenu(false); setSelectedGroup(null); }}
                      style={{
                        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', background: 'none', border: 'none',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                        color: '#1e2022', fontFamily: 'var(--font-sans)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9f8f4'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <X size={14} />
                      Close Group View
                    </button>
                    {selectedGroup.isMember && (
                      <button
                        onClick={() => { setShowMoreMenu(false); handleLeaveGroup(); }}
                        style={{
                          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 14px', background: 'none', border: 'none',
                          borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                          color: '#e85d56', fontFamily: 'var(--font-sans)',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <Users size={14} />
                        Leave Group
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Member search results shown here */}
        <div style={{ paddingTop: '16px', maxWidth: '500px' }}>
                {memberSearch.length >= 2 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#1e2022', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Search Results
                    </h4>
                    {!isCurrentUserAdmin && (
                      <p style={{ color: '#b33933', fontSize: '12px', fontStyle: 'italic', marginBottom: '14px' }}>
                        Only the group admin can add new members.
                      </p>
                    )}
                    {memberSearchLoading ? (
                      <p style={{ color: '#6e7072', fontSize: '13px', fontStyle: 'italic' }}>Searching...</p>
                    ) : memberResults.length === 0 ? (
                      <p style={{ color: '#6e7072', fontSize: '13px', fontStyle: 'italic' }}>No users found for "{memberSearch}"</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {memberResults.map(u => (
                          <div key={u.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', background: '#f9f8f4',
                            borderRadius: '10px', border: '1px solid #f0eee8'
                          }}>
                            <Avatar user={u} size={32} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e2022', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.username}</div>
                              <div style={{ fontSize: '11px', color: '#6e7072' }}>@{u.username}</div>
                            </div>
                            {memberIds.has(u.id) ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6e7072', flexShrink: 0 }}>
                                <Check size={12} /> Member
                              </div>
                            ) : isCurrentUserAdmin ? (
                              <button onClick={() => handleAddMember(u.id)} disabled={memberActionLoading} style={{
                                padding: '5px 14px', background: '#1e2022', color: '#fff',
                                border: 'none', borderRadius: '16px', fontSize: '12px',
                                fontWeight: '600', cursor: 'pointer', flexShrink: 0,
                                opacity: memberActionLoading ? 0.6 : 1
                              }}>Add</button>
                            ) : (
                              <div style={{ padding: '6px 14px', borderRadius: '16px', background: '#eae7df', color: '#8a826f', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                                Admin only
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </div>
        </div>

        {/* White detail section */}
        <div style={{
          background: '#ffffff', borderRadius: '24px 24px 0 0',
          margin: '44px 0 0 0', padding: '48px 60px 60px 60px',
          boxShadow: '0 -6px 40px rgba(0,0,0,0.05)',
          display: 'grid', gridTemplateColumns: '1.4fr 1fr',
          gap: '56px', minHeight: '400px'
        }}>
          {/* LEFT: Description + Members */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: '600', color: '#1e2022', marginBottom: '14px' }}>
              Description
            </h3>
            <p style={{ color: '#6e7072', fontSize: '14px', lineHeight: '1.85', marginBottom: '16px' }}>
              {selectedGroup.description
                ? selectedGroup.description
                : 'This group brings people together to collaborate, share ideas, and communicate in real time.'}
            </p>
            <p style={{ color: '#6e7072', fontSize: '14px', lineHeight: '1.85', marginBottom: '32px' }}>
              Use the search bar above to find and invite members. Once joined, open the group chat to start your collaboration.
            </p>

            {/* Divider */}
            {selectedGroup.members.length > 0 && <div style={{ height: '1px', background: '#f0eee8', marginBottom: '28px' }} />}

            {/* Member list */}
            {selectedGroup.members.length === 0 ? (
              <p style={{ color: '#9a9a94', fontSize: '13px', fontStyle: 'italic' }}>No members yet. Use the search bar above to add people.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {selectedGroup.members.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => { setSelectedMemberForModal(m); setShowMembersModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                  >
                    <Avatar user={m} size={42} />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e2022', marginBottom: '2px' }}>
                        {m.name || m.username}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6e7072', fontStyle: 'italic' }}>
                        {m.username ? `@${m.username}` : 'Group member'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Chat OR Stats */}
          <div>
            {showChat ? (
              /* ── Inline Chat ── */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                <div 
                  onClick={() => { setSelectedMemberForModal(null); setShowMembersModal(true); }}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '10px', 
                    marginBottom: '20px', paddingBottom: '16px', 
                    borderBottom: '1px solid #f0eee8', cursor: 'pointer' 
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#1e2022', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                  }}>
                    <Users size={15} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e2022' }}>{selectedGroup.name}</div>
                    <div style={{ fontSize: '11px', color: '#6e7072', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{selectedGroup.members.length} members · live chat</span>
                      <span style={{ fontSize: '9px', color: '#b33933' }}>(View Info)</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#fff',
                  border: '1px solid #ece9e2',
                  borderRadius: '18px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e2022' }}>Message one person</div>
                      <div style={{ fontSize: '11px', color: '#6e7072', marginTop: '4px' }}>
                        Send a quick note directly to a member in this group.
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleSendDirect} style={{ display: 'grid', gap: '10px' }}>
                    <select value={directRecipient?.id || ''} onChange={e => {
                      const member = selectedGroup.members.find(m => String(m.id) === e.target.value);
                      setDirectRecipient(member || null);
                    }} style={{
                      width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e4e3da',
                      fontSize: '14px', color: '#1e2022', background: '#fff'
                    }}>
                      {selectedGroup.members.filter(m => m.id !== currentUserId).length === 0 ? (
                        <option value="">No other members to message</option>
                      ) : (
                        selectedGroup.members.filter(m => m.id !== currentUserId).map(m => (
                          <option key={m.id} value={String(m.id)}>{m.name || m.username || 'Member'}</option>
                        ))
                      )}
                    </select>
                    <input
                      type="text"
                      value={directMsg}
                      onChange={e => setDirectMsg(e.target.value)}
                      placeholder={directRecipient ? `Message ${directRecipient.name || directRecipient.username}` : 'Select a member to message'}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e4e3da',
                        fontSize: '14px', color: '#1e2022', background: '#fff'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button type="submit" disabled={!directRecipient || !directMsg.trim() || directSendLoading} style={{
                        flex: 1,
                        height: '44px',
                        borderRadius: '999px',
                        border: 'none',
                        background: '#1e2022',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: directRecipient && directMsg.trim() ? 'pointer' : 'not-allowed'
                      }}>
                        {directSendLoading ? 'Sending…' : 'Send directly'}
                      </button>
                      <button type="button" onClick={() => { setDirectMsg(''); setDirectSendStatus(''); }} style={{
                        border: '1px solid #e4e3da',
                        background: '#fff',
                        borderRadius: '999px',
                        padding: '0 18px',
                        color: '#1e2022',
                        cursor: 'pointer',
                        height: '44px'
                      }}>
                        Clear
                      </button>
                    </div>
                  </form>
                  {directSendStatus && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#6e7072' }}>{directSendStatus}</div>
                  )}
                </div>

                {/* Messages */}
                <div style={{
                  flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px',
                  padding: '16px', background: '#f9f8f4', borderRadius: '14px', marginBottom: '12px',
                  minHeight: '220px', maxHeight: '340px'
                }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: '40px', color: '#9a9a94' }}>
                      <MessageSquare size={26} style={{ marginBottom: '8px', opacity: 0.3 }} />
                      <p style={{ fontSize: '13px', fontStyle: 'italic' }}>No messages yet. Say hello!</p>
                    </div>
                  ) : chatMessages.map((m, i) => {
                    const isSelf = m.senderId === currentUserId;
                    const senderName = m.name || m.username || 'Member';
                    const timeStr = formatTime(m.createdAt);
                    // Show name label if first message or different sender from prev
                    const prevMsg = chatMessages[i - 1];
                    const showLabel = !isSelf && (!prevMsg || prevMsg.senderId !== m.senderId);

                    return (
                      <div key={m.id} style={{
                        display: 'flex',
                        flexDirection: isSelf ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        gap: '8px'
                      }}>
                        {/* Avatar for others */}
                        {!isSelf && (
                          <div style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
                            <Avatar
                              user={{ name: senderName, username: m.username, avatar_url: m.avatar_url }}
                              size={28}
                            />
                          </div>
                        )}

                        <div style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: isSelf ? 'flex-end' : 'flex-start',
                          maxWidth: '78%'
                        }}>
                          {/* Name label (shown once per sender group) */}
                          {showLabel && (
                            <div style={{
                              fontSize: '11px', fontWeight: '600', color: '#6e7072',
                              marginBottom: '4px', marginLeft: '4px'
                            }}>
                              {senderName}
                            </div>
                          )}

                          {/* Bubble container with wings and decorations */}
                          <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            margin: '8px 0'
                          }}>
                            {/* Left Wing */}
                            <WingIcon isLeft={true} color={isSelf ? '#b33933' : '#8a826f'} />

                            {/* Bubble */}
                            <div style={{
                              padding: '12px 20px',
                              borderRadius: '24px',
                              background: isSelf ? '#b33933' : '#fcfaf2',
                              color: isSelf ? '#ffffff' : '#2b2927',
                              fontSize: '13px',
                              lineHeight: '1.5',
                              border: isSelf ? '1.5px solid #b33933' : '1.5px solid #d5cebf',
                              boxShadow: isSelf 
                                ? '0 0 0 2px #fcfaf2, 0 0 0 3.5px #b33933, 0 4px 10px rgba(0,0,0,0.06)' 
                                : '0 0 0 2px #fcfaf2, 0 0 0 3.5px #d5cebf, 0 4px 10px rgba(0,0,0,0.04)',
                              wordBreak: 'break-word',
                              position: 'relative',
                              minWidth: '60px'
                            }}>
                              {/* Top Tag */}
                              <div style={{
                                position: 'absolute',
                                top: '-9px',
                                [isSelf ? 'right' : 'left']: '16px',
                                background: isSelf ? '#b33933' : '#fcfaf2',
                                color: isSelf ? '#ffffff' : '#b33933',
                                border: isSelf ? '1.5px solid #ffffff' : '1.5px solid #d5cebf',
                                borderRadius: '10px',
                                padding: '1px 8px',
                                fontSize: '8px',
                                fontFamily: 'monospace',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                zIndex: 2
                              }}>
                                {isSelf ? 'You' : (m.senderId === selectedGroup.members?.[0]?.id ? 'Admin' : 'Borrower')}
                              </div>

                              {/* Tiny Corner Bows/Hearts as Unicode decorations */}
                              <span style={{
                                position: 'absolute',
                                top: '-2px',
                                [isSelf ? 'left' : 'right']: '8px',
                                fontSize: '10px',
                                color: isSelf ? '#ffffff' : '#b33933',
                                opacity: 0.6
                              }}>
                                ʚɞ
                              </span>

                              {/* Sparkles */}
                              <span style={{
                                position: 'absolute',
                                bottom: '-2px',
                                [isSelf ? 'right' : 'left']: '10px',
                                fontSize: '8px',
                                color: isSelf ? '#ffffff' : '#b33933',
                                opacity: 0.6
                              }}>
                                ✦
                              </span>

                              {m.text}
                            </div>

                            {/* Right Wing */}
                            <WingIcon isLeft={false} color={isSelf ? '#b33933' : '#8a826f'} />
                          </div>

                          {/* Timestamp */}
                          {timeStr && (
                            <div style={{
                              fontSize: '10px', color: '#b0aea8',
                              marginTop: '4px',
                              paddingLeft: isSelf ? 0 : '4px',
                              paddingRight: isSelf ? '4px' : 0
                            }}>
                              {timeStr}
                            </div>
                          )}

                          {/* Quick reply action for incoming messages */}
                          {!isSelf && (
                            <button type="button" onClick={() => {
                              const replyName = senderName;
                              setQuickReplyTo({ id: m.senderId, name: replyName });
                              setNewMsg(`@${replyName} `);
                            }} style={{
                              marginTop: '6px',
                              border: 'none',
                              background: 'transparent',
                              color: '#b33933',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              textAlign: 'left'
                            }}>
                              Reply to {senderName}
                            </button>
                          )}
                        </div>

                        {/* Self avatar placeholder for alignment */}
                        {isSelf && <div style={{ width: 28, flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {quickReplyTo && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 16px',
                    marginBottom: '10px',
                    borderRadius: '18px',
                    background: '#f3eee4',
                    color: '#1e2022',
                    fontSize: '13px'
                  }}>
                    <span>Replying to {quickReplyTo.name}</span>
                    <button type="button" onClick={() => setQuickReplyTo(null)} style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#b33933',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                      flex: 1, padding: '11px 18px',
                      border: '1.5px solid #e4e3da', borderRadius: '24px',
                      fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#1e2022', outline: 'none',
                      background: '#fff'
                    }}
                    onFocus={e => e.target.style.borderColor = '#1e2022'}
                    onBlur={e => e.target.style.borderColor = '#e4e3da'}
                  />
                  <button type="submit" style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: '#1e2022', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                  }}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            ) : (
              /* ── Metadata Cards ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { label: 'Members', value: `${selectedGroup.members.length} ${selectedGroup.members.length === 1 ? 'person' : 'people'} in this group` },
                  { label: 'Status', value: selectedGroup.isMember ? '✦ You are a member of this group' : 'You have not joined this group yet' },
                  { label: 'Edition', value: 'Group workspace, real-time chat' },
                  { label: 'Group ID', value: selectedGroup.id ? `${selectedGroup.id.slice(0, 20)}...` : '—', mono: true }
                ].map((item, i) => (
                  <div 
                    key={i} 
                    onClick={item.label === 'Members' ? () => { setSelectedMemberForModal(null); setShowMembersModal(true); } : undefined}
                    style={{
                      padding: '18px 0',
                      borderBottom: i < 3 ? '1px solid #f0eee8' : 'none',
                      cursor: item.label === 'Members' ? 'pointer' : 'default',
                    }}
                  >
                    <h4 style={{ 
                      fontSize: '12px', fontWeight: '700', 
                      color: item.label === 'Members' ? '#b33933' : '#1e2022', 
                      marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      {item.label}
                      {item.label === 'Members' && <span style={{ fontSize: '9px', fontWeight: 'normal', textTransform: 'none' }}>(click to view)</span>}
                    </h4>
                    <p style={{ color: '#6e7072', fontSize: '14px', lineHeight: '1.6', fontFamily: item.mono ? 'monospace' : 'inherit', fontSize: item.mono ? '12px' : '14px' }}>
                      {item.value}
                    </p>
                  </div>
                ))}

                {/* Member search results shown here */}
                {memberSearch.length >= 2 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#1e2022', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Search Results
                    </h4>
                    {!isCurrentUserAdmin && (
                      <p style={{ color: '#b33933', fontSize: '12px', fontStyle: 'italic', marginBottom: '14px' }}>
                        Only the group admin can add new members.
                      </p>
                    )}
                    {memberSearchLoading ? (
                      <p style={{ color: '#6e7072', fontSize: '13px', fontStyle: 'italic' }}>Searching...</p>
                    ) : memberResults.length === 0 ? (
                      <p style={{ color: '#6e7072', fontSize: '13px', fontStyle: 'italic' }}>No users found for "{memberSearch}"</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {memberResults.map(u => (
                          <div key={u.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', background: '#f9f8f4',
                            borderRadius: '10px', border: '1px solid #f0eee8'
                          }}>
                            <Avatar user={u} size={32} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e2022', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.username}</div>
                              <div style={{ fontSize: '11px', color: '#6e7072' }}>@{u.username}</div>
                            </div>
                            {memberIds.has(u.id) ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6e7072', flexShrink: 0 }}>
                                <Check size={12} /> Member
                              </div>
                            ) : isCurrentUserAdmin ? (
                              <button onClick={() => handleAddMember(u.id)} disabled={memberActionLoading} style={{
                                padding: '5px 14px', background: '#1e2022', color: '#fff',
                                border: 'none', borderRadius: '16px', fontSize: '12px',
                                fontWeight: '600', cursor: 'pointer', flexShrink: 0,
                                opacity: memberActionLoading ? 0.6 : 1
                              }}>Add</button>
                            ) : (
                              <div style={{ padding: '6px 14px', borderRadius: '16px', background: '#eae7df', color: '#8a826f', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                                Admin only
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMembersModal && selectedGroup && (
        <GroupMembersModal
          group={selectedGroup}
          initialMember={selectedMemberForModal}
          currentUserId={currentUserId}
          onRemoveMember={selectedGroup.isMember ? handleRemoveMember : null}
          onClose={() => { setShowMembersModal(false); setSelectedMemberForModal(null); }}
        />
      )}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHELF VIEW — the main library page
  // ═══════════════════════════════════════════════════════════════════════════
  const featuredGroup = groups.find(g => g.isMember) || groups[0];
  const featuredIdx = groups.findIndex(g => g === featuredGroup);
  const joinedCount = groups.filter(g => g.isMember).length;

  const filteredGroups = shelfSearch
    ? groups.filter(g =>
        g.name.toLowerCase().includes(shelfSearch.toLowerCase()) ||
        g.description?.toLowerCase().includes(shelfSearch.toLowerCase())
      )
    : groups;

  return (
    <div style={{
      marginLeft: '80px', minHeight: '100vh', overflowY: 'auto',
      background: 'var(--bg-color, #f5f4ee)', fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Top bar */}
      <TopBar
        searchQuery={shelfSearch}
        onSearchChange={setShelfSearch}
        searchPlaceholder="Search book name, group..."
        currentUser={currentUser}
        onProfileClick={() => setActiveTab?.('settings')}
        onBellClick={openNotifications}
      />

      {/* Hero section */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        padding: '52px 60px 0 60px', gap: '40px', alignItems: 'flex-start'
      }}>
        {/* Left: headline */}
        <div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: '54px', fontWeight: '700',
            color: '#1e2022', lineHeight: 1.05, marginBottom: '18px'
          }}>
            Keep the story going..
          </h1>
          <p style={{
            color: '#6e7072', fontSize: '15px', lineHeight: '1.7',
            marginBottom: '32px', maxWidth: '380px'
          }}>
            Don't let the conversation end just yet. Each book below is a group workspace. Select one to collaborate, chat, and connect.
          </p>
          <button onClick={() => setShowCreateModal(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 30px', background: '#1e2022', color: '#fff',
            border: 'none', borderRadius: '28px', fontFamily: 'var(--font-sans)',
            fontSize: '15px', fontWeight: '500', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
            transition: 'all 0.2s'
          }}>
            <Plus size={16} /> New Group ↗
          </button>
        </div>

        {/* Right: featured group preview */}
        {featuredGroup ? (
          <div style={{ paddingTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {featuredGroup.members?.[0] && <Avatar user={featuredGroup.members[0]} size={50} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#1e2022' }}>
                  {featuredGroup.members?.[0]?.name || featuredGroup.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6e7072' }}>group admin</div>
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowFeaturedMenu(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e7072', display: 'flex' }}
                  aria-label="Featured group options"
                >
                  <MoreHorizontal size={18} />
                </button>
                {showFeaturedMenu && (
                  <div style={{
                    position: 'absolute', top: '28px', right: 0, background: '#fff',
                    borderRadius: '10px', border: '1px solid #e4e3da',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px', zIndex: 50, minWidth: '160px'
                  }}>
                    <button type="button" onClick={() => { setShowFeaturedMenu(false); handleSelectGroup(featuredGroup, featuredIdx); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', borderRadius: '6px' }}>
                      Open Group
                    </button>
                    {!featuredGroup.isMember && (
                      <button type="button" onClick={async () => {
                        setShowFeaturedMenu(false);
                        try {
                          const res = await fetch('/api/groups/join', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ groupId: featuredGroup.id })
                          });
                          if (res.ok) { invalidateCache('/api/groups'); await fetchGroups(); window.dispatchEvent(new Event('reader-activity-updated')); }
                        } catch {}
                      }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', borderRadius: '6px' }}>
                        Join Group
                      </button>
                    )}
                    <button type="button" onClick={() => { navigator.clipboard.writeText(featuredGroup.id); setShowFeaturedMenu(false); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', borderRadius: '6px' }}>
                      Copy Group ID
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p style={{
              color: '#6e7072', fontSize: '15px', lineHeight: '1.75',
              fontStyle: 'italic', marginBottom: '24px', maxWidth: '380px'
            }}>
              "{featuredGroup.description || 'A collaborative workspace for your team to share ideas and stay connected.'}"
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => { if (featuredIdx > 0) handleSelectGroup(groups[featuredIdx - 1], featuredIdx - 1); }} style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '1.5px solid #e4e3da', background: '#fff',
                cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e7072'
              }}>←</button>
              <button onClick={() => { if (featuredIdx < groups.length - 1) handleSelectGroup(groups[featuredIdx + 1], featuredIdx + 1); }} style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '1.5px solid #e4e3da', background: '#fff',
                cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e7072'
              }}>→</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <p style={{ color: '#6e7072', fontSize: '14px', fontStyle: 'italic' }}>
              Create a group to get started.
            </p>
          </div>
        )}
      </div>

      {/* Book shelf row */}
      <div style={{ padding: '44px 60px 16px', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-end' }}>
            {[200, 230, 200, 220, 210].map((h, i) => (
              <div key={i} style={{
                width: 140, height: h, borderRadius: '3px 10px 10px 3px',
                background: 'rgba(0,0,0,0.06)', animation: 'shimmer 1.6s infinite'
              }} />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6e7072' }}>
            <BookOpen size={42} style={{ marginBottom: '16px', opacity: 0.25 }} />
            <p style={{ fontSize: '15px' }}>
              {shelfSearch ? `No groups match "${shelfSearch}"` : 'No groups yet. Create your first one!'}
            </p>
          </div>
        ) : (
          <div
            ref={shelfRef}
            style={{
              display: 'flex', gap: '32px', overflowX: 'auto',
              paddingBottom: '32px', alignItems: 'flex-end',
              scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.1) transparent'
            }}
          >
            {filteredGroups.map((group) => {
              const realIdx = groups.findIndex(g => g.id === group.id);
              const heights = [210, 235, 200, 225, 215, 205];
              const bh = heights[realIdx % heights.length];
              return (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group, realIdx)}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '16px',
                    cursor: 'pointer', flexShrink: 0,
                    transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)'
                  }}
                  onMouseEnter={e => { e.currentTarget.querySelector('.book-wrap').style.transform = 'translateY(-10px) rotateY(-6deg)'; e.currentTarget.querySelector('.book-wrap').style.filter = 'drop-shadow(14px 20px 30px rgba(0,0,0,0.4))'; }}
                  onMouseLeave={e => { e.currentTarget.querySelector('.book-wrap').style.transform = ''; e.currentTarget.querySelector('.book-wrap').style.filter = ''; }}
                >
                  <div className="book-wrap" style={{ transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
                    <BookCover group={group} index={realIdx} width={140} height={bh} />
                  </div>
                  <div style={{ width: 140, paddingLeft: '4px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e2022', lineHeight: '1.35', marginBottom: '3px' }}>
                      {group.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6e7072', fontStyle: 'italic' }}>
                      {group.members?.length || 0} {(group.members?.length || 0) === 1 ? 'member' : 'members'}
                    </div>
                    {group.isMember && (
                      <div style={{ fontSize: '10px', color: '#e85d56', fontWeight: '700', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        ✦ Joined
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '15px 60px', borderTop: '1px solid rgba(0,0,0,0.06)',
        color: '#6e7072', fontSize: '13px', background: 'var(--bg-color)'
      }}>
        <div>
          ⓘ&nbsp; Got a team? Create a group shelf and invite members to start chatting.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#e85d56', fontWeight: '700', fontSize: '16px' }}>
            {String(joinedCount).padStart(2, '0')}
          </span>
          <span>/</span>
          <span>{String(groups.length).padStart(2, '0')} groups</span>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async (g) => {
            setShowCreateModal(false);
            await fetchGroups();
            try {
              const res = await fetch('/api/groups', { headers: { 'Authorization': `Bearer ${token}` } });
              if (res.ok) {
                const data = await res.json();
                const created = (data.groups || []).find(x => x.id === g.id);
                const ci = (data.groups || []).findIndex(x => x.id === g.id);
                if (created) handleSelectGroup(created, ci);
              }
            } catch {}
          }}
        />
      )}

      {/* Group Members Modal */}
      {showMembersModal && (
        <GroupMembersModal
          group={selectedGroup}
          initialMember={selectedMemberForModal}
          currentUserId={currentUserId}
          onRemoveMember={selectedGroup?.isMember ? handleRemoveMember : null}
          onClose={() => { setShowMembersModal(false); setSelectedMemberForModal(null); }}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        div[style*="overflow-x: auto"]::-webkit-scrollbar { height: 5px; }
        div[style*="overflow-x: auto"]::-webkit-scrollbar-track { background: transparent; }
        div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
      `}</style>
    </div>
  );
}
