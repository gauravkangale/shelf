import React, { useState, useEffect } from 'react';
import { uGet, uSet } from '../utils/userKey';

const ROTATIONS = ['-1.5deg', '1deg', '-2deg', '1.5deg', '0.5deg'];

export default function NotesInputSection({ selectedDate }) {
  const [allNotes, setAllNotes] = useState(() => {
    return uGet('shelf_daily_notes', {});
  });

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
  const currentNotes = allNotes[dateKey] || [];

  const handleToggleNote = (noteId) => {
    const updated = {
      ...allNotes,
      [dateKey]: (allNotes[dateKey] || []).map((note) =>
        note.id === noteId ? { ...note, completed: !note.completed } : note
      )
    };
    setAllNotes(updated);
    uSet('shelf_daily_notes', updated);
    window.dispatchEvent(new Event('notes-updated'));
  };

  const handleDeleteNote = (noteId) => {
    const updated = {
      ...allNotes,
      [dateKey]: (allNotes[dateKey] || []).filter((note) => note.id !== noteId)
    };
    setAllNotes(updated);
    uSet('shelf_daily_notes', updated);
    window.dispatchEvent(new Event('notes-updated'));
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
    <section style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {/* Import handwriting font and style rules */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap');
      `}</style>

      {/* SVG filter to generate hand-drawn crayon paper effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id="torn-paper-edge">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--text-primary)', margin: 0, fontWeight: '600' }}>
        Plans & Notes — {formattedDateLabel}
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxHeight: '120px', overflowY: 'auto', padding: '6px 2px 6px' }}>
        {currentNotes.length === 0 ? (
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '2px 0' }}>
            No plans for this day.
          </p>
        ) : (
          currentNotes.map((note, index) => {
            const rotation = ROTATIONS[index % ROTATIONS.length];

            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onClick={() => handleToggleNote(note.id)}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'grab',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  opacity: note.completed ? 0.5 : 1,
                  transform: note.completed ? 'none' : `rotate(${rotation})`,
                  userSelect: 'none',
                  marginTop: '8px',
                  width: 'fit-content',
                  minWidth: '85px',
                  maxWidth: '150px',
                  minHeight: '65px',
                }}
                onMouseEnter={(e) => {
                  if (!note.completed) {
                    e.currentTarget.style.transform = `scale(1.05) rotate(${rotation})`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!note.completed) {
                    e.currentTarget.style.transform = `rotate(${rotation})`;
                  }
                }}
                title="Drag me to the trash in the header to delete"
              >
                {/* Spiral Rings Hook at the top (exact match to the reference image) */}
                <div style={{
                  position: 'absolute',
                  top: '-9px',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'space-around',
                  padding: '0 10px',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}>
                  {[1, 2, 3, 4].map((i) => (
                    <svg key={i} width="10" height="14" viewBox="0 0 12 18" fill="none" style={{ filter: 'drop-shadow(0px 0.5px 0.5px rgba(0,0,0,0.15))' }}>
                      <path
                        d="M 2 16 C 1 8, 2.5 1.5, 6 1.5 C 9.5 1.5, 11 8, 10 16"
                        stroke="#ffd64f"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  ))}
                </div>

                {/* Torn paper note container with crayon styling */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '65px',
                  padding: '14px 10px 10px 10px',
                  background: note.completed ? '#eae8e0' : '#fefbf2',
                  border: 'none',
                  borderRadius: '2px',
                  filter: note.completed ? 'none' : 'url(#torn-paper-edge) drop-shadow(2px 3px 5px rgba(0,0,0,0.06))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontFamily: "'Caveat', cursive",
                      fontWeight: '700',
                      color: note.completed ? '#8a826f' : '#2d241e',
                      textDecoration: note.completed ? 'line-through' : 'none',
                      lineHeight: '1.3',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      width: '100%'
                    }}
                  >
                    {note.text}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
