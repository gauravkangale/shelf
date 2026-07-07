import React from 'react';
import { Pencil, Trash2, AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import ProfileSwitcher from './ProfileSwitcher';
import CalendarTimeline from './CalendarTimeline';
import FriendsList from './FriendsList';
import NotesListSection from './NotesListSection';

export default function RightSidebar({
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
  isProfileDropdownOpen,
  setIsProfileDropdownOpen,
  selectedDate,
  setSelectedDate,
  visibleMonthYear,
  setVisibleMonthYear,
  goToToday,
  calendarDaysList,
  calendarContainerRef,
  handleCalendarScroll
}) {
  const DEFAULT_BOOK = {
    title: 'The Divine Segregation',
    currentPage: '163',
    totalPages: '300',
    description: 'The dark purple device fused to his left eye granted him omnipotent vision. A technology that could teleport anything directly into his desired location.',
    author: 'grvua'
  };

  const [book, setBook] = React.useState(DEFAULT_BOOK);
  const [isEditing, setIsEditing] = React.useState(false);

  const [editTitle, setEditTitle] = React.useState('');
  const [editCurrentPage, setEditCurrentPage] = React.useState('');
  const [editTotalPages, setEditTotalPages] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');
  const [editAuthor, setEditAuthor] = React.useState('');
  const [notification, setNotification] = React.useState('');

  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  const confirmDeleteLocalData = () => {
    setShowClearConfirm(true);
  };

  const handleDeleteLocalData = async () => {
    setShowClearConfirm(false);
    
    const token = localStorage.getItem('shelf_auth_token');
    if (!token) return;

    try {
      const res = await fetch('/api/local-data', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification('Local data cleared successfully!');
        setTimeout(() => setNotification(''), 3000);
        localStorage.removeItem(`current_book_${activeProfile.email}`);
        setBook(DEFAULT_BOOK);
        window.dispatchEvent(new Event('notes-updated'));
      } else {
        setNotification('Failed to clear data.');
        setTimeout(() => setNotification(''), 3000);
      }
  // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setNotification('Error clearing data.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const isLoggedIn = React.useMemo(() => {
    const usersJson = localStorage.getItem('registered_users');
    if (!usersJson) return false;
    try {
      const users = JSON.parse(usersJson);
      return users.some(u => u.email === activeProfile.email);
  // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return false;
    }
  }, [activeProfile]);

  React.useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsEditing(false);
    
    // First, try local storage as a quick fallback to avoid UI flashing
    const localBook = localStorage.getItem(`current_book_${activeProfile.email}`);
    if (localBook) {
      try {
        setBook(JSON.parse(localBook));
      } catch {
        setBook(DEFAULT_BOOK);
      }
    } else {
      setBook(DEFAULT_BOOK);
    }
    
    // Then, fetch real data from backend
    const fetchBook = async () => {
      const token = localStorage.getItem('shelf_auth_token');
      if (!token) return;
      try {
        const res = await fetch('/api/books/current', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.book && data.book.title) {
            setBook(data.book);
            // Cache locally
            localStorage.setItem(`current_book_${activeProfile.email}`, JSON.stringify(data.book));
          }
        }
  // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // Silently ignore network errors
      }
    };
    
    fetchBook();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  const handleSaveBook = async (e) => {
    e.preventDefault();

    const updatedBook = {
      title: editTitle.trim(),
      currentPage: editCurrentPage.trim(),
      totalPages: editTotalPages.trim(),
      description: editDesc.trim(),
      author: editAuthor.trim(),
    };

    setBook(updatedBook);

    // Save for this profile locally for immediate feedback
    localStorage.setItem(
      `current_book_${activeProfile.email}`,
      JSON.stringify(updatedBook)
    );

    setIsEditing(false);
    
    // Save to backend
    const token = localStorage.getItem('shelf_auth_token');
    if (token) {
      try {
        await fetch('/api/books/current', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedBook)
        });
      } catch (err) {
        console.error('Failed to sync book to server', err);
      }
    }
  };
  const startEditing = () => {
    setEditTitle(book.title);
    setEditCurrentPage(book.currentPage);
    setEditTotalPages(book.totalPages);
    setEditDesc(book.description);
    setEditAuthor(book.author);
    setIsEditing(true);
  };

  return (
    <aside className="info-sidebar">
      {/* 1. Profile Area */}
      <div className="profile-area">
        <button
          className="clear-data-icon"
          style={{ width: '28px', height: '28px', cursor: 'pointer', background: 'var(--option-bg)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
          title="Clear Local Data"
          onClick={(e) => {
            e.stopPropagation();
            confirmDeleteLocalData();
          }}
        >
          <Trash2 size={14} color="var(--forest-deep)" />
        </button>
        <div
          className="user-profile"
          onClick={(e) => {
            e.stopPropagation();
            setIsProfileDropdownOpen(!isProfileDropdownOpen);
          }}
        >
          <img
            src={activeProfile.avatar || activeProfile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"}
            className="avatar"
            alt={activeProfile.name}
            onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"; }}
          />
          <span className="username">{activeProfile.name}</span>
        </div>

        {notification && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--forest-deep)',
            color: 'var(--library-card-bg)',
            padding: '12px 24px',
            borderRadius: '8px',
            fontFamily: 'var(--sans)',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
          }}>
            {notification}
          </div>
        )}

        {/* Profile Switcher Popup Dropdown */}
        {isProfileDropdownOpen && (
          <ProfileSwitcher
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
          />
        )}
      </div>

      {/* Overlay Modal for Clear Data */}
      {showClearConfirm && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-primary, #fbfaf8)',
            padding: '32px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            position: 'relative',
            textAlign: 'center'
          }}>
            <button
              onClick={() => setShowClearConfirm(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--brass, #b08953)'
              }}
            >
              <X size={20} />
            </button>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(179, 53, 51, 0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: 'var(--rust, #b33533)'
            }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{
              fontFamily: 'var(--serif)', fontSize: '22px',
              color: 'var(--forest-deep)', margin: '0 0 12px',
              fontWeight: 600
            }}>Clear Local Data?</h3>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: '14px',
              color: '#7a7263', margin: '0 0 24px', lineHeight: 1.5
            }}>
              Are you sure you want to clear your local heavy data (books, notes)? This won't affect your main login info on NeonDB.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: '1px solid var(--brass, #b08953)',
                  background: 'transparent', color: 'var(--brass, #b08953)',
                  fontFamily: 'var(--sans)', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >Cancel</button>
              <button
                onClick={handleDeleteLocalData}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: 'none', background: 'var(--rust, #b33533)',
                  color: 'white', fontFamily: 'var(--sans)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
              >Clear Data</button>
            </div>
          </div>
        </div>,
        document.getElementById('root') || document.body
      )}

      {/* 2. Current Book Info Card */}
      <section className="current-book-card" style={{ position: 'relative' }}>
        {isEditing ? (
          <form onSubmit={handleSaveBook} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '13px', padding: '6px 8px' }}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Book Title"
              required
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                className="form-input"
                style={{ flex: 1, fontSize: '13px', padding: '6px 8px' }}
                value={editCurrentPage}
                onChange={e => setEditCurrentPage(e.target.value)}
                placeholder="Page"
                required
              />
              <input
                type="number"
                className="form-input"
                style={{ flex: 1, fontSize: '13px', padding: '6px 8px' }}
                value={editTotalPages}
                onChange={e => setEditTotalPages(e.target.value)}
                placeholder="Total"
                required
              />
            </div>
            <textarea
              className="form-input"
              style={{ minHeight: '60px', resize: 'vertical', fontSize: '13px', padding: '6px 8px' }}
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Description"
              required
            />
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '13px', padding: '6px 8px' }}
              value={editAuthor}
              onChange={e => setEditAuthor(e.target.value)}
              placeholder="Author"
              required
            />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" className="engine-pill" style={{ padding: '4px 10px' }} onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="engine-pill active" style={{ padding: '4px 10px' }}>Save</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 className="current-book-title">{book.title}</h2>
              <button
                className="pencil-edit-icon"
                style={{
                  opacity: 1,
                  position: "static",
                  width: "22px",
                  height: "22px",
                  cursor: "pointer",
                }}
                onClick={startEditing}
                title="Edit Book Details"
              >
                <Pencil size={10} />
              </button>
            </div>
            <div className="page-progress">
              <span className="active-num">{book.currentPage}</span>
              <span className="total-num">/ {book.totalPages} pages</span>
            </div>
            <p className="current-book-description">{book.description}</p>
            <div className="author-signature">- {book.author}</div>
          </>
        )}
      </section>

      <CalendarTimeline
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        visibleMonthYear={visibleMonthYear}
        setVisibleMonthYear={setVisibleMonthYear}
        goToToday={goToToday}
        calendarDaysList={calendarDaysList}
        calendarContainerRef={calendarContainerRef}
        handleCalendarScroll={handleCalendarScroll}
      />

      {/* 4. Plans List (Note Pills) */}
      <NotesListSection selectedDate={selectedDate} />

      {/* 5. Friends List */}
      <FriendsList />
    </aside>
  );
}
