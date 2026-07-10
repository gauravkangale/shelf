import { useState } from 'react';
import { Trash2, LogOut, AlertTriangle, X, UserPlus } from 'lucide-react';

export default function ProfileSwitcher({
  activeProfile,
  profileAccounts,
  switchProfileAccount,
  isEditingProfileAccounts,
  // eslint-disable-next-line no-unused-vars
  setIsEditingProfileAccounts,
  deleteProfileAccount,
  // eslint-disable-next-line no-unused-vars
  isAddingProfileAcc,
  // eslint-disable-next-line no-unused-vars
  setIsAddingProfileAcc,
  // eslint-disable-next-line no-unused-vars
  addProfileAccount,
  // eslint-disable-next-line no-unused-vars
  newProfileAccName,
  // eslint-disable-next-line no-unused-vars
  setNewProfileAccName,
  // eslint-disable-next-line no-unused-vars
  newProfileAccEmail,
  // eslint-disable-next-line no-unused-vars
  setNewProfileAccEmail,
  // eslint-disable-next-line no-unused-vars
  newProfileAccAvatar,
  // eslint-disable-next-line no-unused-vars
  setNewProfileAccAvatar,
  setActiveTab,
  handleCompleteLogout
}) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Only show logout for real accounts, not the default guest
  const isLoggedIn = activeProfile && activeProfile.id !== 'guest';
  const otherAccounts = profileAccounts.filter(acc => acc.id !== activeProfile.id);

  const onLogoutConfirm = async () => {
    setLoggingOut(true);
    await new Promise(r => setTimeout(r, 500));
    handleCompleteLogout();
    // Reset in case we stayed on the page (account switched, not redirected)
    setLoggingOut(false);
    setShowLogoutConfirm(false);
  };

  return (
    <div className="ps-popup" onClick={(e) => e.stopPropagation()}>

      {/* ── Active account header ─────────────────────────────── */}
      <div className="ps-header">
        <img
          src={activeProfile.avatar || 'profile.png'}
          className="ps-avatar"
          alt={activeProfile.name}
          onError={e => { e.target.src = 'profile.png'; }}
        />
        <div className="ps-header-info">
          <div className="ps-name">
            {activeProfile.name}
            {activeProfile.username && (
              <span className="ps-username"> @{activeProfile.username}</span>
            )}
          </div>
          <div className="ps-email">{activeProfile.email}</div>
        </div>
      </div>

      {/* ── Other accounts ───────────────────────────────────── */}
      {otherAccounts.length > 0 && (
        <div className="ps-section">
          <div className="ps-section-label">Switch account</div>
          <div className="ps-account-list">
            {otherAccounts.map(acc => (
              <div
                key={acc.id}
                className="ps-account-row"
                onClick={() => switchProfileAccount(acc.id)}
              >
                <div className="ps-acc-avatar">{acc.name.charAt(0).toUpperCase()}</div>
                <div className="ps-acc-info">
                  <span className="ps-acc-name">
                    {acc.name}
                    {acc.username && <span className="ps-acc-handle"> @{acc.username}</span>}
                  </span>
                  <span className="ps-acc-email">{acc.email}</span>
                </div>
                {isEditingProfileAccounts && (
                  <button
                    className="ps-delete-btn"
                    onClick={(e) => deleteProfileAccount(e, acc.id)}
                    title="Remove account"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="ps-actions">

        {/* Add account — navigates in new tab */}
        <button
          className="ps-add-btn"
          onClick={() => { window.open('/login.html', '_blank'); }}
        >
          <UserPlus size={14} />
          Add account
        </button>

        {/* Log out — only shown when actually logged in */}
        {isLoggedIn && !showLogoutConfirm && (
          <button
            className="ps-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut size={14} />
            Log out
          </button>
        )}

        {/* Inline confirmation */}
        {isLoggedIn && showLogoutConfirm && (
          <div className="ps-logout-confirm">
            <div className="ps-logout-confirm-top">
              <AlertTriangle size={15} className="ps-warn-icon" />
              <span>Log out of this account?</span>
            </div>
            <p className="ps-logout-confirm-desc">
              {otherAccounts.length > 0
                ? "You'll be switched to another account."
                : "You'll be signed out completely."}
            </p>
            <div className="ps-logout-confirm-btns">
              <button
                className="ps-lc-cancel"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
              >
                <X size={12} /> Cancel
              </button>
              <button
                className="ps-lc-confirm"
                onClick={onLogoutConfirm}
                disabled={loggingOut}
              >
                {loggingOut
                  ? <><span className="ps-spinner" /> Signing out…</>
                  : <><LogOut size={12} /> Yes, log out</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
