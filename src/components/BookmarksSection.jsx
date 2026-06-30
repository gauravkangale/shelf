import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, CheckSquare, Check, X, Plus } from 'lucide-react';
import { BOOK_COLORS, INITIAL_SHORTCUTS } from '../constants';
import BookShortcutModal from './BookShortcutModal';
import { uGet, uSet } from '../utils/userKey';

const SHORTCUTS_KEY = 'homepage_shortcuts';

// Flag set in onDragStart to distinguish reorder vs trash drags
let _dragTargetIsTrash = false;

export default function BookmarksSection() {
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = uGet(SHORTCUTS_KEY);
    if (saved) {
      if (saved.some(s => s.title === 'The World of Ice and Fire' || s.title === 'Fantastic Beasts')) {
        uSet(SHORTCUTS_KEY, INITIAL_SHORTCUTS);
        return INITIAL_SHORTCUTS;
      }
      return saved;
    }
    return INITIAL_SHORTCUTS;
  });

  useEffect(() => {
    const reload = () => {
      const saved = uGet(SHORTCUTS_KEY);
      setBookmarks(saved || INITIAL_SHORTCUTS);
    };
    window.addEventListener('user-switched', reload);
    return () => window.removeEventListener('user-switched', reload);
  }, []);

  // Selection mode states
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal open/close state for editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shortcutTitle, setShortcutTitle] = useState('');
  const [shortcutUrl, setShortcutUrl] = useState('');
  const [shortcutSubtitle, setShortcutSubtitle] = useState('');
  const [shortcutAuthor, setShortcutAuthor] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(BOOK_COLORS[0].gradient);
  const [shortcutCustomImage, setShortcutCustomImage] = useState('');
  const [shortcutKey, setShortcutKey] = useState('');
  const [editId, setEditId] = useState(null);

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Save bookmarks
  const saveBookmarksList = (newList) => {
    setBookmarks(newList);
    uSet(SHORTCUTS_KEY, newList);
  };

  // Selection handlers
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds([]);
  };

  const toggleSelectBookmark = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const deleteSelectedBookmarks = () => {
    if (selectedIds.length === 0) return;
    const remaining = bookmarks.filter(b => !selectedIds.includes(b.id));
    saveBookmarksList(remaining);
    setSelectedIds([]);
    setSelectMode(false);
  };

  // Open modal for editing
  const openEditModal = (item) => {
    setEditId(item.id);
    setShortcutTitle(item.title);
    setShortcutSubtitle(item.subtitle || '');
    setShortcutAuthor(item.author || '');
    setShortcutUrl(item.url);
    setShortcutKey(item.shortcutKey || '');
    setSelectedGradient(item.gradient);
    setShortcutCustomImage(item.customImage || '');
    setIsModalOpen(true);
  };

  // Open modal for new bookmark
  const openAddModal = () => {
    setEditId(null);
    setShortcutTitle('');
    setShortcutSubtitle('');
    setShortcutAuthor('');
    setShortcutUrl('');
    setShortcutKey('');
    setSelectedGradient(BOOK_COLORS[0].gradient);
    setShortcutCustomImage('');
    setIsModalOpen(true);
  };

  const handleSaveBookmark = (e) => {
    e.preventDefault();
    if (!shortcutTitle.trim() || !shortcutUrl.trim()) return;

    let formattedUrl = shortcutUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const key = shortcutKey.trim() || shortcutTitle.trim().charAt(0).toUpperCase();

    if (editId) {
      const updated = bookmarks.map(b => b.id === editId ? {
        ...b,
        title: shortcutTitle,
        subtitle: shortcutSubtitle,
        author: shortcutAuthor || 'Custom Link',
        url: formattedUrl,
        gradient: selectedGradient,
        shortcutKey: key.charAt(0).toUpperCase(),
        customImage: shortcutCustomImage
      } : b);
      saveBookmarksList(updated);
    } else {
      const newBookmark = {
        id: Date.now(),
        title: shortcutTitle,
        subtitle: shortcutSubtitle,
        author: shortcutAuthor || 'Custom Link',
        url: formattedUrl,
        gradient: selectedGradient,
        shortcutKey: key.charAt(0).toUpperCase(),
        customImage: shortcutCustomImage
      };
      saveBookmarksList([...bookmarks, newBookmark]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteSingle = (id) => {
    const remaining = bookmarks.filter(b => b.id !== id);
    saveBookmarksList(remaining);
    setIsModalOpen(false);
  };

  // ── Listen for global delete-bookmark event (fired by trash confirmation) ──
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.id;
      if (id !== undefined && id !== null) {
        const remaining = bookmarks.filter(b => String(b.id) !== String(id));
        saveBookmarksList(remaining);
      }
    };
    window.addEventListener('delete-bookmark', handler);
    return () => window.removeEventListener('delete-bookmark', handler);
  }, [bookmarks]);

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, index) => {
    const item = bookmarks[index];
    // Encode as "bookmark::<json>" so trash zone can identify it reliably
    // (Custom MIME types are unreliable across browsers; text/plain is safe)
    e.dataTransfer.setData('text/plain', `bookmark::${JSON.stringify({ id: item.id, title: item.title })}`);
    e.dataTransfer.effectAllowed = 'move';
    _dragTargetIsTrash = false;

    // Set indices asynchronously so the browser captures the drag image at full opacity first
    requestAnimationFrame(() => {
      setDraggedIndex(index);
      setDragOverIndex(index);
    });
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null) return;
    if (index === dragOverIndex) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    // Only reorder if not dropped on trash
    if (!_dragTargetIsTrash && draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const listCopy = [...bookmarks];
      const draggedItem = listCopy[draggedIndex];
      listCopy.splice(draggedIndex, 1);
      listCopy.splice(dragOverIndex, 0, draggedItem);
      saveBookmarksList(listCopy);
    }
    _dragTargetIsTrash = false;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--surface-bg)', marginLeft: '80px' }}>
      {/* Header bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 40px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--panel-bg)'
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', color: 'var(--forest-deep)', margin: 0 }}>Saved Bookmarks</h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--brass)', margin: '4px 0 0' }}>
            Arrange your digital bookshelf by dragging, editing, or managing bookmarks.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {selectMode ? (
            <>
              <button
                onClick={deleteSelectedBookmarks}
                disabled={selectedIds.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: selectedIds.length > 0 ? 'var(--rust)' : '#e4e3da',
                  color: selectedIds.length > 0 ? '#000000' : 'var(--brass)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontFamily: 'var(--sans)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                <Trash2 size={15} />
                Delete Selected ({selectedIds.length})
              </button>
              <button
                onClick={toggleSelectMode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f4f3eb',
                  color: 'var(--ink)',
                  border: '1px solid #c5bfb0',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontFamily: 'var(--sans)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openAddModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--accent-color, var(--danger-color))',
                  color: 'var(--button-text)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontFamily: 'var(--sans)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(232, 93, 86, 0.2)'
                }}
              >
                <Plus size={15} />
                Add Book
              </button>
              <button
                onClick={toggleSelectMode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--surface-bg)',
                  color: 'var(--ink)',
                  border: '1px solid #c5bfb0',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontFamily: 'var(--sans)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <CheckSquare size={15} />
                Select & Delete
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Bookshelf Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }} className="library-shelf-container">
        {bookmarks.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: 'var(--brass)',
            fontFamily: 'var(--sans)'
          }}>
            <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--forest-deep)', marginBottom: '8px' }}>Your Bookshelf is Empty</h2>
            <p>Click "Add Book" above to fill your library shelves.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 135px)',
            gap: '32px',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {bookmarks.map((item, idx) => {
              const isSelected = selectedIds.includes(item.id);
              const isDragging = draggedIndex !== null;
              const isDragOver = isDragging && dragOverIndex === idx && draggedIndex !== idx;

              return (
                <div
                  key={item.id}
                  draggable={!selectMode}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  style={{
                    position: 'relative',
                    cursor: selectMode ? 'pointer' : 'grab',
                    opacity: draggedIndex === idx ? 0.4 : 1,
                    userSelect: 'none',
                    zIndex: draggedIndex === idx ? 10 : 1,
                    transition: 'opacity 0.2s'
                  }}
                  onClick={() => {
                    if (selectMode) {
                      toggleSelectBookmark(item.id);
                    } else {
                      window.open(item.url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  {/* Select Mode Checkbox overlay */}
                  {selectMode && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      zIndex: 10,
                      background: isSelected ? 'var(--forest)' : 'var(--surface-bg)',
                      border: isSelected ? 'none' : '2px solid var(--brass)',
                      borderRadius: '4px',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--button-text)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}>
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                  )}

                  {/* Book Card wrapper */}
                  <div
                    className="book-card"
                    style={{
                      width: '135px',
                      margin: 0,
                      gap: '0px',
                      transform: isSelected ? 'scale(0.96) translateY(2px)' : (isDragOver ? 'scale(1.04)' : 'none'),
                      border: isSelected ? '2px solid var(--forest)' : (isDragOver ? '2px dashed var(--accent-color, var(--danger-color))' : 'none'),
                      boxShadow: isDragOver ? '0 8px 16px rgba(232, 93, 86, 0.25)' : 'none',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s'
                    }}
                  >
                    <div className="book-cover-wrapper" style={{ width: '135px', height: '203px', marginBottom: '8px' }}>
                      <div
                        className="book-cover"
                        style={{
                          backgroundImage: (item.customImage || item.coverImage) ? `url(${item.customImage || item.coverImage})` : item.gradient,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <div className="book-cover-content">
                          <span className="shortcut-badge">
                            {item.shortcutKey}
                          </span>

                          {/* Pencil Edit Icon at top-right corner */}
                          {!selectMode && (
                            <button
                              className="pencil-edit-icon"
                              title="Edit Bookmark Details"
                              style={{ opacity: 1 }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openEditModal(item);
                              }}
                            >
                              <Pencil size={11} />
                            </button>
                          )}

                          <div className="book-cover-title" style={{ fontSize: '13px' }}>{item.title}</div>
                          <div className="book-cover-author" style={{ fontSize: '9px' }}>{item.author}</div>
                        </div>
                      </div>
                    </div>

                    {/* Title & Subtitle below card */}
                    <div style={{ padding: '0 4px 8px' }}>
                      <div className="book-card-title" style={{
                        fontFamily: 'var(--sans)',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.title}
                      </div>
                      <div className="book-card-subtitle" style={{
                        fontFamily: 'var(--sans)',
                        fontSize: '10px',
                        color: 'var(--brass)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px'
                      }}>
                        {item.subtitle || 'Website link'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BookShortcutModal reusable component for adding / editing */}
      <BookShortcutModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        editId={editId}
        saveShortcut={handleSaveBookmark}
        shortcutTitle={shortcutTitle}
        setShortcutTitle={setShortcutTitle}
        shortcutSubtitle={shortcutSubtitle}
        setShortcutSubtitle={setShortcutSubtitle}
        shortcutAuthor={shortcutAuthor}
        setShortcutAuthor={setShortcutAuthor}
        shortcutUrl={shortcutUrl}
        setShortcutUrl={setShortcutUrl}
        shortcutKey={shortcutKey}
        setShortcutKey={setShortcutKey}
        selectedGradient={selectedGradient}
        setSelectedGradient={setSelectedGradient}
        shortcutCustomImage={shortcutCustomImage}
        setShortcutCustomImage={setShortcutCustomImage}
        deleteShortcut={handleDeleteSingle}
      />
    </div >
  );
}
