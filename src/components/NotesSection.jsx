import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

export default function NotesSection({ selectedDate }) {
  const [allNotes, setAllNotes] = useState(() => {
    const saved = localStorage.getItem('shelf_daily_notes');
    return saved ? JSON.parse(saved) : {};
  });

  const [newNoteText, setNewNoteText] = useState('');

  useEffect(() => {
    localStorage.setItem('shelf_daily_notes', JSON.stringify(allNotes));
    window.dispatchEvent(new Event('notes-updated'));
  }, [allNotes]);

  const dateKey = selectedDate ? new Date(selectedDate).toDateString() : new Date().toDateString();
  const currentNotes = allNotes[dateKey] || [];

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote = {
      id: Date.now(),
      text: newNoteText.trim(),
      completed: false
    };

    setAllNotes((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newNote]
    }));
    setNewNoteText('');
  };

  const handleToggleNote = (noteId) => {
    setAllNotes((prev) => {
      const updatedNotes = (prev[dateKey] || []).map((note) =>
        note.id === noteId ? { ...note, completed: !note.completed } : note
      );
      return {
        ...prev,
        [dateKey]: updatedNotes
      };
    });
  };

  const handleDeleteNote = (noteId) => {
    setAllNotes((prev) => {
      const updatedNotes = (prev[dateKey] || []).filter((note) => note.id !== noteId);
      return {
        ...prev,
        [dateKey]: updatedNotes
      };
    });
  };

  const handleDragStart = (e, noteId) => {
    e.dataTransfer.setData('text/plain', noteId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  // Listen for delete event from Header's trash bin
  useEffect(() => {
    const handleDeleteEvent = (e) => {
      if (e.detail && e.detail.id) {
        handleDeleteNote(e.detail.id);
      }
    };
    window.addEventListener('delete-note', handleDeleteEvent);
    return () => {
      window.removeEventListener('delete-note', handleDeleteEvent);
    };
  }, [allNotes, dateKey]);

  const formattedDateLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Today';

  return (
    <section className="friends-container" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
      <div className="section-header" style={{ marginBottom: '4px' }}>
        <h2 className="calendar-title" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
          Plans & Notes — {formattedDateLabel}
        </h2>
      </div>

      {/* Note Input */}
      <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Add a plan or note..."
          style={{
            flex: 1,
            fontSize: '13px',
            padding: '8px 12px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            background: '#faf9f5',
            fontFamily: 'var(--font-sans)',
            outline: 'none'
          }}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
        />
        <button
          type="submit"
          className="primary-btn"
          style={{
            padding: '0',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-color, #e85d56)',
            boxShadow: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
        </button>
      </form>

      {/* Notes List */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
        {currentNotes.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '4px 0' }}>
            No plans set for this day.
          </p>
        ) : (
          currentNotes.map((note) => (
            <div
              key={note.id}
              draggable
              onDragStart={(e) => handleDragStart(e, note.id)}
              onClick={() => handleToggleNote(note.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 12px',
                background: note.completed ? 'rgba(0, 0, 0, 0.02)' : '#fff',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                cursor: 'grab',
                transition: 'var(--transition)',
                opacity: note.completed ? 0.5 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                userSelect: 'none'
              }}
              title="Drag me to the trash in the header to delete"
            >
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-primary)',
                  textDecoration: note.completed ? 'line-through' : 'none',
                  transition: 'opacity 0.2s'
                }}
              >
                • {note.text}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
