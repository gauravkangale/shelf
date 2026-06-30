import React from 'react';
import { Pencil, Trash2, UserPlus, X, Check } from 'lucide-react';

function SwitcherAvatar({ avatar, name, size = 36 }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const palettes = ['#c41e3a', '#1b3d2f', '#1e355c', '#61461b', '#4a1a5c', '#1a3d4f'];
  const color = palettes[(initial.charCodeAt(0) || 0) % palettes.length];

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || ''}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1.5px solid var(--border-color, #e4e3da)'
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color, color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: '700',
      fontFamily: 'var(--font-serif, Georgia, serif)', userSelect: 'none',
      border: '1.5px solid var(--border-color, #e4e3da)'
    }}>
      {initial}
    </div>
  );
}

export default function ProfileSwitcher({
  activeProfile,
  profileAccounts,
  switchProfileAccount,
  isEditingProfileAccounts,
  setIsEditingProfileAccounts,
  deleteProfileAccount,
  isAddingProfileAcc,
  setIsAddingProfileAcc,
  addProfileAccount,
  newProfileAccName,
  setNewProfileAccName,
  newProfileAccEmail,
  setNewProfileAccEmail,
  newProfileAccAvatar,
  setNewProfileAccAvatar,
  setActiveTab
}) {
  return (
    <div className="profile-switcher-popup" onClick={(e) => e.stopPropagation()}>
      <div className="active-account-header">
        <SwitcherAvatar avatar={activeProfile.avatar} name={activeProfile.name} size={42} />
        <div className="active-account-details">
          <div className="active-account-name">{activeProfile.name} {activeProfile.username ? `(@${activeProfile.username})` : ''}</div>
          <div className="active-account-email">{activeProfile.email}</div>
        </div>
 
        <button
          className="pencil-edit-icon"
          style={{ position: 'absolute', top: '16px', right: '16px', opacity: 1 }}
          title="Edit Profile Settings"
          onClick={() => setActiveTab('settings')}
        >
          <Pencil size={12} />
        </button>
      </div>
 
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div className="account-list-title" style={{ margin: 0 }}>Switch Account</div>
        <button
          type="button"
          onClick={() => setIsEditingProfileAccounts(v => !v)}
          style={{
            fontSize: '10px', fontWeight: '600', padding: '4px 8px',
            borderRadius: '6px', border: '1px solid var(--border-color)',
            background: isEditingProfileAccounts ? 'var(--ink)' : 'var(--surface-bg)',
            color: isEditingProfileAccounts ? 'var(--button-text)' : 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)'
          }}
        >
          {isEditingProfileAccounts ? 'Done' : 'Manage'}
        </button>
      </div>
 
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {profileAccounts.filter(acc => acc.id !== activeProfile.id).map(acc => (
          <div
            key={acc.id}
            className="account-option-row"
            onClick={() => !isEditingProfileAccounts && switchProfileAccount(acc.id)}
            style={{ cursor: isEditingProfileAccounts ? 'default' : 'pointer' }}
          >
            <SwitcherAvatar avatar={acc.avatar} name={acc.name} size={36} />
            <div className="account-option-info">
              <span className="account-option-name">{acc.name} {acc.username ? `(@${acc.username})` : ''}</span>
              <span className="account-option-email">{acc.email}</span>
            </div>
            {isEditingProfileAccounts && (
              <button
                className="btn-danger"
                style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', border: 'none', cursor: 'pointer', background: 'var(--danger-color)', color: 'var(--button-text)' }}
                onClick={(e) => deleteProfileAccount(e, acc.id)}
                title="Remove account from this device"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
        {!isAddingProfileAcc ? (
          <>
            <button
              type="button"
              className="add-account-row"
              style={{
                width: '100%', background: 'none', border: 'none', textAlign: 'left',
                cursor: 'pointer', padding: '8px 10px', fontSize: '13px',
                color: 'var(--accent-color)', fontWeight: '600', borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onClick={() => {
                const width = Math.min(700, window.screen.width - 80);
                const height = Math.min(820, window.screen.height - 100);
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;
                window.open('/login.html', 'GoogleSignIn',
                  `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`);
              }}
            >
              + Sign in with Google
            </button>
            <button
              type="button"
              style={{
                width: '100%', background: 'var(--option-bg)', border: '1px solid var(--border-color)',
                textAlign: 'left', cursor: 'pointer', padding: '8px 10px',
                fontSize: '13px', color: 'var(--ink)', fontWeight: '600', borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-sans)'
              }}
              onClick={() => setIsAddingProfileAcc(true)}
            >
              <UserPlus size={14} /> Add account manually
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); addProfileAccount(e); setIsAddingProfileAcc(false); }}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <input
              type="text"
              placeholder="Name"
              value={newProfileAccName}
              onChange={(e) => setNewProfileAccName(e.target.value)}
              required
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={newProfileAccEmail}
              onChange={(e) => setNewProfileAccEmail(e.target.value)}
              required
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
            />
            <input
              type="text"
              placeholder="Avatar URL (optional)"
              value={newProfileAccAvatar}
              onChange={(e) => setNewProfileAccAvatar(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{
                flex: 1, padding: '8px', background: 'var(--ink)', color: 'var(--button-text)',
                border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}>
                <Check size={12} /> Save
              </button>
              <button type="button" onClick={() => setIsAddingProfileAcc(false)} style={{
                padding: '8px 12px', background: 'var(--surface-bg)', border: '1px solid var(--border-color)',
                borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}>
                <X size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
