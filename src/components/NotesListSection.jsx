  // eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { uGet, uSet } from '../utils/userKey';

export default function NotesListSection({ selectedDate }) {
  const [allNotes, setAllNotes] = useState(() => {
    return uGet('shelf_daily_notes', {});
  });

  const [newNoteText, setNewNoteText] = useState('');

  // Sync state if notes are modified elsewhere
  useEffect(() => {
    const handleSync = () => {
      const saved = uGet('shelf_daily_notes');
      if (saved) {
        setAllNotes(saved);
      }
    };
    window.addEventListener('notes-updated', handleSync);
    return () => window.removeEventListener('notes-updated', handleSync);
  }, []);

  const dateKey = selectedDate ? new Date(selectedDate).toDateString() : new Date().toDateString();

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote = {
      id: Date.now(),
      text: newNoteText.trim(),
      completed: false
    };

    const updated = {
      ...allNotes,
      [dateKey]: [...(allNotes[dateKey] || []), newNote]
    };

    setAllNotes(updated);
    uSet('shelf_daily_notes', updated);
    window.dispatchEvent(new Event('notes-updated'));
    setNewNoteText('');
  };

  return (
    <section className="friends-container" style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
      <div className="section-header" style={{ marginBottom: '4px' }}>
        <h2 className="calendar-title" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
          Plans List
        </h2>
      </div>
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
            background: 'var(--option-bg)',
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
            background: 'var(--accent-color, var(--danger-color))',
            boxShadow: 'none',
            border: 'none',
            color: 'var(--button-text)',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
        </button>
      </form>
    </section>
  );
}
