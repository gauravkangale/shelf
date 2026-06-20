// Pre-defined color palettes for custom shortcut book covers
export const BOOK_COLORS = [
  { name: 'Red', gradient: 'linear-gradient(135deg, #e85d56 0%, #a83d36 100%)' },
  { name: 'Teal', gradient: 'linear-gradient(135deg, #3e8e75 0%, #1e5e4b 100%)' },
  { name: 'Navy', gradient: 'linear-gradient(135deg, #2b4c7e 0%, #162c50 100%)' },
  { name: 'Purple', gradient: 'linear-gradient(135deg, #7c538c 0%, #4b2d56 100%)' },
  { name: 'Gold', gradient: 'linear-gradient(135deg, #b8860b 0%, #8b6508 100%)' },
  { name: 'Dark', gradient: 'linear-gradient(135deg, #2d2d2d 0%, #151515 100%)' }
];

export const PRESET_COVERS = [
  { name: 'Dark Academia', coverImage: './1.jpeg' },
  { name: 'Vintage Floral', coverImage: './2.jpeg' },
  { name: 'Moonlit Library', coverImage: './3.jpeg' },
  { name: 'Celestial Dreams', coverImage: './4.jpeg' },
  { name: 'Antique Manuscript', coverImage: './5.jpeg' },
  { name: 'Enchanted Garden', coverImage: './6.jpeg' }
];

export const INITIAL_SHORTCUTS = [
  {
    id: 1,
    title: 'Gmail',
    subtitle: 'Google Mail',
    author: 'Google',
    url: 'https://mail.google.com/',
    coverImage: './1.jpeg',
    shortcutKey: 'M'
  },
  {
    id: 2,
    title: 'LinkedIn',
    subtitle: 'Professional Network',
    author: 'LinkedIn',
    url: 'https://www.linkedin.com/',
    coverImage: './2.jpeg',
    shortcutKey: 'L'
  },
  {
    id: 3,
    title: 'GitHub',
    subtitle: 'Code Hosting',
    author: 'GitHub',
    url: 'https://github.com/',
    coverImage: './3.jpeg',
    shortcutKey: 'G'
  },
  {
    id: 4,
    title: 'YouTube',
    subtitle: 'Video Platform',
    author: 'Google',
    url: 'https://www.youtube.com/',
    coverImage: './4.jpeg',
    shortcutKey: 'Y'
  },
  {
    id: 5,
    title: 'ChatGPT',
    subtitle: 'AI Assistant',
    author: 'OpenAI',
    url: 'https://chatgpt.com/',
    coverImage: './5.jpeg',
    shortcutKey: 'C'
  },
  {
    id: 6,
    title: 'Google Drive',
    subtitle: 'Cloud Storage',
    author: 'Google',
    url: 'https://drive.google.com/',
    coverImage: './6.jpeg',
    shortcutKey: 'D'
  }
];
