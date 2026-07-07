const fs = require('fs');
const path = '/Users/gauravkangale/Desktop/homepage/shelf/src/components/Header.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add selectedIndex state
const stateTarget = `  const [showSuggestions, setShowSuggestions] = useState(false);`;
const stateReplacement = stateTarget + `\n  const [selectedIndex, setSelectedIndex] = useState(-1);`;
code = code.replace(stateTarget, stateReplacement);

// 2. Reset selectedIndex on query change
const effectTarget = `    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {`;
const effectReplacement = `    setSelectedIndex(-1);
` + effectTarget;
code = code.replace(effectTarget, effectReplacement);

// 3. Update form submit
const formTarget = `onSubmit={(e) => { setShowSuggestions(false); handleSearchSubmit(e); }}`;
const formReplacement = `onSubmit={(e) => {
          e.preventDefault();
          setShowSuggestions(false);
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSearchSubmit({ preventDefault: () => {} }, suggestions[selectedIndex]);
            setSearchQuery(suggestions[selectedIndex]);
          } else {
            handleSearchSubmit(e);
          }
          setSelectedIndex(-1);
        }}`;
code = code.replace(formTarget, formReplacement);

// 4. Update input onKeyDown
const inputTarget = `onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}`;
const inputReplacement = `onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (!showSuggestions || suggestions.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, -1));
              }
            }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}`;
code = code.replace(inputTarget, inputReplacement);

// 5. Update suggestion background
const suggTarget = `                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none'
                  }}
                  onMouseDown={() => {
                    setSearchQuery(sugg);
                    setShowSuggestions(false);
                    // trigger search
                    handleSearchSubmit({ preventDefault: () => { } }, sugg);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ui-hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}`;
const suggReplacement = `                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                    background: selectedIndex === i ? 'var(--ui-hover-bg)' : 'transparent'
                  }}
                  onMouseDown={() => {
                    setSearchQuery(sugg);
                    setShowSuggestions(false);
                    // trigger search
                    handleSearchSubmit({ preventDefault: () => { } }, sugg);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onMouseLeave={() => setSelectedIndex(-1)}`;
code = code.replace(suggTarget, suggReplacement);

fs.writeFileSync(path, code);
console.log('updated keyboard navigation');
