  // eslint-disable-next-line no-unused-vars
import React from 'react';
import { Trash2, Upload } from 'lucide-react';
import { BOOK_COLORS, PRESET_COVERS } from '../constants';

export default function BookShortcutModal({
  isModalOpen,
  setIsModalOpen,
  editId,
  saveShortcut,
  shortcutTitle,
  setShortcutTitle,
  shortcutSubtitle,
  setShortcutSubtitle,
  shortcutAuthor,
  setShortcutAuthor,
  shortcutUrl,
  setShortcutUrl,
  shortcutKey,
  setShortcutKey,
  selectedGradient,
  setSelectedGradient,
  shortcutCustomImage,
  setShortcutCustomImage,
  deleteShortcut
}) {
  if (!isModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{editId ? 'Edit Shortcut Book' : 'Add Shortcut Book'}</h3>

        <form onSubmit={saveShortcut}>
          <div className="form-group">
            <label className="form-label">Book Title</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. GitHub, Reddit, Wikipedia"
              value={shortcutTitle}
              onChange={(e) => setShortcutTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Website URL</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. github.com"
              value={shortcutUrl}
              onChange={(e) => setShortcutUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subtitle (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Code Repo, Dev Community"
              value={shortcutSubtitle}
              onChange={(e) => setShortcutSubtitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Author Name (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Linus Torvalds, Community"
              value={shortcutAuthor}
              onChange={(e) => setShortcutAuthor(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Ctrl' : 'Alt'} Key Shortcut
            </label>
            <input
              type="text"
              className="form-input"
              maxLength="1"
              placeholder={`e.g. H for ${(typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Ctrl' : 'Alt')}+H`}
              value={shortcutKey}
              onChange={(e) => setShortcutKey(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Cover Theme Gradient</label>
            <div className="color-picker">
              {BOOK_COLORS.map((c) => (
                <div
                  key={c.name}
                  className={`color-option ${selectedGradient === c.gradient ? 'selected' : ''}`}
                  style={{ background: c.gradient }}
                  title={c.name}
                  onClick={() => setSelectedGradient(c.gradient)}
                ></div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Custom Cover Image URL</label>
            <div className="file-upload-container">
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Paste URL of image (or select a preset below)"
                value={shortcutCustomImage}
                onChange={(e) => setShortcutCustomImage(e.target.value)}
              />
              <label className="file-upload-label">
                <Upload size={16} />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                          setShortcutCustomImage(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            {shortcutCustomImage && (
              <button
                type="button"
                className="engine-pill"
                style={{ alignSelf: 'flex-start', marginTop: '4px', background: 'rgba(0,0,0,0.05)', padding: '4px 10px' }}
                onClick={() => setShortcutCustomImage('')}
              >
                Clear Image (Use Gradient)
              </button>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Choose Preset Cover/Page Style</label>
            <div className="preset-cover-picker">
              {PRESET_COVERS.map((preset) => {
                const normalizedCustom = (shortcutCustomImage || '').replace(/^\.\//, '/');
                const normalizedPreset = (preset.coverImage || '').replace(/^\.\//, '/');
                return (
                  <div
                    key={preset.name}
                    className={`preset-cover-option ${normalizedCustom === normalizedPreset ? 'selected' : ''}`}
                    style={{ backgroundImage: `url(${preset.coverImage})` }}
                    title={preset.name}
                    onClick={() => setShortcutCustomImage(preset.coverImage)}
                  ></div>
                );
              })}
            </div>
          </div>

          <div className="modal-actions">
            {editId && (
              <button
                type="button"
                className="btn-danger"
                style={{ marginRight: 'auto' }}
                onClick={() => deleteShortcut(editId)}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              style={{ borderRadius: '20px', padding: '10px 20px' }}
            >
              Save Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
