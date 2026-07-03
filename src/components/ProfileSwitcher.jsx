import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

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

        {/* Pencil Edit Icon to manage accounts */}
        <button
          className="pencil-edit-icon"
          style={{ position: 'absolute', top: '16px', right: '16px', opacity: 1 }}
          title="Edit Profile"
          onClick={() => setActiveTab('settings')}
        >
          <Pencil size={12} />
        </button>
      </div>

      <div className="account-list-title">Switch Account</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {profileAccounts.filter(acc => acc.id !== activeProfile.id).map(acc => (
          <div
            key={acc.id}
            className="account-option-row"
            onClick={() => switchProfileAccount(acc.id)}
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
                style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}
                onClick={(e) => deleteProfileAccount(e, acc.id)}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
        <button
          className="add-account-row"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            padding: '8px 10px',
            fontSize: '13px',
            color: 'var(--accent-color)',
            fontWeight: '600',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'var(--transition)'
          }}
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
        >
          + Add Profile Account
        </button>
      </div>
    </div>
  );
}
