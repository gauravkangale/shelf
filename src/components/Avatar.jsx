  // eslint-disable-next-line no-unused-vars
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

  const finalSrc = avatarSrc || '/profile.jpeg';

  return (
    <img
      src={finalSrc}
      alt={name}
      onClick={handleClick}
      style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
        cursor: 'pointer'
      }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = '/profile.jpeg';
      }}
    />
  );
}

export default Avatar;
