import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import WelcomeCard from './WelcomeCard';
import BookShelf from './BookShelf';
import NewSeriesCollection from './NewSeriesCollection';
import RightSidebar from './RightSidebar';
import BookShortcutModal from './BookShortcutModal';
import NotesInputSection from './NotesInputSection';
import { BOOK_COLORS, INITIAL_SHORTCUTS } from '../constants';
import { uGet, uSet } from '../utils/userKey';

export default function Homepage({
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
  setActiveTab
}) {
  // Search Engine & query states
  const [searchEngine, setSearchEngine] = useState('google'); // 'google' or 'shelf'
  const [searchQuery, setSearchQuery] = useState('');

  const healShortcuts = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map(s => {
      const copy = { ...s };
      if (copy.coverImage && copy.coverImage.startsWith('./')) {
        copy.coverImage = copy.coverImage.substring(1);
      }
      if (copy.customImage && copy.customImage.startsWith('./')) {
        copy.customImage = copy.customImage.substring(1);
      }
      if (!copy.coverImage && !copy.customImage) {
        const titleLower = (copy.title || '').toLowerCase();
        if (titleLower.includes('gmail')) copy.coverImage = '/1.jpeg';
        else if (titleLower.includes('youtube')) copy.coverImage = '/2.jpeg';
        else if (titleLower.includes('linkedin')) copy.coverImage = '/3.jpeg';
        else if (titleLower.includes('github')) copy.coverImage = '/4.jpeg';
        else if (titleLower.includes('portfolio')) copy.coverImage = '/5.jpeg';
      }
      return copy;
    });
  };

  // Shortcuts/bookmarks shelf
  const [shortcuts, setShortcuts] = useState(() => {
    // Quick fallback
    const saved = uGet('homepage_shortcuts');
    if (saved) return healShortcuts(saved);
    return healShortcuts(INITIAL_SHORTCUTS);
  });

  // Fetch true shortcuts from server
  useEffect(() => {
    const fetchShortcuts = async () => {
      const token = localStorage.getItem('shelf_auth_token');
      if (!token) return;
      try {
        const res = await fetch('/api/shortcuts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shortcuts && Array.isArray(data.shortcuts)) {
            const healed = healShortcuts(data.shortcuts);
            setShortcuts(healed);
            uSet('homepage_shortcuts', healed);
          }
        }
      } catch (err) {}
    };
    fetchShortcuts();
  }, []);

  // Modal open/close state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Shortcut form fields
  const [shortcutTitle, setShortcutTitle] = useState('');
  const [shortcutUrl, setShortcutUrl] = useState('');
  const [shortcutSubtitle, setShortcutSubtitle] = useState('');
  const [shortcutAuthor, setShortcutAuthor] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(BOOK_COLORS[0].gradient);
  const [shortcutCustomImage, setShortcutCustomImage] = useState('');
  const [shortcutKey, setShortcutKey] = useState('');
  const [editId, setEditId] = useState(null);

  // Persist shortcuts
  useEffect(() => {
    uSet('homepage_shortcuts', shortcuts);
    
    // Sync to backend
    const syncShortcuts = async () => {
      const token = localStorage.getItem('shelf_auth_token');
      if (!token) return;
      try {
        await fetch('/api/shortcuts', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ shortcuts })
        });
      } catch (err) {}
    };
    
    // Only sync if they aren't the default INITIAL_SHORTCUTS exactly
    syncShortcuts();
  }, [shortcuts]);

  // Listen for trash-drop bookmark deletions (from Header trash zone)
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.id;
      if (id !== undefined && id !== null) {
        setShortcuts(prev => prev.filter(s => String(s.id) !== String(id)));
      }
    };
    window.addEventListener('delete-bookmark', handler);
    return () => window.removeEventListener('delete-bookmark', handler);
  }, []);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchEngine === 'google') {
      window.open(`https://google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return; // Prevent multiple windows from opening if the key is held down

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifierActive = isMac ? e.ctrlKey : e.altKey;

      if (isModifierActive && e.key) {
        const matchingShortcut = shortcuts.find(
          s => s.shortcutKey && s.shortcutKey.toLowerCase() === e.key.toLowerCase()
        );
        if (matchingShortcut) {
          e.preventDefault();
          window.open(matchingShortcut.url, '_blank');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  // Open modal for new shortcut
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

  // Open modal for editing shortcut
  const openEditModal = (e, item) => {
    e.stopPropagation();
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

  // Handle saving shortcut
  const saveShortcut = (e) => {
    e.preventDefault();
    if (!shortcutTitle.trim() || !shortcutUrl.trim()) return;

    let formattedUrl = shortcutUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const key = shortcutKey.trim() || shortcutTitle.trim().charAt(0).toUpperCase();

    if (editId) {
      setShortcuts(shortcuts.map(s => s.id === editId ? {
        ...s,
        title: shortcutTitle,
        subtitle: shortcutSubtitle,
        author: shortcutAuthor || 'Custom Link',
        url: formattedUrl,
        gradient: selectedGradient,
        shortcutKey: key.charAt(0).toUpperCase(),
        customImage: shortcutCustomImage
      } : s));
    } else {
      const newShortcut = {
        id: Date.now(),
        title: shortcutTitle,
        subtitle: shortcutSubtitle,
        author: shortcutAuthor || 'Custom Link',
        url: formattedUrl,
        gradient: selectedGradient,
        shortcutKey: key.charAt(0).toUpperCase(),
        customImage: shortcutCustomImage
      };
      setShortcuts([...shortcuts, newShortcut]);
    }

    setIsModalOpen(false);
  };

  // Delete shortcut
  const deleteShortcut = (id) => {
    setShortcuts(shortcuts.filter(s => s.id !== id));
    setIsModalOpen(false);
  };

  // Close profile dropdown on window click
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsProfileDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [setIsProfileDropdownOpen]);

  // Filter shortcuts for search if shelf filter is active
  const displayedShortcuts = searchEngine === 'shelf' && searchQuery.trim()
    ? shortcuts.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : shortcuts;

  // Infinite scroll real calendar states
  const [calendarDaysList, setCalendarDaysList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonthYear, setVisibleMonthYear] = useState(new Date());
  const calendarContainerRef = useRef(null);

  // Generate 200 real dates centered on today
  useEffect(() => {
    const list = [];
    const today = new Date();
    for (let i = -100; i <= 100; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      list.push({
        date: d,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        id: d.toDateString()
      });
    }
    setCalendarDaysList(list);
  }, []);

  // Center today's date in calendar container on load
  useEffect(() => {
    if (calendarDaysList.length > 0 && calendarContainerRef.current) {
      const container = calendarContainerRef.current;
      const index = 100; // Center today index
      const itemWidth = 54; // width (46px) + gap (8px)
      container.scrollLeft = index * itemWidth - container.clientWidth / 2 + 23;
    }
  }, [calendarDaysList]);

  // Update header month & year dynamically as user scrolls
  const handleCalendarScroll = (e) => {
    const container = e.target;
    const scrollLeft = container.scrollLeft;
    const itemWidth = 54;
    const index = Math.round((scrollLeft + container.clientWidth / 2 - 27) / itemWidth);
    if (index >= 0 && index < calendarDaysList.length) {
      setVisibleMonthYear(calendarDaysList[index].date);
    }
  };

  // Center calendar scroll position on today's date
  const goToToday = () => {
    if (calendarContainerRef.current && calendarDaysList.length > 0) {
      const container = calendarContainerRef.current;
      const index = 100; // Today index
      const itemWidth = 54;
      container.scrollTo({
        left: index * itemWidth - container.clientWidth / 2 + 23,
        behavior: 'smooth'
      });
      setSelectedDate(new Date());
    }
  };

  return (
    <>
      {/* Main Grid: Left Main Section & Right Side Panel */}
      <div className="main-layout">
        {/* LEFT COLUMN: Main Start Page Elements */}
        <main className="content-area">
          {/* Top Header & Search Bar */}
          <Header
            searchEngine={searchEngine}
            setSearchEngine={setSearchEngine}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearchSubmit={handleSearchSubmit}
          />

          {/* Daily Plans and Notes (above search, integrated with homepage theme) */}
          <div style={{ marginBottom: '3px' }}>
            <NotesInputSection selectedDate={selectedDate} />
          </div>



          {/* Welcome Message Card */}
          <WelcomeCard activeProfileName={activeProfile.name} />

          {/* Popular Book-Styled Shortcuts Grid */}
          <BookShelf
            displayedShortcuts={displayedShortcuts}
            openEditModal={openEditModal}
            openAddModal={openAddModal}
          />
        </main>

        {/* RIGHT COLUMN: User Profile & Dynamic Widgets */}
        <RightSidebar
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
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          visibleMonthYear={visibleMonthYear}
          setVisibleMonthYear={setVisibleMonthYear}
          goToToday={goToToday}
          calendarDaysList={calendarDaysList}
          calendarContainerRef={calendarContainerRef}
          handleCalendarScroll={handleCalendarScroll}
        />
      </div>

      {/* Modal Dialog for Adding / Editing Website Shortcut book cover */}
      <BookShortcutModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        editId={editId}
        saveShortcut={saveShortcut}
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
        deleteShortcut={deleteShortcut}
      />
    </>
  );
}
