import React, { useState, useRef } from 'react';
import { uGet, uSet, uRemove } from '../utils/userKey';

const STORAGE_KEY = 'welcome_decoration_index';
const CUSTOM_IMG_KEY = 'welcome_decoration_custom';

const DECORATION_IMAGES = [
  { src: '/mpage.png', label: 'Dark Roses' },
  { src: '/1.jpeg', label: 'Pattern 1' },
  { src: '/2.jpeg', label: 'Pattern 2' },
  { src: '/3.jpeg', label: 'Pattern 3' },
  { src: '/4.jpeg', label: 'Pattern 4' },
  { src: '/5.jpeg', label: 'Pattern 5' },
  { src: '/6.jpeg', label: 'Pattern 6' },
  { src: '/fan.png', label: 'Fan' },
];

export default function WelcomeCard({ activeProfileName, setActiveTab }) {
  const graphicRef = useRef(null);
  const uploadRef = useRef(null);

  const [decoIndex, setDecoIndex] = useState(() => {
    const saved = uGet(STORAGE_KEY);
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  const [customImg, setCustomImg] = useState(() => uGet(CUSTOM_IMG_KEY) || null);
  const [showPicker, setShowPicker] = useState(false);

  const handleMouseMove = (e) => {
    if (!graphicRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    graphicRef.current.style.transform = `rotateX(${-y * 35}deg) rotateY(${x * 35}deg) scale(1.06)`;
    graphicRef.current.style.transition = 'transform 0.1s ease-out';
  };

  const handleMouseLeave = () => {
    if (!graphicRef.current) return;
    graphicRef.current.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    graphicRef.current.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
  };

  const selectDeco = (idx) => {
    setDecoIndex(idx);
    setCustomImg(null);
    uSet(STORAGE_KEY, String(idx));
    uRemove(CUSTOM_IMG_KEY);
    setShowPicker(false);
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setCustomImg(dataUrl);
      uSet(CUSTOM_IMG_KEY, dataUrl);
      setShowPicker(false);
    };
    reader.readAsDataURL(file);
  };

  const activeSrc = customImg || DECORATION_IMAGES[decoIndex]?.src || '/mpage.png';
  const activeLabel = customImg ? 'Custom upload' : (DECORATION_IMAGES[decoIndex]?.label || 'Dark Roses');

  return (
    <section className="welcome-card-container">

      {/* ── Left info ──────────────────────────────────────── */}
      <div className="welcome-info">
        <h1 className="welcome-title">
          Happy reading,<br />
          <span className="welcome-name">{activeProfileName}</span>
        </h1>
        <p className="welcome-text">
          Wow! you've delved deep into the wizarding world's secrets.
          Have Harry's parents died yet? Oops, looks like you're not there yet.
          Get reading now!
        </p>
        <button
          className="primary-btn"
          onClick={() => {
            setActiveTab?.('home');
            setTimeout(() => {
              document.getElementById('current-reading-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }}
        >
          Start reading ↗
        </button>
      </div>

      {/* ── Animated open-book ─────────────────────────────── */}
      <div className="open-book-banner" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div className="open-book-graphic" ref={graphicRef}>
          <div className="book-page-left">
            <div className="page-chapter">Chapter XVI</div>
            <div className="page-text-line medium"></div>
            <div className="page-text-line"></div>
            <div className="page-text-line short"></div>
            <div className="page-text-line"></div>
            <div className="page-text-line medium"></div>
            <div className="page-text-line"></div>
            <div className="page-text-line short"></div>
            <div className="page-text-line medium"></div>
            <div className="page-text-line"></div>
            <div className="page-text-line short"></div>
          </div>
          <div className="book-spine"></div>
          <div className="book-page-right">
            <img
              src={activeSrc}
              alt={activeLabel}
              onClick={() => setShowPicker(true)}
              style={{
                display: 'block', width: '120px', height: '130px',
                objectFit: 'contain', borderRadius: '6px',
                cursor: 'pointer', transition: 'opacity 0.2s', margin: '0 auto',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              title="Click to change decoration"
            />
            <div className="page-text-line medium" style={{ marginTop: '8px' }}></div>
            <div className="page-text-line"></div>
            <div className="page-text-line short"></div>
          </div>
        </div>
      </div>

      {/* ── Picker modal ───────────────────────────────────── */}
      {showPicker && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowPicker(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'color-mix(in srgb, var(--overlay-color) 55%, transparent)',
              backdropFilter: 'blur(6px)',
              animation: 'fadeBackdrop 0.2s ease',
            }}
          />

          {/* Modal */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%', zIndex: 1001,
            transform: 'translate(-50%, -50%)',
            background: 'var(--picker-bg)',
            borderRadius: '20px',
            border: '1px solid var(--picker-border)',
            boxShadow: 'var(--shadow-lg)',
            padding: '28px', width: '400px', maxWidth: '92vw',
            animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif, Georgia)', fontSize: '18px', fontWeight: '600', color: 'var(--ink)' }}>
                  Choose decoration
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Shown on right page of your open book
                </div>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                style={{
                  background: 'var(--picker-close-bg)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px', color: 'var(--text-secondary)', flexShrink: 0,
                }}
              >✕</button>
            </div>

            {/* Upload button */}
            <button
              onClick={() => uploadRef.current?.click()}
              style={{
                width: '100%', padding: '11px 16px', marginBottom: '16px',
                background: 'linear-gradient(135deg, var(--picker-item-bg), var(--picker-upload-bg))',
                border: '1.5px dashed var(--border-color)',
                borderRadius: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)',
                fontFamily: 'inherit', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <span style={{ fontSize: '18px' }}>📎</span>
              Upload your own image
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '400' }}>
                JPG, PNG, WebP
              </span>
            </button>
            <input ref={uploadRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--picker-divider)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>OR CHOOSE PRESET</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--picker-divider)' }} />
            </div>

            {/* Image grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>

              {/* Custom upload tile */}
              {customImg && (
                <button
                  onClick={() => setShowPicker(false)}
                  title="Your upload"
                  style={{
                    padding: 0, borderRadius: '12px', cursor: 'pointer',
                    border: '2.5px solid var(--accent-color)',
                    background: 'var(--picker-item-bg)', overflow: 'hidden',
                    aspectRatio: '1', position: 'relative',
                    boxShadow: '0 4px 16px color-mix(in srgb, var(--accent-color) 28%, transparent)',
                  }}
                >
                  <img src={customImg} alt="Custom" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{
                    position: 'absolute', bottom: '4px', right: '4px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--accent-color)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: 'var(--button-text)', fontWeight: '700',
                  }}>✓</div>
                </button>
              )}

              {DECORATION_IMAGES.map((img, idx) => {
                const isSelected = !customImg && idx === decoIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => selectDeco(idx)}
                    title={img.label}
                    style={{
                      padding: 0, borderRadius: '12px', cursor: 'pointer',
                      border: `2.5px solid ${isSelected ? 'var(--accent-color)' : 'transparent'}`,
                      background: 'var(--picker-item-bg)', overflow: 'hidden',
                      aspectRatio: '1', position: 'relative', transition: 'all 0.15s',
                      transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                      boxShadow: isSelected
                        ? '0 4px 16px color-mix(in srgb, var(--accent-color) 28%, transparent)'
                        : 'var(--shadow-sm)',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--picker-border)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <img src={img.src} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {isSelected && (
                      <div style={{
                        position: 'absolute', bottom: '4px', right: '4px',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: 'var(--accent-color)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', color: 'var(--button-text)', fontWeight: '700',
                      }}>✓</div>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Selected: {activeLabel}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeBackdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.88); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </section>
  );
}