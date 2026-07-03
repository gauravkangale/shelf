import React, { useState, useEffect } from 'react';
import { LogOut, Shield, Palette, Bell, Lock, Trash2, ChevronRight, Settings as SettingsIcon, Pipette } from 'lucide-react';
import { THEME_LIST, THEME_COLOR_ROLES, applyTheme, DEFAULT_THEME_KEY, getSavedThemeOverrides } from '../utils/themePresets';

export default function SettingsPage({ activeProfile, updateActiveProfile, profileAccounts, deleteProfileAccount, switchProfileAccount }) {
  const [settingSection, setSettingSection] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Profile Settings State
  const [name, setName] = useState(activeProfile?.name || '');
  const [username, setUsername] = useState(activeProfile?.username || '');
  const [email, setEmail] = useState(activeProfile?.email || '');
  const [avatar, setAvatar] = useState(activeProfile?.avatar || '');
  const [phone, setPhone] = useState(activeProfile?.phone || '');
  const [bio, setBio] = useState(activeProfile?.bio || '');

  // App Settings State
  const [themeMode, setThemeMode] = useState(localStorage.getItem('shelf_theme_mode') || 'light');
  const [themeKey, setThemeKey] = useState(localStorage.getItem('shelf_theme_key') || DEFAULT_THEME_KEY);
  const [textTone, setTextTone] = useState(localStorage.getItem('shelf_text_tone') || 'standard');
  const [themeOverrides, setThemeOverrides] = useState(() => getSavedThemeOverrides());
  const [notifications, setNotifications] = useState(JSON.parse(localStorage.getItem('shelf_notifications') || '{"enabled": true, "sound": true, "desktop": true}'));
  const [privacy, setPrivacy] = useState(JSON.parse(localStorage.getItem('shelf_privacy') || '{"profilePublic": true, "allowFriendRequests": true}'));

  const fileInputRef = React.useRef(null);
  const [isHoveredAvatar, setIsHoveredAvatar] = useState(false);
  const [activeColorPickerKey, setActiveColorPickerKey] = useState(null);

  useEffect(() => {
    setName(activeProfile?.name || '');
    setUsername(activeProfile?.username || '');
    setEmail(activeProfile?.email || '');
    setAvatar(activeProfile?.avatar || '');
    setPhone(activeProfile?.phone || '');
    setBio(activeProfile?.bio || '');
  }, [activeProfile]);

  useEffect(() => {
    applyTheme(themeKey, textTone, themeOverrides);
    localStorage.setItem('shelf_theme_key', themeKey);
    localStorage.setItem('shelf_text_tone', textTone);
    localStorage.setItem('shelf_theme_overrides', JSON.stringify(themeOverrides));
  }, [themeKey, textTone, themeOverrides]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem('shelf_theme_mode', themeMode);
  }, [themeMode]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawBase64 = event.target.result;
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const MAX = 400;
            let w = img.width;
            let h = img.height;

            if (w > h && w > MAX) {
              h = (h * MAX) / w;
              w = MAX;
            } else if (h > MAX) {
              w = (w * MAX) / h;
              h = MAX;
            }

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext("2d");
            if (!ctx) return setAvatar(rawBase64);

            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL("image/jpeg", 0.7);
            setAvatar(compressed);
          } catch (err) {
            setAvatar(rawBase64);
          }
        };
        img.onerror = () => setAvatar(rawBase64);
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback('');

    if (!username.trim() || !/^[a-zA-Z0-9_]{3,15}$/.test(username.trim())) {
      setFeedback('error: Username must be 3-15 characters (letters, numbers, underscores only)');
      setLoading(false);
      return;
    }

    const result = await updateActiveProfile(name, username, email, avatar);
    if (result?.success) {
      setFeedback('success: Profile updated successfully');
      setTimeout(() => setFeedback(''), 3000);
    } else {
      setFeedback(`error: ${result?.error || 'Failed to update profile'}`);
    }
    setLoading(false);
  };

  const handleNotificationChange = (key, value) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem('shelf_notifications', JSON.stringify(updated));
    const keyName = key === 'enabled' ? 'Notifications' : key === 'sound' ? 'Sound' : 'Desktop Alerts';
    setFeedback(`success: ${keyName} ${value ? 'enabled' : 'disabled'}`);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handlePrivacyChange = (key, value) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    localStorage.setItem('shelf_privacy', JSON.stringify(updated));
    const keyName = key === 'profilePublic' ? 'Profile Visibility' : 'Friend Requests';
    setFeedback(`success: ${keyName} ${value ? 'enabled' : 'disabled'}`);
    setTimeout(() => setFeedback(''), 3000);
  };

  const updateThemeOverride = (key, value) => {
    setThemeOverrides(prev => ({ ...prev, [key]: value }));
  };

  const resetThemeOverrides = () => {
    setThemeOverrides({});
    localStorage.removeItem('shelf_theme_overrides');
    setFeedback('success: Custom colors reset');
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('shelf_auth_token');
    localStorage.removeItem('shelf_current_user');
    setFeedback('success: Logged out');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you absolutely sure? This action cannot be undone.')) {
      deleteProfileAccount({ stopPropagation: () => { } }, activeProfile.id);
      if (profileAccounts.length > 1) {
        const remaining = profileAccounts.filter(p => p.id !== activeProfile.id);
        switchProfileAccount(remaining[0].id);
      }
      setFeedback('success: Account deleted');
    }
  };

  const renderProfileSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Profile Information</h2>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={() => setIsHoveredAvatar(true)}
          onMouseLeave={() => setIsHoveredAvatar(false)}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: avatar ? 'transparent' : 'var(--option-bg)',
            border: '2px solid var(--border-color)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative'
          }}
        >
          {avatar ? (
            <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: '40px', color: 'var(--text-secondary)' }}>{name?.charAt(0) || '?'}</div>
          )}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--button-text)',
            fontSize: '12px',
            fontWeight: 700,
            opacity: isHoveredAvatar ? 1 : 0,
            transition: 'opacity 0.2s'
          }}>
            Upload
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
          Bio
        </label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={160}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '14px',
            boxSizing: 'border-box',
            fontFamily: 'var(--sans)',
            resize: 'none',
            height: '80px'
          }}
          placeholder="Tell others about yourself (max 160 characters)"
        />
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{bio.length}/160</div>
      </div>

      <button
        onClick={handleProfileUpdate}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: 'var(--accent-color)',
          color: 'var(--button-text)',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: '14px',
          alignSelf: 'flex-start'
        }}
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  );

  const renderAppearanceSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Appearance</h2>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>
          Color Theme
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, auto)',
            gap: '10px',
          }}
        >
          {THEME_LIST.map(color => (
            <button
              key={color.key}
              onClick={() => {
                setThemeKey(color.key);
                setThemeOverrides({});
                localStorage.removeItem('shelf_theme_overrides');
                setFeedback(`success: Theme changed to ${color.name}`);
                setTimeout(() => setFeedback(''), 3000);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '14px',
                border: themeKey === color.key ? `2px solid ${color.accentColor}` : `1px solid ${color.borderColor}`,
                borderRadius: '8px',
                background: color.surface,
                color: color.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: color.background,
                  border: `1px solid ${color.borderColor}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: color.textPrimary }}>{color.name}</div>
                <div style={{ fontSize: '10px', color: color.textSecondary, marginTop: '2px' }}>{color.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>
          Display Mode
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Light', 'Dark', 'Auto'].map(t => (
            <button
              key={t}
              onClick={() => {
                setThemeMode(t.toLowerCase());
                setFeedback(`success: Display mode set to ${t}`);
                setTimeout(() => setFeedback(''), 3000);
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: themeMode === t.toLowerCase() ? `2px solid var(--accent-color)` : `1px solid var(--border-color)`,
                borderRadius: '8px',
                background: themeMode === t.toLowerCase() ? 'var(--option-bg)' : 'var(--surface-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>
          Text Tone
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { key: 'standard', label: 'Standard' },
            { key: 'soft', label: 'Soft' },
            { key: 'strong', label: 'Strong' }
          ].map(option => (
            <button
              key={option.key}
              onClick={() => {
                setTextTone(option.key);
                setFeedback(`success: Text tone set to ${option.label}`);
                setTimeout(() => setFeedback(''), 3000);
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: textTone === option.key ? `2px solid var(--accent-color)` : `1px solid var(--border-color)`,
                borderRadius: '8px',
                background: textTone === option.key ? 'var(--option-bg)' : 'var(--surface-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Fine Tune Colors
          </label>
          <button
            type="button"
            onClick={resetThemeOverrides}
            style={{
              padding: '7px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'var(--surface-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            Reset
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '10px',
          maxHeight: '360px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {Object.entries(THEME_COLOR_ROLES).map(([key, role]) => {
            const preset = THEME_LIST.find(theme => theme.key === themeKey) || THEME_LIST[0];
            const value = themeOverrides[key] || preset[key];
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--surface-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                  position: 'relative'
                }}
              >
                <span style={{ userSelect: 'none' }}>{role.label}</span>

                {/* Visual Swatch Color Selector Box */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveColorPickerKey(activeColorPickerKey === key ? null : key);
                  }}
                  style={{
                    width: '36px',
                    height: '28px',
                    border: '2px solid var(--surface-bg)',
                    outline: '1.5px solid var(--border-color)',
                    borderRadius: '6px',
                    background: value,
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    padding: 0
                  }}
                  aria-label={`Configure color for ${role.label}`}
                />

                {/* Custom Color Picker Popover */}
                {activeColorPickerKey === key && (
                  <>
                    {/* Fixed overlay to capture outside clicks and close popover */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveColorPickerKey(null);
                      }}
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99,
                        background: 'transparent',
                        cursor: 'default'
                      }}
                    />

                    {/* Popover Panel */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '36px',
                        right: '12px',
                        width: '180px',
                        background: 'var(--panel-bg, #ffffff)',
                        border: '1.5px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0,0,0,0.08))',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        animation: 'fadeInScale 0.12s ease-out'
                      }}
                    >
                      {/* Sub-label */}
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', fontWeight: 700 }}>
                        Preset Swatches
                      </div>

                      {/* Presets Swatches Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '5px'
                      }}>
                        {[
                          '#B33933', '#C74B68', '#2F6DB2', '#2D8F83', '#A56B2C', '#2E3A2E',
                          '#1E2022', '#5F6267', '#FCFAF2', '#EDF5FE', '#DDF4EF', '#FFFFFF'
                        ].map((swatchColor) => {
                          const isSwatchSelected = value.toLowerCase() === swatchColor.toLowerCase();
                          return (
                            <button
                              key={swatchColor}
                              type="button"
                              onClick={() => {
                                updateThemeOverride(key, swatchColor);
                              }}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: swatchColor,
                                border: isSwatchSelected ? '2px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.15)',
                                cursor: 'pointer',
                                padding: 0,
                                boxShadow: isSwatchSelected ? '0 0 0 2px var(--surface-bg)' : 'none',
                                transform: isSwatchSelected ? 'scale(1.1)' : 'none',
                                transition: 'all 0.1s'
                              }}
                              title={swatchColor}
                            />
                          );
                        })}
                      </div>

                      {/* Divider */}
                      <div style={{ height: '1px', background: 'var(--border-color)' }} />

                      {/* Inputs row */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* HEX input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>HEX</span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.startsWith('#') || val.length <= 7) {
                                updateThemeOverride(key, val);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              background: 'var(--surface-bg)',
                              color: 'var(--text-primary)',
                              outline: 'none',
                              textAlign: 'center'
                            }}
                          />
                        </div>

                        {/* Custom Button Triggering Native Color Picker */}
                        <button
                          type="button"
                          onClick={() => {
                            document.getElementById(`hidden-picker-${key}`)?.click();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: 'var(--surface-bg)',
                            color: 'var(--text-primary)',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--option-bg)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-bg)'}
                        >
                          <Pipette size={11} />
                          <span>Advanced Picker</span>
                        </button>

                        {/* Hidden native input color picker */}
                        <input
                          id={`hidden-picker-${key}`}
                          type="color"
                          value={value.startsWith('#') && (value.length === 4 || value.length === 7) ? value : '#ffffff'}
                          onChange={e => updateThemeOverride(key, e.target.value)}
                          style={{
                            position: 'absolute',
                            width: 0,
                            height: 0,
                            opacity: 0,
                            border: 'none',
                            pointerEvents: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Notifications</h2>

      {[
        { key: 'enabled', label: 'Enable Notifications', desc: 'Receive all notifications' },
        { key: 'sound', label: 'Sound Effects', desc: 'Play sound for new notifications' },
        { key: 'desktop', label: 'Desktop Notifications', desc: 'Show system notifications' }
      ].map(item => (
        <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{item.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.desc}</div>
          </div>
          <input
            type="checkbox"
            checked={notifications[item.key]}
            onChange={e => handleNotificationChange(item.key, e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </div>
      ))}
    </div>
  );

  const renderPrivacySection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Privacy & Security</h2>

      {[
        { key: 'profilePublic', label: 'Public Profile', desc: 'Allow others to see your profile' },
        { key: 'allowFriendRequests', label: 'Friend Requests', desc: 'Allow users to send you friend requests' }
      ].map(item => (
        <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{item.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.desc}</div>
          </div>
          <input
            type="checkbox"
            checked={privacy[item.key]}
            onChange={e => handlePrivacyChange(item.key, e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </div>
      ))}

      <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>🔒 Your data is encrypted and never shared with third parties.</div>
        <button style={{
          padding: '8px 16px',
          background: 'var(--accent-color)',
          color: 'var(--button-text)',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 700
        }}>
          View Privacy Policy
        </button>
      </div>
    </div>
  );

  const renderAccountSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Account</h2>

      <div style={{ padding: '16px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Account ID</div>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {activeProfile?.id ? `ID-${activeProfile.id.slice(0, 8).toUpperCase()}` : 'GUEST-001'}
        </div>
      </div>

      <div style={{ padding: '16px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Active Session</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Logged in as {activeProfile?.name || 'Guest'}
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            background: 'var(--danger-color)',
            color: 'var(--button-text)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );

  const sections = [
    { id: 'profile', label: 'Profile', icon: SettingsIcon, render: renderProfileSection },
    { id: 'appearance', label: 'Appearance', icon: Palette, render: renderAppearanceSection },
    { id: 'notifications', label: 'Notifications', icon: Bell, render: renderNotificationsSection },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, render: renderPrivacySection },
    { id: 'account', label: 'Account', icon: Lock, render: renderAccountSection }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      padding: '32px',
      marginLeft: '80px',
      minHeight: '100vh',
      background: 'var(--bg-color)',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-5px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
      {/* Sidebar Navigation */}
      <div style={{
        width: '220px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Settings</div>
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setSettingSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                border: 'none',
                background: settingSection === section.id ? 'var(--panel-bg)' : 'transparent',
                borderLeft: settingSection === section.id ? `3px solid var(--accent-color)` : 'none',
                borderRadius: settingSection === section.id ? '0 8px 8px 0' : '8px',
                cursor: 'pointer',
                color: settingSection === section.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: settingSection === section.id ? 700 : 600,
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={18} />
              {section.label}
              {settingSection === section.id && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '32px',
        width: '1000px'
      }}>
        {feedback && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            background: feedback.startsWith('error') ? 'rgba(232, 93, 86, .08)' : 'rgba(179, 57, 51, .08)',
            color: 'var(--accent-color)',
            border: `1px solid var(--border-color)`,
            textTransform: 'uppercase',
            fontFamily: 'monospace'
          }}>
            {feedback}
          </div>
        )}

        {sections.find(s => s.id === settingSection)?.render()}
      </div>
    </div>
  );
}
