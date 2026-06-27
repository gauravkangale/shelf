export const THEME_PRESETS = {
  cream: {
    key: 'cream',
    name: 'Cream',
    description: 'Warm ivory with elegant cream tones',
    background: '#F5F4EE',
    sidebar: '#F5F4EE',
    panel: '#FCFAF2',
    surface: '#FFFFFF',
    optionBg: '#F7F3E9',
    optionText: '#3E3B37',
    textPrimary: '#1E2022',
    textSecondary: '#6E7072',
    accentColor: '#B33933',
    accentSoft: '#FCE8E5',
    borderColor: '#E4E3DA',
    ink: '#1E2022',
    forest: '#2E3A2E',
    rust: '#B33933',
    highlight: '#FDF2F1'
  },
  luxuryBurgundy: {
    key: 'luxuryBurgundy',
    name: 'Luxury Burgundy',
    description: 'Deep merlot with matched cream surfaces',
    background: '#4B1426',
    sidebar: '#422023',
    panel: '#5B2534',
    surface: '#6D3248',
    optionBg: '#73364E',
    optionText: '#F3D7DC',
    textPrimary: '#F2E2DC',
    textSecondary: '#D3B3A8',
    accentColor: '#FAA4BD',
    accentSoft: '#F3D4DE',
    borderColor: '#713841',
    ink: '#F2E2DC',
    forest: '#7D283E',
    rust: '#FAA4BD',
    highlight: '#F4D8E0'
  },
  roseGold: {
    key: 'roseGold',
    name: 'Rose Gold',
    description: 'Soft pink with a rose-gold glow',
    background: '#FAA4BD',
    sidebar: '#F7C4D2',
    panel: '#FFE8EE',
    surface: '#FFF0F5',
    optionBg: '#F9D4E0',
    optionText: '#5A2533',
    textPrimary: '#3F1F2C',
    textSecondary: '#745863',
    accentColor: '#B33933',
    accentSoft: '#FCE3EA',
    borderColor: '#F1C2D1',
    ink: '#3F1F2C',
    forest: '#662C3C',
    rust: '#B33933',
    highlight: '#F9D2E3'
  },
  skyBlue: {
    key: 'skyBlue',
    name: 'Sky Blue',
    description: 'Airy blue with crisp white panels',
    background: '#EEF5FF',
    sidebar: '#E5F0FF',
    panel: '#F8FBFF',
    surface: '#FFFFFF',
    optionBg: '#D9E6FB',
    optionText: '#23405D',
    textPrimary: '#1F3C56',
    textSecondary: '#6D8193',
    accentColor: '#3D6EA9',
    accentSoft: '#DBE7FF',
    borderColor: '#C7D7EA',
    ink: '#1F3C56',
    forest: '#2B4F76',
    rust: '#3D6EA9',
    highlight: '#E7F1FF'
  },
  deepNavy: {
    key: 'deepNavy',
    name: 'Deep Navy',
    description: 'Midnight navy with polished ivory accents',
    background: '#1A3A4A',
    sidebar: '#162F3D',
    panel: '#1F4557',
    surface: '#254F65',
    optionBg: '#205A71',
    optionText: '#E9F2F9',
    textPrimary: '#EFF5FB',
    textSecondary: '#BDD0E2',
    accentColor: '#FAA4BD',
    accentSoft: '#3D6EA9',
    borderColor: '#316078',
    ink: '#EFF5FB',
    forest: '#244C6A',
    rust: '#FAA4BD',
    highlight: '#2A5C74'
  },
  goldAccent: {
    key: 'goldAccent',
    name: 'Gold Accent',
    description: 'Warm gold with ivory and soft chocolate tones',
    background: '#D4A574',
    sidebar: '#B78A5C',
    panel: '#E3C6A1',
    surface: '#F0DDC7',
    optionBg: '#E9D2BB',
    optionText: '#3F2A16',
    textPrimary: '#2F2216',
    textSecondary: '#5C4B39',
    accentColor: '#8A5C29',
    accentSoft: '#F7EADB',
    borderColor: '#C6A17C',
    ink: '#2F2216',
    forest: '#7A5C3A',
    rust: '#8A5C29',
    highlight: '#E8D2B0'
  }
};

export const THEME_LIST = Object.values(THEME_PRESETS);
export const DEFAULT_THEME_KEY = 'cream';

export const applyTheme = (themeKey, textTone = 'standard') => {
  const theme = THEME_PRESETS[themeKey] || THEME_PRESETS[DEFAULT_THEME_KEY];
  const root = document.documentElement;
  root.style.setProperty('--bg-color', theme.background);
  root.style.setProperty('--sidebar-bg', theme.sidebar);
  root.style.setProperty('--panel-bg', theme.panel);
  root.style.setProperty('--surface-bg', theme.surface);
  root.style.setProperty('--option-bg', theme.optionBg);
  root.style.setProperty('--option-text', theme.optionText);
  let primaryText;
  if (textTone === 'soft') {
    primaryText = theme.textSecondary;
  } else if (textTone === 'strong') {
    primaryText = theme.ink;
  } else {
    primaryText = theme.textPrimary;
  }
  root.style.setProperty('--text-primary', primaryText);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--accent-color', theme.accentColor);
  root.style.setProperty('--accent-light', theme.accentSoft);
  root.style.setProperty('--border-color', theme.borderColor);
  root.style.setProperty('--ink', theme.ink);
  root.style.setProperty('--forest', theme.forest);
  root.style.setProperty('--forest-deep', theme.forest);
  root.style.setProperty('--rust', theme.rust);
  root.style.setProperty('--highlight', theme.highlight);
  root.style.setProperty('--data-text-tone', textTone);
  return theme;
};
