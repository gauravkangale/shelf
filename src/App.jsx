import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Homepage from './components/Homepage';
import BookmarksSection from './components/BookmarksSection';
import FriendsSection from './components/FriendsSection';
import SettingsPage from './components/SettingsPage';
import ReadingTimer from './components/ReadingTimer';
import './App.css';
import { userKey } from './utils/userKey';
import { cachedFetch } from './utils/apiCache';
import { applyTheme, DEFAULT_THEME_KEY } from './utils/themePresets';
import ProfileModal from './components/ProfileModal';

// ── Profile Settings Sub-component ──
function ProfileSettings({ activeProfile, updateActiveProfile }) {
  const [name, setName] = useState(activeProfile.name || '');
  const [username, setUsername] = useState(activeProfile.username || '');
  const [email, setEmail] = useState(activeProfile.email || '');
  const [avatar, setAvatar] = useState(activeProfile.avatar || './profile.jpeg');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isHoveredPhoto, setIsHoveredPhoto] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(activeProfile.name || '');
    setUsername(activeProfile.username || '');
    setEmail(activeProfile.email || '');
    setAvatar(activeProfile.avatar || './profile.jpeg');
    setSaveSuccess(false);
    setErrorMessage('');
  }, [activeProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSaveSuccess(false);

    if (!username.trim()) {
      setErrorMessage('Username is mandatory.');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username.trim())) {
      setErrorMessage('Username must be 3-15 characters and contain only letters, numbers, or underscores.');
      return;
    }

    const cleanedUsername = username.trim().toLowerCase();
    const originalUsername = activeProfile.username?.trim().toLowerCase();

    const result = await updateActiveProfile(
      name,
      username,
      email,
      avatar
    );
    if (result && result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setErrorMessage(result ? result.error : 'Failed to update profile.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const profileUrl = `${window.location.origin}/u/${username.trim().toLowerCase() || 'guest'}`;

  return (
    <div className="settings-panel" style={{
      maxHeight: '100vh',
      overflowY: 'auto',
      width: '100%',
      padding: '40px',
      marginLeft: '80px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'var(--bg-color)',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>

        {/* Main Library Card container */}
        <div className="library-card" style={{
          background: 'var(--library-card-bg)',
          border: '1px solid var(--library-card-border)',
          borderTop: '8px solid var(--rust)', // vintage red top strip
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

            {/* Vintage QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  border: '1px solid var(--library-card-border)',
                  padding: '3px',
                  background: 'var(--library-card-bg)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '2px',
                  userSelect: 'none'
                }}
                title={`Profile Link: ${profileUrl}`}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&color=2b2927&bgcolor=fcfaf2&margin=0&data=${encodeURIComponent(profileUrl)}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt="Profile QR Code"
                />
              </div>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--brass)', marginTop: '2px' }}>
                {activeProfile.id ? `ID-${activeProfile.id.slice(0, 8).toUpperCase()}` : 'GUEST-001'}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Profile Info block with Stapled Avatar Photo */}
            <div style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>

              {/* Photo Area with Staple effect */}
              <div
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onMouseEnter={() => setIsHoveredPhoto(true)}
                onMouseLeave={() => setIsHoveredPhoto(false)}
                style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                title="Click photo to alter image"
              >
                {/* Staple simulation */}
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '30px',
                  width: '24px',
                  height: '6px',
                  border: '1px solid #7a7263',
                  background: '#c5bfb0',
                  borderRadius: '1px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  transform: 'rotate(-4deg)',
                  zIndex: 3
                }}></div>

                {/* Image */}
                <div style={{
                  width: '96px',
                  height: '112px',
                  border: '1.5px solid var(--library-card-border)',
                  background: '#eae6d9',
                  padding: '4px',
                  borderRadius: '2px',
                  boxShadow: '2px 4px 10px rgba(0,0,0,0.08)',
                  transform: 'rotate(-2deg)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {avatar ? (
                    <img
                      src={avatar}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'sepia(0.15) contrast(1.05)'
                      }}
                      alt={name}
                    />
                  ) : (
                    <div style={{
                      fontSize: '32px',
                      color: '#b5ae9f',
                      fontFamily: 'var(--serif)',
                      fontWeight: '700'
                    }}>
                      {name ? name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}

                  {/* Elegant Hover Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(179, 57, 51, 0.85)',
                    color: 'var(--library-card-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    padding: '4px',
                    opacity: isHoveredPhoto ? 1 : 0,
                    transition: 'opacity 0.2s',
                    zIndex: 2
                  }}>
                    ALTER IMAGE
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>

              {/* Input Fields sitting on Ruled Notebook lines */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Name */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--brass)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Borrower Name</label>
                  <input
                    type="text"
                    style={{
                      border: 'none',
                      borderBottom: '1.5px solid #a8cce0',
                      background: 'transparent',
                      fontFamily: 'var(--serif)',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#3e3a35',
                      padding: '4px 0',
                      outline: 'none'
                    }}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full Name"
                    required
                  />
                </div>

                {/* Username */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--brass)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Username</label>
                  <input
                    type="text"
                    style={{
                      border: 'none',
                      borderBottom: '1.5px solid #a8cce0',
                      background: 'transparent',
                      fontFamily: 'var(--serif)',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#3e3a35',
                      padding: '4px 0',
                      outline: 'none'
                    }}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="username"
                    required
                  />
                </div>

                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--brass)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Digital Mail Address</label>
                  <input
                    type="email"
                    style={{
                      border: 'none',
                      borderBottom: '1.5px solid #a8cce0',
                      background: 'transparent',
                      fontFamily: 'var(--serif)',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#3e3a35',
                      padding: '4px 0',
                      outline: 'none'
                    }}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div style={{
                background: 'rgba(232, 93, 86, .08)',
                borderLeft: '3px solid var(--danger-color)',
                color: 'var(--danger-color)',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚠ ERROR: {errorMessage.toUpperCase()}
              </div>
            )}

            {saveSuccess && (
              <div style={{
                background: 'rgba(179, 57, 51, .06)',
                borderLeft: '3px solid var(--rust)',
                color: 'var(--rust)',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ✓ CARD RECORD UPDATED SUCCESSFULLY
              </div>
            )}

            {/* Retro Action Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="stamp-btn" style={{
                padding: '12px 28px',
                fontFamily: 'var(--serif)',
                fontWeight: '600',
                fontSize: '15px',
                letterSpacing: '0.02em',
                background: 'var(--rust)',
                color: 'var(--library-card-bg)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(179, 57, 51, 0.2)',
                transition: 'all 0.2s ease'
              }}>
                Update Library Card
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Navigation active tab with URL hash persistence
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '').split('/')[0];
    const validTabs = ['home', 'library', 'timer', 'bookmarks', 'settings', 'more'];
    return validTabs.includes(hash) ? hash : 'home';
  });

  // Keep state and URL hash synchronized, supporting browser back/forth navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').split('/')[0];
      const validTabs = ['home', 'library', 'timer', 'bookmarks', 'settings', 'more'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      } else {
        setActiveTab('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const currentHash = window.location.hash.replace('#', '').split('/')[0];
    if (currentHash !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Global profile accounts state
  const [profileAccounts, setProfileAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem('profile_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deduplicate in case glitch already occurred
        const unique = [];
        const seenEmails = new Set();
        parsed.forEach(acc => {
          if (acc.email && !seenEmails.has(acc.email)) {
            unique.push(acc);
            seenEmails.add(acc.email);
          } else if (!acc.email) {
            unique.push(acc); // keep accounts without email just in case
          }
        });
        return unique;
      }
      return [];
    } catch {
      return [];
    }
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeProfile = profileAccounts.find(acc => acc.active) || profileAccounts[0] || {
    id: 'guest',
    name: 'Guest User',
    email: 'guest@local.browser',
    avatar: './profile.jpeg'
  };

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEditingProfileAccounts, setIsEditingProfileAccounts] = useState(false);
  const [isAddingProfileAcc, setIsAddingProfileAcc] = useState(false);
  const [newProfileAccName, setNewProfileAccName] = useState('');
  const [newProfileAccEmail, setNewProfileAccEmail] = useState('');
  const [newProfileAccAvatar, setNewProfileAccAvatar] = useState('');

  const [profileCardUser, setProfileCardUser] = useState(null);

  // Persist profile accounts (preserving auth tokens for multi-account login persistence)
  useEffect(() => {
    // Force deduplication on state updates (helps with HMR state preservation)
    const unique = [];
    const seenEmails = new Set();
    let hasDuplicates = false;
    
    profileAccounts.forEach(acc => {
      if (acc.email) {
        const lowerEmail = acc.email.toLowerCase();
        if (!seenEmails.has(lowerEmail)) {
          unique.push(acc);
          seenEmails.add(lowerEmail);
        } else {
          hasDuplicates = true;
        }
      } else {
        unique.push(acc);
      }
    });

    if (hasDuplicates) {
  // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileAccounts(unique);
    } else {
      localStorage.setItem('profile_accounts', JSON.stringify(profileAccounts));
    }
  }, [profileAccounts]);

  useEffect(() => {
    const savedThemeKey = localStorage.getItem('shelf_theme_key') || DEFAULT_THEME_KEY;
    const savedTextTone = localStorage.getItem('shelf_text_tone') || 'standard';
    applyTheme(savedThemeKey, savedTextTone);
    const savedMode = localStorage.getItem('shelf_theme_mode') || 'light';
    document.documentElement.dataset.theme = savedMode;
  }, []);

  // Switch to Library/chat tab when "Message" is clicked anywhere (e.g. from profile cards)
  useEffect(() => {
    const handleOpenChat = () => setActiveTab('library');
    window.addEventListener('open-direct-chat', handleOpenChat);
    return () => window.removeEventListener('open-direct-chat', handleOpenChat);
  }, []);


  // Self-heal: If token is present in localStorage but not in active profileAccount, sync it
  useEffect(() => {
    const token = localStorage.getItem('shelf_auth_token');
    if (token) {
  // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileAccounts(prev => prev.map(acc => {
        if (acc.active && !acc.token) {
          return { ...acc, token };
        }
        return acc;
      }));
    }
  }, []);

  // Critical: On mount, sync shelf_current_user with real server UUID via /api/auth/me
  // This fixes cases where the stored id is a timestamp or stale value instead of the DB UUID
  useEffect(() => {
    const syncRealUserId = async () => {
      const token = localStorage.getItem('shelf_auth_token');
      if (!token) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            localStorage.removeItem('shelf_auth_token');
            localStorage.removeItem('shelf_current_user');
            window.location.href = '/login.html';
          }
          return;
        }
        const data = await res.json();
        const serverUser = data.user || data;
        if (!serverUser?.id) return;

        // Update localStorage with real server data
        const current = JSON.parse(localStorage.getItem('shelf_current_user') || '{}');
        const updated = {
          ...current,
          id: serverUser.id,
          username: serverUser.username || current.username,
          name: serverUser.name || current.name,
          avatar_url: serverUser.avatar_url || current.avatar_url,
          avatar: serverUser.avatar_url || current.avatar,
          bio: serverUser.bio || current.bio
        };
        localStorage.setItem('shelf_current_user', JSON.stringify(updated));

        // Sync preferences to localStorage if they exist
        if (serverUser.preferences) {
          if (serverUser.preferences.notifications) {
            localStorage.setItem('shelf_notifications', JSON.stringify(serverUser.preferences.notifications));
          }
          if (serverUser.preferences.privacy) {
            localStorage.setItem('shelf_privacy', JSON.stringify(serverUser.preferences.privacy));
          }
          // trigger storage event so SettingsPage updates if it's open
          window.dispatchEvent(new Event('storage'));
        }

        // Also update the active profile in state with the real DB id
        setProfileAccounts(prev => prev.map(acc => {
          if (acc.active) return { ...acc, id: serverUser.id, username: serverUser.username || acc.username, name: serverUser.name || acc.name };
          return acc;
        }));

        window.dispatchEvent(new Event('user-switched'));
      } catch {
        // Silently ignore — user may be offline or token expired
      }
    };
    syncRealUserId();
  }, []);


  // Switch active profile account
  const switchProfileAccount = (id) => {
    const updated = profileAccounts.map(acc => ({
      ...acc,
      active: acc.id === id
    }));
    setProfileAccounts(updated);
    const newlyActive = updated.find(acc => acc.active);
    if (newlyActive) {
      if (newlyActive.token) {
        localStorage.setItem('shelf_auth_token', newlyActive.token);
      } else {
        localStorage.removeItem('shelf_auth_token');
      }
      localStorage.setItem('shelf_current_user', JSON.stringify({
        id: newlyActive.id,
        name: newlyActive.name,
        username: newlyActive.username,
        email: newlyActive.email,
        phone: newlyActive.phone,
        avatar_url: newlyActive.avatar,
        avatar: newlyActive.avatar,
        bio: newlyActive.bio
      }));
      // Notify all components that the user context changed
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('reader-activity-updated'));
      window.dispatchEvent(new Event('user-switched')); // ← reload scoped data
    }
  };

  const addProfileAccount = (e) => {
    e.preventDefault();
    if (!newProfileAccName.trim() || !newProfileAccEmail.trim()) return;
    
    const emailToUse = newProfileAccEmail.trim().toLowerCase();
    
    // Prevent adding if account with email already exists
    if (profileAccounts.some(acc => acc.email?.toLowerCase() === emailToUse)) {
      alert("An account with this email is already connected.");
      return;
    }

    const newAcc = {
      id: Date.now().toString(),
      name: newProfileAccName.trim(),
      email: emailToUse,
      avatar: newProfileAccAvatar.trim(),
      active: false
    };
    setProfileAccounts([...profileAccounts, newAcc]);
    setNewProfileAccName('');
    setNewProfileAccEmail('');
    setNewProfileAccAvatar('');
    setIsAddingProfileAcc(false);
  };

  // Delete a profile account
  const deleteProfileAccount = (e, id) => {
    e.stopPropagation();
    const updated = profileAccounts.filter(acc => acc.id !== id);
    if (updated.length > 0 && !updated.some(acc => acc.active)) {
      updated[0].active = true;
    }
    setProfileAccounts(updated);
  };

  // Update active profile details
  const updateActiveProfile = async (name, username, email, avatar, phone, bio) => {
    const token = localStorage.getItem('shelf_auth_token');
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanAvatar = avatar ? avatar.trim() : '';
    const cleanPhone = phone ? phone.trim() : '';
    const cleanBio = bio ? bio.trim() : '';

    if (token) {
      try {
        const res = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail,
            avatar_url: cleanAvatar,
            phone: cleanPhone,
            bio: cleanBio
          })
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to update database record.' };
        }
      } catch (err) {
        console.error(err);
        return { success: false, error: 'Database connection failed. Changes saved locally only.' };
      }
    }

    setProfileAccounts(prevAccounts => {
      const updated = prevAccounts.map(acc => {
        if (acc.id === activeProfile.id) {
          return {
            ...acc,
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail,
            avatar: cleanAvatar,
            phone: cleanPhone,
            bio: cleanBio
          };
        }
        return acc;
      });
      return updated;
    });

    // Sync shelf_current_user in localStorage
    try {
      localStorage.setItem('shelf_current_user', JSON.stringify({
        id: activeProfile.id,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        avatar_url: cleanAvatar,
        avatar: cleanAvatar,
        phone: cleanPhone,
        bio: cleanBio
      }));
    } catch (e) {
      console.warn("Could not save profile to localStorage, it might be too large:", e);
    }

    // Dispatch events to update all open tabs and components
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('user-switched'));

    return { success: true };
  };

  // Handle popup window login success
  useEffect(() => {
    const handleLoginSuccess = (userData) => {
      // ── Immediately persist auth to localStorage so all components can read it ──
      if (userData.token) {
        localStorage.setItem('shelf_auth_token', userData.token);
      }
      localStorage.setItem('shelf_current_user', JSON.stringify({
        id: userData.id,
        name: userData.name,
        username: userData.username || '',
        email: userData.email || '',
        phone: userData.phone || '',
        avatar_url: userData.avatar_url || userData.avatar || './profile.jpeg',
        avatar: userData.avatar || userData.avatar_url || './profile.jpeg',
        bio: userData.bio || '',
      }));

      setProfileAccounts(prevAccounts => {
        const existing = prevAccounts.find(acc =>
          (userData.email && acc.email === userData.email) ||
          (userData.phone && acc.phone === userData.phone)
        );
        if (existing) {
          return prevAccounts.map(acc => {
            const isMatch = (userData.email && acc.email === userData.email) ||
              (userData.phone && acc.phone === userData.phone);
            if (isMatch) {
              return {
                ...acc,
                name: userData.name || acc.name,
                username: userData.username || acc.username || '',
                email: userData.email || acc.email || '',
                phone: userData.phone || acc.phone || '',
                avatar: userData.avatar || userData.avatar_url || acc.avatar || './profile.jpeg',
                bio: userData.bio || acc.bio || '',
                token: userData.token || acc.token,
                id: userData.id || acc.id, // Ensure real UUID overwrites timestamp id
                active: true
              };
            }
            return { ...acc, active: false };
          });
        } else {
          const newAcc = {
            id: userData.id,   // Always use server-provided UUID
            name: userData.name || userData.email || userData.phone || 'Member',
            username: userData.username || '',
            email: userData.email || '',
            phone: userData.phone || '',
            avatar: userData.avatar || userData.avatar_url || '',
            bio: userData.bio || '',
            token: userData.token || '',
            active: true
          };
          return prevAccounts.map(acc => ({ ...acc, active: false })).concat(newAcc);
        }
      });

      // Notify all components that the user context changed
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('reader-activity-updated'));
      window.dispatchEvent(new Event('user-switched'));
      setIsProfileDropdownOpen(false);
    };

    window.handleLoginSuccess = handleLoginSuccess;

    const handleStorageEvent = (e) => {
      if (e.key === 'shelf_login_event' && e.newValue) {
        try {
          const { user } = JSON.parse(e.newValue);
          if (user) {
            handleLoginSuccess(user);
            localStorage.removeItem('shelf_login_event');
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      delete window.handleLoginSuccess;
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Handle open profile modal event
  useEffect(() => {
    const handleOpenProfileModal = (e) => {
      if (e.detail?.user) {
        setProfileCardUser(e.detail.user);
      }
    };
    window.addEventListener('open-profile-modal', handleOpenProfileModal);
    return () => window.removeEventListener('open-profile-modal', handleOpenProfileModal);
  }, []);

  // Notes DB Sync Manager — scoped to current user
  useEffect(() => {
    const notesKey = () => userKey('shelf_daily_notes');
    let lastNotesJson = localStorage.getItem(notesKey()) || '{}';

    const syncNotesFromServer = async () => {
      const token = localStorage.getItem('shelf_auth_token');
      if (!token) return;

      try {
        const data = await cachedFetch('/api/notes', {
          headers: { 'Authorization': `Bearer ${token}` }
        }, 15000);

        // Convert array to grouped object
        const grouped = {};
        if (data.notes && Array.isArray(data.notes)) {
          data.notes.forEach(note => {
            if (note && note.dateKey) {
              const dk = note.dateKey;
              if (!grouped[dk]) grouped[dk] = [];
              grouped[dk].push({
                id: note.id && !isNaN(note.id) ? Number(note.id) : note.id,
                text: note.text || '',
                completed: !!note.completed
              });
            }
          });
        }

        const groupedJson = JSON.stringify(grouped);
        if (groupedJson !== localStorage.getItem(notesKey())) {
          localStorage.setItem(notesKey(), groupedJson);
          lastNotesJson = groupedJson;
          window.dispatchEvent(new Event('notes-updated'));
        }
      } catch {
        // Silently ignore — user may be offline
      }
    };

    // Initial sync from server on mount/auth change
    syncNotesFromServer();

    const handleNotesUpdated = async () => {
      const token = localStorage.getItem('shelf_auth_token');
      if (!token) return;

      const currentNotesJson = localStorage.getItem(notesKey()) || '{}';
      if (currentNotesJson === lastNotesJson) return;

      try {
        const oldNotes = JSON.parse(lastNotesJson);
        const newNotes = JSON.parse(currentNotesJson);
        lastNotesJson = currentNotesJson;

        // Flatten helper
        const flatten = (obj) => {
          if (!obj || typeof obj !== 'object') return [];
          const arr = [];
          Object.entries(obj).forEach(([dateKey, list]) => {
            if (Array.isArray(list)) {
              list.forEach(item => {
                if (item) {
                  arr.push({ ...item, dateKey });
                }
              });
            }
          });
          return arr;
        };

        const oldFlat = flatten(oldNotes);
        const newFlat = flatten(newNotes);

        // Find added or updated notes — sync in parallel
        const saveOps = [];
        for (const item of newFlat) {
          const oldItem = oldFlat.find(x => x.id === item.id);
          if (!oldItem || oldItem.text !== item.text || oldItem.completed !== item.completed || oldItem.dateKey !== item.dateKey) {
            saveOps.push(
              fetch('/api/notes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  id: item.id,
                  dateKey: item.dateKey,
                  text: item.text,
                  completed: item.completed
                })
              })
            );
          }
        }

        // Find deleted notes — sync in parallel
        const deleteOps = [];
        for (const item of oldFlat) {
          const newItem = newFlat.find(x => x.id === item.id);
          if (!newItem) {
            deleteOps.push(
              fetch(`/api/notes/${item.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              })
            );
          }
        }

        await Promise.all([...saveOps, ...deleteOps]);
        if (saveOps.length || deleteOps.length) {
          window.dispatchEvent(new Event('reader-activity-updated'));
        }
  // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // Silently ignore sync errors (user may be offline or not logged in)
      }
    };

    window.addEventListener('notes-updated', handleNotesUpdated);
    return () => {
      window.removeEventListener('notes-updated', handleNotesUpdated);
    };
  }, [activeProfile]);

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifierActive = isMac ? e.ctrlKey : e.altKey;

      if (isModifierActive && e.key) {
        const saved = localStorage.getItem(userKey('homepage_shortcuts'));
        if (saved) {
          try {
            const shortcuts = JSON.parse(saved);
            const matchingShortcut = shortcuts.find(
              s => s.shortcutKey && s.shortcutKey.toLowerCase() === e.key.toLowerCase()
            );
            if (matchingShortcut) {
              e.preventDefault();
              window.open(matchingShortcut.url, '_blank');
            }
          } catch (err) {
            console.error(err);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderContent = () => {
    const placeholderStyle = {
      flex: 1,
      padding: '40px',
      fontFamily: 'var(--sans)',
      color: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      height: '100vh',
      boxSizing: 'border-box',
      marginLeft: '80px'
    };

    const headingStyle = {
      fontFamily: 'var(--serif)',
      fontSize: '32px',
      fontWeight: '600',
      color: 'var(--forest-deep)',
      marginBottom: '12px'
    };

    const textStyle = {
      color: 'var(--text-secondary)',
      fontSize: '15px',
      maxWidth: '400px',
      lineHeight: '1.6'
    };

    switch (activeTab) {
      case 'home':
        return (
          <Homepage
            activeProfile={activeProfile}
            profileAccounts={profileAccounts}
            switchProfileAccount={switchProfileAccount}
            isEditingProfileAccounts={isEditingProfileAccounts}
            setIsEditingProfileAccounts={setIsEditingProfileAccounts}
            deleteProfileAccount={deleteProfileAccount}
            isAddingProfileAcc={isAddingProfileAcc}
            setIsAddingProfileAcc={setIsAddingProfileAcc}
            addProfileAccount={addProfileAccount}
            newProfileAccName={newProfileAccName}
            setNewProfileAccName={setNewProfileAccName}
            newProfileAccEmail={newProfileAccEmail}
            setNewProfileAccEmail={setNewProfileAccEmail}
            newProfileAccAvatar={newProfileAccAvatar}
            setNewProfileAccAvatar={setNewProfileAccAvatar}
            isProfileDropdownOpen={isProfileDropdownOpen}
            setIsProfileDropdownOpen={setIsProfileDropdownOpen}
            setActiveTab={setActiveTab}
          />
        );
      case 'library':
        return <FriendsSection setActiveTab={setActiveTab} />;
      case 'timer':
        return (
          <div className="flex-1 w-full h-full">
            {/* Make sure this is here! */}
            <ReadingTimer username={activeProfile?.username || 'reader'} />
          </div>
        );
      case 'bookmarks':
        return <BookmarksSection />;
      case 'settings':
        return (
          <ProfileSettings
            activeProfile={activeProfile}
            updateActiveProfile={updateActiveProfile}
          />
        );
      case 'more':
        return (
          <SettingsPage
            activeProfile={activeProfile}
            updateActiveProfile={updateActiveProfile}
            profileAccounts={profileAccounts}
            deleteProfileAccount={deleteProfileAccount}
            switchProfileAccount={switchProfileAccount}
          />
        );
      default:
        return <Homepage />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      {renderContent()}
      
      {profileCardUser && (
        <ProfileModal
          user={profileCardUser}
          currentUserId={activeProfile?.id}
          onClose={() => setProfileCardUser(null)}
        />
      )}
    </div>
  );
}

export default App;
