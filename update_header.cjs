const fs = require('fs');

const path = '/Users/gauravkangale/Desktop/homepage/shelf/src/components/Header.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add state for suggestions
const stateTarget = `  const [profileCard, setProfileCard] = useState(null); // user to show in LibraryCardModal`;
const stateReplacement = stateTarget + `
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);`;

code = code.replace(stateTarget, stateReplacement);

// 2. Add useEffect for fetching suggestions
const effectTarget = `  const fetchNotifications = useCallback(async () => {`;
const effectReplacement = `  // ── Fetch search suggestions ───────────────────────────────────────────────
  useEffect(() => {
    if (searchEngine !== 'google' || !searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(\`/api/suggest?q=\${encodeURIComponent(searchQuery.trim())}\`);
        if (res.ok) {
          const data = await res.json();
          // data format from Google: ["query", ["sugg1", "sugg2", ...]]
          if (data && data[1]) {
            setSuggestions(data[1].slice(0, 5)); // show up to 5
            setShowSuggestions(true);
          }
        }
      } catch (err) {}
    }, 200);
  }, [searchQuery, searchEngine]);

` + effectTarget;
code = code.replace(effectTarget, effectReplacement);

// 3. Update search-wrapper in JSX
const formTarget = `        <form className="search-wrapper" onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '480px' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={
              searchEngine === 'google'
                ? 'Search Google or type a URL...'
                : 'Search book shortcuts on shelf...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="search-engine-selector">
            <button
              type="button"
              className={\`engine-pill \${searchEngine === 'google' ? 'active' : ''}\`}
              onClick={() => setSearchEngine('google')}
            >Google</button>
            <button
              type="button"
              className={\`engine-pill \${searchEngine === 'shelf' ? 'active' : ''}\`}
              onClick={() => setSearchEngine('shelf')}
            >Shelf</button>
          </div>
        </form>`;

const formReplacement = `        <form className="search-wrapper" onSubmit={(e) => { setShowSuggestions(false); handleSearchSubmit(e); }} style={{ flex: 1, maxWidth: '480px', position: 'relative' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            autoFocus
            placeholder={
              searchEngine === 'google'
                ? 'Search Google or type a URL...'
                : 'Search book shortcuts on shelf...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          <div className="search-engine-selector">
            <button
              type="button"
              className={\`engine-pill \${searchEngine === 'google' ? 'active' : ''}\`}
              onClick={() => setSearchEngine('google')}
            >Google</button>
            <button
              type="button"
              className={\`engine-pill \${searchEngine === 'shelf' ? 'active' : ''}\`}
              onClick={() => setSearchEngine('shelf')}
            >Shelf</button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              zIndex: 1000
            }}>
              {suggestions.map((sugg, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none'
                  }}
                  onMouseDown={() => {
                    setSearchQuery(sugg);
                    setShowSuggestions(false);
                    // trigger search
                    handleSearchSubmit({ preventDefault: () => {} }, sugg);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ui-hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                  {sugg}
                </div>
              ))}
            </div>
          )}
        </form>`;
code = code.replace(formTarget, formReplacement);

fs.writeFileSync(path, code);
console.log('updated Header.jsx');
