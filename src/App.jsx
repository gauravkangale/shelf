import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Homepage from './components/Homepage';
import BookmarksSection from './components/BookmarksSection';
import './App.css';

function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('home');

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return; // Prevent multiple windows from opening if the key is held down

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifierActive = isMac ? e.ctrlKey : e.altKey;

      if (isModifierActive && e.key) {
        const saved = localStorage.getItem('homepage_shortcuts');
        if (saved) {
          try {
            const shortcuts = JSON.parse(saved);
            const matchingShortcut = shortcuts.find(
              s => s.shortcutKey && s.shortcutKey.toLowerCase() === e.key.toLowerCase()
            );
            if (matchingShortcut) {
              e.preventDefault();
              window.open(matchingShortcut.url, '_blank');
            }
          } catch (err) {
            console.error(err);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderContent = () => {
    const placeholderStyle = {
      flex: 1,
      padding: '40px',
      fontFamily: 'var(--sans)',
      color: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      height: '100vh',
      boxSizing: 'border-box',
      marginLeft: '80px'
    };

    const headingStyle = {
      fontFamily: 'var(--serif)',
      fontSize: '32px',
      fontWeight: '600',
      color: 'var(--forest-deep)',
      marginBottom: '12px'
    };

    const textStyle = {
      color: '#8a826f',
      fontSize: '15px',
      maxWidth: '400px',
      lineHeight: '1.6'
    };

    switch (activeTab) {
      case 'home':
        return <Homepage />;
      case 'library':
        return (
          <div style={placeholderStyle}>
            <h1 style={headingStyle}>Library Catalog</h1>
            <p style={textStyle}>Browse through your collection, track your physical books, and search the public library catalogs.</p>
          </div>
        );
      case 'timer':
        return (
          <div style={placeholderStyle}>
            <h1 style={headingStyle}>Reading Timer</h1>
            <p style={textStyle}>Start a reading session to keep track of your daily pages and view historical stats.</p>
          </div>
        );
      case 'bookmarks':
        return <BookmarksSection />;
      case 'settings':
        return (
          <div style={placeholderStyle}>
            <h1 style={headingStyle}>Settings</h1>
            <p style={textStyle}>Configure custom themes, hotkeys, calendar reminders, and link your integrations.</p>
          </div>
        );
      case 'more':
        return (
          <div style={placeholderStyle}>
            <h1 style={headingStyle}>More</h1>
            <p style={textStyle}>About Shelf</p>
          </div>
        );
      default:
        return <Homepage />;
    }
  };

  return (
    <div className="app-container">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      {renderContent()}
    </div>
  );
}

export default App;
