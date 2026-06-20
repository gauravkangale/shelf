import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import WelcomeCard from './WelcomeCard';
import BookShelf from './BookShelf';
import NewSeriesCollection from './NewSeriesCollection';
import RightSidebar from './RightSidebar';
import BookShortcutModal from './BookShortcutModal';
import NotesInputSection from './NotesInputSection';
import { BOOK_COLORS, INITIAL_SHORTCUTS } from '../constants';

export default function Homepage() {
  // Search Engine & query states
  const [searchEngine, setSearchEngine] = useState('google'); // 'google' or 'shelf'
  const [searchQuery, setSearchQuery] = useState('');

  // Shortcuts/bookmarks shelf
  const [shortcuts, setShortcuts] = useState(() => {
    const saved = localStorage.getItem('homepage_shortcuts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.some(s => s.title === 'The World of Ice and Fire' || s.title === 'Fantastic Beasts')) {
          localStorage.setItem('homepage_shortcuts', JSON.stringify(INITIAL_SHORTCUTS));
          return INITIAL_SHORTCUTS;
        }
        return parsed;
      } catch (e) {
        return INITIAL_SHORTCUTS;
      }
    }
    return INITIAL_SHORTCUTS;
  });

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

  // Global profile accounts state
  const [profileAccounts, setProfileAccounts] = useState(() => {
    const saved = localStorage.getItem('profile_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEditingProfileAccounts, setIsEditingProfileAccounts] = useState(false);
  const [isAddingProfileAcc, setIsAddingProfileAcc] = useState(false);
  const [newProfileAccName, setNewProfileAccName] = useState('');
  const [newProfileAccEmail, setNewProfileAccEmail] = useState('');
  const [newProfileAccAvatar, setNewProfileAccAvatar] = useState('');

  // Persist shortcuts
  useEffect(() => {
    localStorage.setItem('homepage_shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

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

  // Save profile accounts
  useEffect(() => {
    localStorage.setItem('profile_accounts', JSON.stringify(profileAccounts));
  }, [profileAccounts]);

  // Switch active profile account
  const switchProfileAccount = (id) => {
    setProfileAccounts(profileAccounts.map(acc => ({
      ...acc,
      active: acc.id === id
    })));
  };

  // Add a new profile account
  const addProfileAccount = (e) => {
    e.preventDefault();
    if (!newProfileAccName.trim() || !newProfileAccEmail.trim()) return;
    const newAcc = {
      id: Date.now().toString(),
      name: newProfileAccName.trim(),
      email: newProfileAccEmail.trim(),
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

  // Close profile dropdown on window click
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsProfileDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Handle popup window login success
  useEffect(() => {
    const handleLoginSuccess = (userData) => {
      setProfileAccounts(prevAccounts => {
        // Check if account already exists by email or phone
        const existing = prevAccounts.find(acc =>
          (userData.email && acc.email === userData.email) ||
          (userData.phone && acc.phone === userData.phone)
        );
        if (existing) {
          // Switch to this account and update details
          return prevAccounts.map(acc => {
            const isMatch = (userData.email && acc.email === userData.email) ||
              (userData.phone && acc.phone === userData.phone);
            if (isMatch) {
              return {
                ...acc,
                name: userData.name || acc.name,
                email: userData.email || acc.email || '',
                phone: userData.phone || acc.phone || '',
                avatar: userData.avatar || acc.avatar || '',
                active: true
              };
            }
            return { ...acc, active: false };
          });
        } else {
          // Add new account and make it active
          const newAcc = {
            id: userData.id || Date.now().toString(),
            name: userData.name || userData.email || userData.phone || 'Member',
            email: userData.email || '',
            phone: userData.phone || '',
            avatar: userData.avatar || '',
            active: true
          };
          return prevAccounts.map(acc => ({ ...acc, active: false })).concat(newAcc);
        }
      });
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

  const activeProfile = profileAccounts.find(acc => acc.active) || profileAccounts[0] || {
    id: 'guest',
    name: 'Guest User',
    email: 'guest@local.browser',
    avatar: ''
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
