import React from 'react';
import { Home, BookOpen, Clock, Bookmark, Settings, Menu } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <aside className="sidebar">
      <div className="logo-container" title="BookShelf Tab">
        <img style={{ width: '30px', height: '30px', rotate: '100deg' }} src="fan.png" alt="" />
      </div>

      <div className="vertical-sidebar-clock">
        <span className="clock-digit">{hours}</span>
        <span className="clock-colon">•</span>
        <span className="clock-digit">{minutes}</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
          aria-label="Home"
        >
          <Home size={20} />
        </button>
        <button
          className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
          aria-label="Library"
        >
          <BookOpen size={20} />
        </button>
        <button
          className={`nav-item ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('timer')}
          aria-label="Read Timer"
        >
          <Clock size={20} />
        </button>
        <button
          className={`nav-item ${activeTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
          aria-label="Bookmarks"
        >
          <Bookmark size={20} />
        </button>
        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      </nav>

      <div className="sidebar-bottom">
        <button
          className={`nav-item ${activeTab === 'more' ? 'active' : ''}`}
          onClick={() => setActiveTab('more')}
          aria-label="more"
        >
          <Menu size={20} />
        </button>
      </div>
    </aside>
  );
}
