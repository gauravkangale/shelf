import React from 'react';

function Avatar({ user, size = 36 }) {
  if (!user) return null;
  const name = user.name || user.username || 'U';
  const initial = name.charAt(0).toUpperCase();

  // Handle various formats for avatar_url
  let avatarSrc = null;
  if (user.avatar_url && typeof user.avatar_url === 'string') {
    avatarSrc = user.avatar_url;
  } else if (user.avatar && typeof user.avatar === 'string') {
    avatarSrc = user.avatar;
  }

  const handleClick = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('open-profile-modal', { detail: { user } }));
  };

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={name}
        onClick={handleClick}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
          cursor: 'pointer'
        }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = 'none';
          if (e.target.nextSibling) {
            e.target.nextSibling.style.display = 'flex';
          }
        }}
      />
    );
  }

  const colors = ['#b33533', '#4a6741', '#3b5998', '#d97a26', '#2b4162'];
  const charCode = name.charCodeAt(0) || 0;
  const bg = colors[charCode % colors.length];

  return (
    <div 
      onClick={handleClick}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: bg, color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: '700',
        fontFamily: 'var(--serif, Georgia, serif)', userSelect: 'none',
        cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)'
      }}>
      {initial}
    </div>
  );
}

export default Avatar;
