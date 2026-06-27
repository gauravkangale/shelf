import React from 'react';
import { Pencil, Trash2, UserPlus, X, Check } from 'lucide-react';

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
        <img
          src={activeProfile.avatar || "profile.png"}
          className="active-account-avatar"
          alt={activeProfile.name}
        />
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
            borderRadius: '6px', border: '1px solid #e4e3da',
            background: isEditingProfileAccounts ? '#1e2022' : '#fff',
            color: isEditingProfileAccounts ? '#fff' : '#6e7072',
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
            <div className="account-option-avatar">
              {acc.name.charAt(0)}
            </div>
            <div className="account-option-info">
              <span className="account-option-name">{acc.name} {acc.username ? `(@${acc.username})` : ''}</span>
              <span className="account-option-email">{acc.email}</span>
            </div>
            {isEditingProfileAccounts && (
              <button
                className="btn-danger"
                style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', border: 'none', cursor: 'pointer', background: '#e85d56', color: '#fff' }}
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
                width: '100%', background: '#f5f4ee', border: '1px solid #e4e3da',
                textAlign: 'left', cursor: 'pointer', padding: '8px 10px',
                fontSize: '13px', color: '#1e2022', fontWeight: '600', borderRadius: '8px',
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
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #e4e3da', fontSize: '12px' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={newProfileAccEmail}
              onChange={(e) => setNewProfileAccEmail(e.target.value)}
              required
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #e4e3da', fontSize: '12px' }}
            />
            <input
              type="text"
              placeholder="Avatar URL (optional)"
              value={newProfileAccAvatar}
              onChange={(e) => setNewProfileAccAvatar(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #e4e3da', fontSize: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{
                flex: 1, padding: '8px', background: '#1e2022', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}>
                <Check size={12} /> Save
              </button>
              <button type="button" onClick={() => setIsAddingProfileAcc(false)} style={{
                padding: '8px 12px', background: '#fff', border: '1px solid #e4e3da',
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
