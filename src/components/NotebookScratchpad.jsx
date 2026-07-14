import React, { useState, useEffect, useRef } from 'react';
import {
    Copy, Maximize2, X, Check, Bold, Italic, Underline,
    Undo, Redo, Heading1, Heading2, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
    Link, Image as LucideImage, Eraser, Download, Trash2,
    Calendar, CheckSquare, Code, Quote, Table, RotateCcw,
    Upload, Sliders, Palette, Eye, EyeOff,
    ChevronLeft, ChevronRight, Plus, Edit3, BookOpen,
    MousePointer, StickyNote
} from 'lucide-react';
import { uGet, uSet, userKey } from '../utils/userKey';
import { getScratchpadContent, setScratchpadContent } from '../utils/scratchpadStore';
import { useAlert } from '../context/AlertContext';

export default function NotebookScratchpad() {
    const getScrapbookFromUrl = () => {
        try {
            const hash = window.location.hash;
            let match = hash.match(/[?&]scrapbook=([^&]+)/);
            if (!match) {
                match = hash.match(/\/scrapbook-([^\/?&]+)/);
            }
            if (!match) {
                const searchParams = new URLSearchParams(window.location.search);
                const data = searchParams.get('scrapbook');
                if (data) return data;
            } else {
                return match[1];
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    };

    const [pages, setPages] = useState(() => {
        try {
            const dataStr = getScrapbookFromUrl();
            if (dataStr) {
                const base64UrlSafe = dataStr.replace(/-/g, '+').replace(/_/g, '/');
                const binary = atob(base64UrlSafe);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const jsonStr = new TextDecoder().decode(bytes);
                const decoded = JSON.parse(jsonStr);
                if (decoded && decoded.pages) {
                    return decoded.pages;
                }
            }
        } catch (e) { }

        try {
            const key = userKey('shelf_notebook_pages');
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { }

        try {
            const key = userKey('shelf_notebook_scratchpad_html');
            const existing = localStorage.getItem(key) || '';
            return [{ id: 'page-1', title: 'new note', content: existing }];
        } catch {
            return [{ id: 'page-1', title: 'new note', content: '' }];
        }
    });

    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const [content, setContent] = useState(() => {
        try {
            const dataStr = getScrapbookFromUrl();
            if (dataStr) {
                const base64UrlSafe = dataStr.replace(/-/g, '+').replace(/_/g, '/');
                const binary = atob(base64UrlSafe);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const jsonStr = new TextDecoder().decode(bytes);
                const decoded = JSON.parse(jsonStr);
                if (decoded && decoded.pages && decoded.pages[0]) {
                    return decoded.pages[0].content;
                }
            }
        } catch (e) { }

        return pages[0]?.content || '';
    });

    const [isViewerMode, setIsViewerMode] = useState(() => !!getScrapbookFromUrl());
    const [sharedScrapbook, setSharedScrapbook] = useState(() => {
        try {
            const dataStr = getScrapbookFromUrl();
            if (dataStr) {
                const base64UrlSafe = dataStr.replace(/-/g, '+').replace(/_/g, '/');
                const binary = atob(base64UrlSafe);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const jsonStr = new TextDecoder().decode(bytes);
                const decoded = JSON.parse(jsonStr);
                if (decoded && decoded.pages) return decoded;
            }
        } catch (e) { }
        return null;
    });

    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [pagesSidebarOpen, setPagesSidebarOpen] = useState(() => uGet('shelf_notebook_sidebar_open') !== false);
    const [pagesSidebarMinimized, setPagesSidebarMinimized] = useState(() => uGet('shelf_notebook_sidebar_minimized') || false);
    const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
    const [checkedPageIds, setCheckedPageIds] = useState([]);
    const [activePenColor, setActivePenColor] = useState('#000000');
    const [isMultiColor, setIsMultiColor] = useState(false);
    const multiColorIndexRef = React.useRef(0);
    const MULTI_COLORS = ['#e03c3c', '#e07c3c', '#d4b800', '#2a9e4e', '#2b5cc8', '#7b2fb5'];
    const [isLassoMode, setIsLassoMode] = useState(false);
    const [selectedElements, setSelectedElements] = useState([]);
    const [stickyColor, setStickyColor] = useState('#fef08a');
    const [activeColorPicker, setActiveColorPicker] = useState(null); // 'sheet' | 'pen' | 'highlight' | null
    const [penHexInput, setPenHexInput] = useState('#000000');
    const [highlightHexInput, setHighlightHexInput] = useState('#fef08a');

    const rgbToHex = (rgbStr) => {
        if (!rgbStr) return '#000000';
        if (rgbStr === 'transparent' || rgbStr === 'rgba(0, 0, 0, 0)') return '#ffffff';
        if (rgbStr.startsWith('#')) return rgbStr;
        const matches = rgbStr.match(/\d+/g);
        if (!matches || matches.length < 3) return '#000000';
        const r = parseInt(matches[0]).toString(16).padStart(2, '0');
        const g = parseInt(matches[1]).toString(16).padStart(2, '0');
        const b = parseInt(matches[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    };



    // Paper styles: 'lines', 'dots', 'grid', 'seyes', 'isometric', 'blank'
    const [paperStyle, setPaperStyle] = useState(() => uGet('shelf_notebook_paper_style') || 'lines');

    // 60+ Advanced Document Settings States (Always Visible & Open)
    const [fontFamily, setFontFamily] = useState(() => uGet('shelf_notebook_font_family') || "'Caveat', cursive");
    const [baseFontSize, setBaseFontSize] = useState(() => uGet('shelf_notebook_font_size') || 22);
    const [lineSpacing, setLineSpacing] = useState(() => uGet('shelf_notebook_line_spacing') || 28);
    const [lineHeight, setLineHeight] = useState(() => uGet('shelf_notebook_line_height') || 1.5);
    const [letterSpacing, setLetterSpacing] = useState(() => uGet('shelf_notebook_letter_spacing') || 0);
    const [docPadding, setDocPadding] = useState(() => uGet('shelf_notebook_doc_padding') || 60);

    const [paperColor, setPaperColor] = useState(() => uGet('shelf_notebook_paper_color') || 'var(--surface-bg)');
    const [lineStyle, setLineStyle] = useState(() => uGet('shelf_notebook_line_style') || 'solid');
    const [lineOpacity, setLineOpacity] = useState(() => uGet('shelf_notebook_line_opacity') || 35);
    const [lineThickness, setLineThickness] = useState(() => uGet('shelf_notebook_line_thickness') || 1.2);
    const [doubleLines, setDoubleLines] = useState(() => uGet('shelf_notebook_double_lines') || false);

    const [marginStyle, setMarginStyle] = useState(() => uGet('shelf_notebook_margin_style') || 'left');
    const [marginOffset, setMarginOffset] = useState(() => uGet('shelf_notebook_margin_offset') || 68);
    const [marginColor, setMarginColor] = useState(() => uGet('shelf_notebook_margin_color') || '#c83f3f');

    const [readOnly, setReadOnly] = useState(() => uGet('shelf_notebook_readonly') || false);
    const isReadOnlyMode = readOnly || isViewerMode;
    const [spellcheck, setSpellcheck] = useState(() => uGet('shelf_notebook_spellcheck') || true);
    const [autoCapitalize, setAutoCapitalize] = useState(() => uGet('shelf_notebook_autocap') || true);
    const [focusMode, setFocusMode] = useState(() => uGet('shelf_notebook_focusmode') || false);
    const [showWordCount, setShowWordCount] = useState(() => uGet('shelf_notebook_wordcount') || true);
    const [showCharCount, setShowCharCount] = useState(() => uGet('shelf_notebook_charcount') || true);

    // Active Popover State ('size', 'height', 'letter', 'margins', 'spacing', 'opacity', 'thickness', 'position')
    const [activePopover, setActivePopover] = useState(null);

    // Find & Replace Inputs
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);

    // Active tool state indicators
    const [activeStyles, setActiveStyles] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        subscript: false,
        superscript: false,
        alignLeft: false,
        alignCenter: false,
        alignRight: false,
        alignJustify: false,
        unorderedList: false,
        orderedList: false,
        foreColor: 'rgb(0, 0, 0)',
        backColor: 'rgba(0, 0, 0, 0)'
    });

    const inlineRef = useRef(null);
    const modalRef = useRef(null);
    const penColorInputRef = useRef(null);
    const highlightColorInputRef = useRef(null);
    const sheetColorInputRef = useRef(null);
    const [showMoreSettings, setShowMoreSettings] = useState(false);
    const [activeImageElement, setActiveImageElement] = useState(null);
    const { cAlert, cConfirm, cPrompt } = useAlert();

    const handleAddPage = () => {
        const newPage = {
            id: `page-${Date.now()}`,
            title: 'new note',
            content: ''
        };
        const updated = [...pages, newPage];
        setPages(updated);
        const pagesKey = userKey('shelf_notebook_pages');
        localStorage.setItem(pagesKey, JSON.stringify(updated));
        setCurrentPageIndex(updated.length - 1);
        setContent('');
    };

    const handleRenamePage = () => {
        const currentTitle = pages[currentPageIndex]?.title || 'new note';
        cPrompt('Rename Page', 'Enter new title:', currentTitle).then((newTitle) => {
            if (newTitle && newTitle.trim()) {
                const updated = [...pages];
                updated[currentPageIndex] = {
                    ...updated[currentPageIndex],
                    title: newTitle.trim()
                };
                setPages(updated);
                const pagesKey = userKey('shelf_notebook_pages');
                localStorage.setItem(pagesKey, JSON.stringify(updated));
            }
        });
    };

    const handleDeletePage = () => {
        if (pages.length <= 1) {
            cAlert('Error', 'Cannot delete the last remaining page.');
            return;
        }
        cConfirm('Delete Page', 'Are you sure you want to delete this page?').then((confirmed) => {
            if (confirmed) {
                const updated = pages.filter((_, idx) => idx !== currentPageIndex);
                setPages(updated);
                const pagesKey = userKey('shelf_notebook_pages');
                localStorage.setItem(pagesKey, JSON.stringify(updated));
                const newIdx = Math.max(0, currentPageIndex - 1);
                setCurrentPageIndex(newIdx);
                setContent(updated[newIdx].content || '');
            }
        });
    };

    const handleRenamePageAtIndex = (index) => {
        const currentTitle = pages[index]?.title || 'new note';
        cPrompt('Rename Page', 'Enter new title:', currentTitle).then((newTitle) => {
            if (newTitle && newTitle.trim()) {
                const updated = [...pages];
                updated[index] = {
                    ...updated[index],
                    title: newTitle.trim()
                };
                setPages(updated);
                const pagesKey = userKey('shelf_notebook_pages');
                localStorage.setItem(pagesKey, JSON.stringify(updated));
            }
        });
    };

    const handleDeletePageAtIndex = (index, e) => {
        if (e) e.stopPropagation();
        if (pages.length <= 1) {
            cAlert('Error', 'Cannot delete the last remaining page.');
            return;
        }
        cConfirm('Delete Page', 'Are you sure you want to delete this page?').then((confirmed) => {
            if (confirmed) {
                const updated = pages.filter((_, idx) => idx !== index);
                setPages(updated);
                const pagesKey = userKey('shelf_notebook_pages');
                localStorage.setItem(pagesKey, JSON.stringify(updated));

                let newIdx = currentPageIndex;
                if (currentPageIndex >= updated.length) {
                    newIdx = updated.length - 1;
                } else if (currentPageIndex === index) {
                    newIdx = Math.max(0, index - 1);
                } else if (currentPageIndex > index) {
                    newIdx = currentPageIndex - 1;
                }
                setCurrentPageIndex(newIdx);
                setContent(updated[newIdx].content || '');
            }
        });
    };

    const togglePageChecked = (pageId) => {
        setCheckedPageIds(prev =>
            prev.includes(pageId)
                ? prev.filter(id => id !== pageId)
                : [...prev, pageId]
        );
    };

    const handleDeleteSelectedPages = () => {
        if (checkedPageIds.length === 0) {
            cAlert('Info', 'Please select at least one page to delete.');
            return;
        }
        if (checkedPageIds.length >= pages.length) {
            cAlert('Error', 'Cannot delete all pages. At least one page must remain.');
            return;
        }
        cConfirm('Delete Selected Pages', `Are you sure you want to delete the ${checkedPageIds.length} selected pages?`).then((confirmed) => {
            if (confirmed) {
                const updated = pages.filter(p => !checkedPageIds.includes(p.id));
                setPages(updated);
                const pagesKey = userKey('shelf_notebook_pages');
                localStorage.setItem(pagesKey, JSON.stringify(updated));

                let newIdx = currentPageIndex;
                const currentPageId = pages[currentPageIndex]?.id;
                if (checkedPageIds.includes(currentPageId)) {
                    newIdx = 0;
                } else {
                    const newCurrentPage = updated.find(p => p.id === currentPageId);
                    newIdx = updated.indexOf(newCurrentPage);
                    if (newIdx === -1) newIdx = 0;
                }
                setCurrentPageIndex(newIdx);
                setContent(updated[newIdx]?.content || '');
                setCheckedPageIds([]);
                setBulkDeleteMode(false);
            }
        });
    };

    const handleExitSharedView = () => {
        window.location.hash = window.location.hash.split('?')[0].split('/')[0];
    };

    const stickyThemes = {
        '#fef08a': { bg: '#fef08a', border: '#1e293b', shadow: '#ca8a04', text: '#1e293b' }, // Yellow note, solid yellow shadow
        '#bbf7d0': { bg: '#bbf7d0', border: '#1e293b', shadow: '#15803d', text: '#1e293b' }, // Green note, solid green shadow
        '#bfdbfe': { bg: '#bfdbfe', border: '#1e293b', shadow: '#1d4ed8', text: '#1e293b' }, // Blue note, solid blue shadow
        '#fbcfe8': { bg: '#fbcfe8', border: '#1e293b', shadow: '#be185d', text: '#1e293b' }, // Pink note, solid pink shadow
        '#fed7aa': { bg: '#fed7aa', border: '#1e293b', shadow: '#c2410c', text: '#1e293b' }  // Orange note, solid orange shadow
    };

    const updateStickyColor = (color) => {
        setStickyColor(color);
        if (window.activeStickyNoteId) {
            const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
            if (activeEditor) {
                const activeSticky = activeEditor.querySelector(`#${window.activeStickyNoteId}`);
                if (activeSticky) {
                    const theme = stickyThemes[color] || stickyThemes['#fef08a'];
                    activeSticky.style.setProperty('background-color', theme.bg, 'important');
                    activeSticky.style.borderColor = theme.border;
                    activeSticky.style.boxShadow = `6px 6px 0px ${theme.shadow}`;
                    const tape = activeSticky.querySelector('.sticky-note-tape');
                    if (tape) tape.style.backgroundColor = theme.shadow;
                    const body = activeSticky.querySelector('.sticky-note-body');
                    if (body) body.style.color = theme.text;
                    handleInput({ currentTarget: activeEditor });
                }
            }
        }
    };

    const setupStickyHandlers = (sticky) => {
        const deleteBtn = sticky.querySelector('.sticky-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sticky.remove();
                const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
                if (activeEditor) handleInput({ currentTarget: activeEditor });
            });
        }

        const body = sticky.querySelector('.sticky-note-body');
        if (body) {
            body.addEventListener('focus', () => {
                window.activeStickyNoteId = sticky.id;
            });
            body.addEventListener('input', () => {
                const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
                if (activeEditor) handleInput({ currentTarget: activeEditor });
            });
        }
    };

    const insertStickyNote = () => {
        const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
        if (!activeEditor) return;

        const stickyId = `sticky-${Date.now()}`;
        const sticky = document.createElement('span');
        sticky.className = 'sticky-note-container';
        sticky.id = stickyId;
        sticky.setAttribute('contenteditable', 'false');
        
        const theme = stickyThemes[stickyColor] || stickyThemes['#fef08a'];
        sticky.style.cssText = [
            'position: relative',
            'display: inline-block',
            'vertical-align: middle',
            'margin: 6px 8px',
            `background-color: ${theme.bg}`,
            'background-image: none',
            `border-color: ${theme.border}`,
            `box-shadow: 5px 5px 0px ${theme.shadow}`,
            `font-family: ${fontFamily}`,
        ].join('; ');

        sticky.innerHTML = `<span class="sticky-note-tape" style="background-color: ${theme.shadow};"></span><button class="sticky-delete-btn scratchpad-print-hide" title="Delete"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button><span class="sticky-note-body" contenteditable="true" style="color: ${theme.text}; font-family: ${fontFamily};"></span>`;

        // Attach delete button listener directly (clicks inside contenteditable=false spans don't bubble)
        const setupDelete = () => {
            const btn = sticky.querySelector('.sticky-delete-btn');
            if (btn) {
                btn.addEventListener('mousedown', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    sticky.remove();
                    if (activeEditor) handleInput({ currentTarget: activeEditor });
                });
            }
        };
        setupDelete();

        // Insert at cursor position
        const selection = window.getSelection();
        let inserted = false;
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (activeEditor.contains(range.commonAncestorContainer)) {
                range.collapse(true);
                range.insertNode(sticky);
                // Move cursor after the sticky
                range.setStartAfter(sticky);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                inserted = true;
            }
        }
        
        if (!inserted) {
            activeEditor.appendChild(sticky);
        }
        
        // Focus the body for immediate editing
        requestAnimationFrame(() => {
            const body = sticky.querySelector('.sticky-note-body');
            if (body) {
                body.focus();
                const r = document.createRange();
                r.selectNodeContents(body);
                const sel = window.getSelection();
                if (sel) { sel.removeAllRanges(); sel.addRange(r); }
            }
        });

        handleInput({ currentTarget: activeEditor });
    };

    const setupGroupHandlers = (groupContainer) => {
        const lockBtn = groupContainer.querySelector('.lock-btn');
        const ungroupBtn = groupContainer.querySelector('.ungroup-btn');

        if (lockBtn) {
            lockBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isLocked = groupContainer.classList.toggle('locked');
                const lockSpan = lockBtn.querySelector('.lock-icon-span');
                if (lockSpan) lockSpan.innerHTML = isLocked ? 'Unlock' : 'Lock';
                const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
                if (activeEditor) handleInput({ currentTarget: activeEditor });
            });
        }

        if (ungroupBtn) {
            ungroupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
                if (!activeEditor) return;

                const contentArea = groupContainer.querySelector('.group-content-area');
                if (contentArea) {
                    const children = Array.from(contentArea.children);
                    const groupRect = groupContainer.getBoundingClientRect();
                    const editorRect = activeEditor.getBoundingClientRect();
                    const leftOffset = groupRect.left - editorRect.left + activeEditor.scrollLeft;
                    const topOffset = groupRect.top - editorRect.top + activeEditor.scrollTop;

                    children.forEach(child => {
                        const childLeft = parseInt(child.style.left) || 0;
                        const childTop = parseInt(child.style.top) || 0;
                        
                        child.style.position = 'absolute';
                        child.style.left = `${leftOffset + childLeft}px`;
                        child.style.top = `${topOffset + childTop}px`;
                        
                        activeEditor.appendChild(child);
                    });
                }
                groupContainer.remove();
                handleInput({ currentTarget: activeEditor });
            });
        }
    };

    const handleGroupElements = (elements) => {
        if (elements.length === 0) return;

        const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
        if (!activeEditor) return;

        const editorRect = activeEditor.getBoundingClientRect();
        let minLeft = Infinity;
        let minTop = Infinity;
        let maxRight = -Infinity;
        let maxBottom = -Infinity;

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const relLeft = rect.left - editorRect.left + activeEditor.scrollLeft;
            const relTop = rect.top - editorRect.top + activeEditor.scrollTop;
            const relRight = relLeft + rect.width;
            const relBottom = relTop + rect.height;

            if (relLeft < minLeft) minLeft = relLeft;
            if (relTop < minTop) minTop = relTop;
            if (relRight > maxRight) maxRight = relRight;
            if (relBottom > maxBottom) maxBottom = relBottom;
        });

        minLeft = Math.max(0, minLeft - 10);
        minTop = Math.max(0, minTop - 10);

        const groupId = `group-${Date.now()}`;
        const groupContainer = document.createElement('div');
        groupContainer.className = 'grouped-container';
        groupContainer.id = groupId;
        groupContainer.setAttribute('contenteditable', 'false');
        groupContainer.style.position = 'absolute';
        groupContainer.style.left = `${minLeft}px`;
        groupContainer.style.top = `${minTop}px`;
        groupContainer.style.width = `${(maxRight - minLeft) + 10}px`;
        groupContainer.style.height = `${(maxBottom - minTop) + 10}px`;

        const controls = document.createElement('div');
        controls.className = 'group-controls-overlay scratchpad-print-hide';
        controls.innerHTML = `
            <button class="group-control-btn lock-btn" style="background: transparent; border: none; font-size: 0.65rem; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; gap: 4px;" title="Toggle Lock">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span class="lock-icon-span">Lock</span>
            </button>
            <button class="group-control-btn ungroup-btn" style="background: transparent; border: none; font-size: 0.65rem; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; gap: 4px;" title="Ungroup Elements">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-2-2h-5M3 8v8a2 2 0 0 0 2 2h5"></path><polyline points="10 21 15 16 10 11"></polyline></svg>
                <span>Ungroup</span>
            </button>
        `;
        groupContainer.appendChild(controls);

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'group-content-area';
        contentWrapper.setAttribute('contenteditable', 'true');
        contentWrapper.style.width = '100%';
        contentWrapper.style.height = '100%';
        contentWrapper.style.position = 'relative';
        contentWrapper.style.outline = 'none';
        groupContainer.appendChild(contentWrapper);

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const relLeft = rect.left - editorRect.left + activeEditor.scrollLeft - minLeft;
            const relTop = rect.top - editorRect.top + activeEditor.scrollTop - minTop;

            el.style.position = 'absolute';
            el.style.left = `${relLeft}px`;
            el.style.top = `${relTop}px`;
            el.style.margin = '0';
            
            el.classList.remove('lasso-selected');
            contentWrapper.appendChild(el);
        });

        activeEditor.appendChild(groupContainer);
        setupGroupHandlers(groupContainer);
        setSelectedElements([]);
        handleInput({ currentTarget: activeEditor });
    };

    // Lasso selection box listener
    useEffect(() => {
        const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
        if (!activeEditor) return;

        let isDrawing = false;
        let startX = 0;
        let startY = 0;
        let editorRect = null;
        let selectionBox = null;

        const handleMouseDown = (e) => {
            const shouldStart = isLassoMode || e.shiftKey;
            if (!shouldStart) return;

            if (e.target.closest('.group-controls-overlay') || e.target.closest('.grouped-container') || e.target.closest('.sticky-note-container')) {
                return;
            }

            isDrawing = true;
            editorRect = activeEditor.getBoundingClientRect();
            startX = e.clientX - editorRect.left + activeEditor.scrollLeft;
            startY = e.clientY - editorRect.top + activeEditor.scrollTop;

            e.preventDefault();

            selectionBox = document.createElement('div');
            selectionBox.className = 'lasso-selection-box';
            selectionBox.style.left = `${startX}px`;
            selectionBox.style.top = `${startY}px`;
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
            activeEditor.appendChild(selectionBox);

            activeEditor.querySelectorAll('.lasso-selected').forEach(el => el.classList.remove('lasso-selected'));
            setSelectedElements([]);
        };

        const handleMouseMove = (e) => {
            if (!isDrawing || !selectionBox) return;

            const currentX = e.clientX - editorRect.left + activeEditor.scrollLeft;
            const currentY = e.clientY - editorRect.top + activeEditor.scrollTop;

            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(startX - currentX);
            const height = Math.abs(startY - currentY);

            selectionBox.style.left = `${left}px`;
            selectionBox.style.top = `${top}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;

            const candidates = activeEditor.querySelectorAll('img, p, h1, h2, blockquote, pre, .grouped-container, .sticky-note-container');
            const boxRect = selectionBox.getBoundingClientRect();
            const newlySelected = [];

            candidates.forEach(el => {
                const elRect = el.getBoundingClientRect();
                const overlaps = !(boxRect.right < elRect.left || 
                                  boxRect.left > elRect.right || 
                                  boxRect.bottom < elRect.top || 
                                  boxRect.top > elRect.bottom);

                if (overlaps) {
                    el.classList.add('lasso-selected');
                    newlySelected.push(el);
                } else {
                    el.classList.remove('lasso-selected');
                }
            });

            setSelectedElements(newlySelected);
        };

        const handleMouseUp = () => {
            if (!isDrawing) return;
            isDrawing = false;

            if (selectionBox && selectionBox.parentNode) {
                selectionBox.parentNode.removeChild(selectionBox);
            }
            selectionBox = null;
        };

        activeEditor.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            activeEditor.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isLassoMode, isExpanded, modalRef.current, inlineRef.current]);

    // Group & Sticky note dragging listener
    useEffect(() => {
        const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
        if (!activeEditor) return;

        let dragTarget = null;

        const handleMouseDown = (e) => {
            const group = e.target.closest('.grouped-container');
            const sticky = e.target.closest('.sticky-note-container');
            
            if (e.target.closest('.sticky-delete-btn') || e.target.closest('.group-controls-overlay')) {
                return;
            }

            const targetEl = group && !group.classList.contains('locked') ? group : sticky;
            if (!targetEl) return;

            dragTarget = {
                element: targetEl,
                startX: e.clientX,
                startY: e.clientY,
                initialLeft: parseFloat(targetEl.style.left) || 0,
                initialTop: parseFloat(targetEl.style.top) || 0,
                hasMoved: false
            };
        };

        const handleMouseMove = (e) => {
            if (!dragTarget) return;

            const deltaX = e.clientX - dragTarget.startX;
            const deltaY = e.clientY - dragTarget.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 3) {
                dragTarget.hasMoved = true;
                e.preventDefault();
                dragTarget.element.style.left = `${dragTarget.initialLeft + deltaX}px`;
                dragTarget.element.style.top = `${dragTarget.initialTop + deltaY}px`;
            }
        };

        const handleMouseUp = (e) => {
            if (!dragTarget) return;

            if (dragTarget.hasMoved) {
                e.preventDefault();
                handleInput({ currentTarget: activeEditor });
            }
            dragTarget = null;
        };

        activeEditor.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            activeEditor.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isExpanded, modalRef.current, inlineRef.current]);

    // Reconnect handlers on dynamically loaded groups and stickies
    useEffect(() => {
        const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
        if (!activeEditor) return;

        const groups = activeEditor.querySelectorAll('.grouped-container');
        groups.forEach(group => {
            if (!group.dataset.handlersAttached) {
                setupGroupHandlers(group);
                group.dataset.handlersAttached = 'true';
            }
        });

        // Event delegation for focus in
        const handleFocusIn = (e) => {
            const sticky = e.target.closest('.sticky-note-container');
            if (sticky) {
                window.activeStickyNoteId = sticky.id;
            }
        };

        activeEditor.addEventListener('focusin', handleFocusIn);
        return () => {
            activeEditor.removeEventListener('focusin', handleFocusIn);
        };
    }, [content, isExpanded, modalRef.current, inlineRef.current]);

    const handleImportSharedView = () => {
        if (!sharedScrapbook) return;
        cConfirm('Import Scrapbook', 'Do you want to import these shared pages into your local Notebook? This will replace your current notebook pages.').then((confirmed) => {
            if (confirmed) {
                setPages(sharedScrapbook.pages);
                const pagesKey = userKey('shelf_notebook_pages');
                localStorage.setItem(pagesKey, JSON.stringify(sharedScrapbook.pages));
                setCurrentPageIndex(0);
                setContent(sharedScrapbook.pages[0]?.content || '');
                setIsViewerMode(false);
                setSharedScrapbook(null);

                // Clear URL param
                window.location.hash = window.location.hash.split('?')[0].split('/')[0];
                cAlert('Imported', 'Shared pages imported successfully!');
            }
        });
    };

    const handleShareScrapbook = () => {
        try {
            const dataToShare = {
                pages: pages,
                style: {
                    paperStyle,
                    fontFamily,
                    baseFontSize,
                    lineSpacing,
                    lineHeight,
                    letterSpacing,
                    docPadding,
                    paperColor,
                    lineStyle,
                    lineOpacity,
                    lineThickness,
                    doubleLines,
                    marginStyle,
                    marginOffset,
                    marginColor
                }
            };
            const jsonStr = JSON.stringify(dataToShare);
            const bytes = new TextEncoder().encode(jsonStr);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const shareUrl = `${window.location.origin}${window.location.pathname}#timer?scrapbook=${base64}`;

            navigator.clipboard.writeText(shareUrl).then(() => {
                cAlert('Success', 'Interactive Scrapbook share link copied to clipboard!');
            }).catch(() => {
                cPrompt('Share Link', 'Copy this share link:', shareUrl).then(() => { });
            });
        } catch (err) {
            cAlert('Error', 'Failed to generate interactive scrapbook share link.');
        }
    };

    const getSearchRanges = (root, query) => {
        if (!query) return [];
        const ranges = [];
        const queryLower = query.toLowerCase();

        const textNodes = [];
        const walk = (node) => {
            if (node.nodeType === 3) {
                textNodes.push(node);
            } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.nodeName)) {
                for (let child of node.childNodes) {
                    walk(child);
                }
            }
        };
        walk(root);

        textNodes.forEach(node => {
            const text = node.nodeValue;
            let index = text.toLowerCase().indexOf(queryLower);
            while (index !== -1) {
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + query.length);
                ranges.push(range);
                index = text.toLowerCase().indexOf(queryLower, index + 1);
            }
        });

        return ranges;
    };

    const highlightRanges = (ranges, activeIdx = 0) => {
        if (!CSS.highlights) {
            if (ranges.length > 0) {
                try {
                    const activeRange = ranges[Math.min(activeIdx, ranges.length - 1)];
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(activeRange);
                    const activeNode = activeRange.startContainer.parentElement;
                    if (activeNode) {
                        activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } catch (e) { }
            }
            return;
        }

        CSS.highlights.delete('search-results');
        CSS.highlights.delete('active-search-result');

        if (ranges.length === 0) return;

        const allRanges = [];
        let activeRange = null;
        const targetIdx = Math.max(0, Math.min(activeIdx, ranges.length - 1));

        ranges.forEach((range, idx) => {
            if (idx === targetIdx) {
                activeRange = range;
            } else {
                allRanges.push(range);
            }
        });

        if (allRanges.length > 0) {
            const searchResultsHighlight = new Highlight(...allRanges);
            CSS.highlights.set('search-results', searchResultsHighlight);
        }
        if (activeRange) {
            const activeHighlight = new Highlight(activeRange);
            CSS.highlights.set('active-search-result', activeHighlight);

            try {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(activeRange);
            } catch (e) { }

            const activeNode = activeRange.startContainer.parentElement;
            if (activeNode) {
                activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const highlightSearchQuery = (element, query, activeIdx = 0) => {
        const ranges = getSearchRanges(element, query);
        highlightRanges(ranges, activeIdx);
    };

    const removeSearchHighlights = (element) => {
        if (CSS.highlights) {
            CSS.highlights.delete('search-results');
            CSS.highlights.delete('active-search-result');
        }
    };

    const getCleanHTML = (element) => {
        if (!element) return '';
        const clone = element.cloneNode(true);
        const highlights = clone.querySelectorAll('.find-highlight');
        highlights.forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                const textNode = document.createTextNode(span.innerText);
                parent.replaceChild(textNode, span);
                parent.normalize();
            }
        });
        const images = clone.querySelectorAll('img');
        images.forEach(img => {
            img.classList.remove('selected-for-resize');
        });
        return clone.innerHTML;
    };

    useEffect(() => {
        const activeRef = isExpanded ? modalRef : inlineRef;
        if (activeRef.current) {
            highlightSearchQuery(activeRef.current, findText, activeMatchIndex);
        }
    }, [findText, content, isExpanded, activeMatchIndex]);

    // Sync shared scrapbook state from URL
    useEffect(() => {
        const checkForSharedScrapbook = () => {
            const dataStr = getScrapbookFromUrl();
            if (dataStr) {
                try {
                    const base64UrlSafe = dataStr.replace(/-/g, '+').replace(/_/g, '/');
                    const binary = atob(base64UrlSafe);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    const jsonStr = new TextDecoder().decode(bytes);
                    const decoded = JSON.parse(jsonStr);
                    if (decoded && decoded.pages) {
                        setSharedScrapbook(decoded);
                        setIsViewerMode(true);
                        setPages(decoded.pages);
                        setCurrentPageIndex(0);
                        setContent(decoded.pages[0]?.content || '');

                        // Apply layout styles from the shared scrapbook
                        if (decoded.style) {
                            if (decoded.style.paperStyle) setPaperStyle(decoded.style.paperStyle);
                            if (decoded.style.fontFamily) setFontFamily(decoded.style.fontFamily);
                            if (decoded.style.baseFontSize) setBaseFontSize(decoded.style.baseFontSize);
                            if (decoded.style.lineSpacing) setLineSpacing(decoded.style.lineSpacing);
                            if (decoded.style.lineHeight) setLineHeight(decoded.style.lineHeight);
                            if (decoded.style.letterSpacing) setLetterSpacing(decoded.style.letterSpacing);
                            if (decoded.style.docPadding) setDocPadding(decoded.style.docPadding);
                            if (decoded.style.paperColor) setPaperColor(decoded.style.paperColor);
                            if (decoded.style.lineStyle) setLineStyle(decoded.style.lineStyle);
                            if (decoded.style.lineOpacity) setLineOpacity(decoded.style.lineOpacity);
                            if (decoded.style.lineThickness) setLineThickness(decoded.style.lineThickness);
                            if (decoded.style.doubleLines) setDoubleLines(decoded.style.doubleLines);
                            if (decoded.style.marginStyle) setMarginStyle(decoded.style.marginStyle);
                            if (decoded.style.marginOffset) setMarginOffset(decoded.style.marginOffset);
                            if (decoded.style.marginColor) setMarginColor(decoded.style.marginColor);
                        }
                        return;
                    }
                } catch (e) {
                    console.error("Failed to parse shared scrapbook", e);
                }
            }

            setIsViewerMode(false);
            setSharedScrapbook(null);

            // Reload local pages
            try {
                const pagesKey = userKey('shelf_notebook_pages');
                const stored = localStorage.getItem(pagesKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setPages(parsed);
                        setCurrentPageIndex(0);
                        setContent(parsed[0]?.content || '');
                        triggerLocalSettingsReload();
                        return;
                    }
                }
            } catch (e) { }

            try {
                const key = userKey('shelf_notebook_scratchpad_html');
                const existing = localStorage.getItem(key) || '';
                const defaultPages = [{ id: 'page-1', title: 'new note', content: existing }];
                setPages(defaultPages);
                setCurrentPageIndex(0);
                setContent(existing);
            } catch {
                const defaultPages = [{ id: 'page-1', title: 'new note', content: '' }];
                setPages(defaultPages);
                setCurrentPageIndex(0);
                setContent('');
            }
            triggerLocalSettingsReload();
        };

        const triggerLocalSettingsReload = () => {
            const savedStyle = uGet('shelf_notebook_paper_style');
            if (savedStyle !== null && savedStyle !== undefined) setPaperStyle(savedStyle);
            const savedFont = uGet('shelf_notebook_font_family');
            if (savedFont !== null && savedFont !== undefined) setFontFamily(savedFont);
            const savedSize = uGet('shelf_notebook_font_size');
            if (savedSize !== null && savedSize !== undefined) setBaseFontSize(savedSize);
            const savedLHeight = uGet('shelf_notebook_line_height');
            if (savedLHeight !== null && savedLHeight !== undefined) setLineHeight(savedLHeight);
            const savedLSpacingLetter = uGet('shelf_notebook_letter_spacing');
            if (savedLSpacingLetter !== null && savedLSpacingLetter !== undefined) setLetterSpacing(savedLSpacingLetter);
            const savedDPadding = uGet('shelf_notebook_doc_padding');
            if (savedDPadding !== null && savedDPadding !== undefined) setDocPadding(savedDPadding);
            const savedPColor = uGet('shelf_notebook_paper_color');
            if (savedPColor !== null && savedPColor !== undefined) setPaperColor(savedPColor);
            const savedLStyle = uGet('shelf_notebook_line_style');
            if (savedLStyle !== null && savedLStyle !== undefined) setLineStyle(savedLStyle);
            const savedLOpacity = uGet('shelf_notebook_line_opacity');
            if (savedLOpacity !== null && savedLOpacity !== undefined) setLineOpacity(savedLOpacity);
            const savedLThickness = uGet('shelf_notebook_line_thickness');
            if (savedLThickness !== null && savedLThickness !== undefined) setLineThickness(savedLThickness);
            const savedDoubleL = uGet('shelf_notebook_double_lines');
            if (savedDoubleL !== null && savedDoubleL !== undefined) setDoubleLines(savedDoubleL);
            const savedMStyle = uGet('shelf_notebook_margin_style');
            if (savedMStyle !== null && savedMStyle !== undefined) setMarginStyle(savedMStyle);
            const savedMOffset = uGet('shelf_notebook_margin_offset');
            if (savedMOffset !== null && savedMOffset !== undefined) setMarginOffset(savedMOffset);
            const savedMColor = uGet('shelf_notebook_margin_color');
            if (savedMColor !== null && savedMColor !== undefined) setMarginColor(savedMColor);
        };

        checkForSharedScrapbook();
        window.addEventListener('hashchange', checkForSharedScrapbook);
        return () => window.removeEventListener('hashchange', checkForSharedScrapbook);
    }, []);

    // Sync content and styles if modified elsewhere
    useEffect(() => {
        const handleSync = async () => {
            if (isViewerMode) return;
            const pagesKey = userKey('shelf_notebook_pages');
            const storedPages = localStorage.getItem(pagesKey);
            if (storedPages) {
                try {
                    const parsed = JSON.parse(storedPages);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        if (JSON.stringify(parsed) !== JSON.stringify(pages)) {
                            setPages(parsed);
                        }
                        const idx = Math.min(currentPageIndex, parsed.length - 1);
                        const newContent = parsed[idx]?.content || '';
                        if (newContent !== content) {
                            setContent(newContent);
                        }
                    }
                } catch (e) { }
            } else {
                const key = userKey('shelf_notebook_scratchpad_html');
                const savedContent = await getScratchpadContent(key);
                if (savedContent !== null && savedContent !== undefined && savedContent !== content) {
                    setContent(savedContent);
                    setPages([{ id: 'page-1', title: 'new note', content: savedContent }]);
                }
            }
            const savedStyle = uGet('shelf_notebook_paper_style');
            if (savedStyle !== null && savedStyle !== undefined && savedStyle !== paperStyle) {
                setPaperStyle(savedStyle);
            }
            const savedFont = uGet('shelf_notebook_font_family');
            if (savedFont !== null && savedFont !== undefined && savedFont !== fontFamily) {
                setFontFamily(savedFont);
            }
            const savedSize = uGet('shelf_notebook_font_size');
            if (savedSize !== null && savedSize !== undefined && savedSize !== baseFontSize) {
                setBaseFontSize(savedSize);
            }
            const savedLHeight = uGet('shelf_notebook_line_height');
            if (savedLHeight !== null && savedLHeight !== undefined && savedLHeight !== lineHeight) {
                setLineHeight(savedLHeight);
            }
            const savedLSpacingLetter = uGet('shelf_notebook_letter_spacing');
            if (savedLSpacingLetter !== null && savedLSpacingLetter !== undefined && savedLSpacingLetter !== letterSpacing) {
                setLetterSpacing(savedLSpacingLetter);
            }
            const savedDPadding = uGet('shelf_notebook_doc_padding');
            if (savedDPadding !== null && savedDPadding !== undefined && savedDPadding !== docPadding) {
                setDocPadding(savedDPadding);
            }
            const savedColor = uGet('shelf_notebook_paper_color');
            if (savedColor !== null && savedColor !== undefined && savedColor !== paperColor) {
                setPaperColor(savedColor);
            }
            const savedLStyle = uGet('shelf_notebook_line_style');
            if (savedLStyle !== null && savedLStyle !== undefined && savedLStyle !== lineStyle) {
                setLineStyle(savedLStyle);
            }
            const savedLSpacing = uGet('shelf_notebook_line_spacing');
            if (savedLSpacing !== null && savedLSpacing !== undefined && savedLSpacing !== lineSpacing) {
                setLineSpacing(savedLSpacing);
            }
            const savedLOpacity = uGet('shelf_notebook_line_opacity');
            if (savedLOpacity !== null && savedLOpacity !== undefined && savedLOpacity !== lineOpacity) {
                setLineOpacity(savedLOpacity);
            }
            const savedLThickness = uGet('shelf_notebook_line_thickness');
            if (savedLThickness !== null && savedLThickness !== undefined && savedLThickness !== lineThickness) {
                setLineThickness(savedLThickness);
            }
            const savedDoubleLines = uGet('shelf_notebook_double_lines');
            if (savedDoubleLines !== null && savedDoubleLines !== undefined && savedDoubleLines !== doubleLines) {
                setDoubleLines(savedDoubleLines);
            }
            const savedMargin = uGet('shelf_notebook_margin_style');
            if (savedMargin !== null && savedMargin !== undefined && savedMargin !== marginStyle) {
                setMarginStyle(savedMargin);
            }
            const savedMarginOffset = uGet('shelf_notebook_margin_offset');
            if (savedMarginOffset !== null && savedMarginOffset !== undefined && savedMarginOffset !== marginOffset) {
                setMarginOffset(savedMarginOffset);
            }
            const savedMarginColor = uGet('shelf_notebook_margin_color');
            if (savedMarginColor !== null && savedMarginColor !== undefined && savedMarginColor !== marginColor) {
                setMarginColor(savedMarginColor);
            }
            const savedReadOnly = uGet('shelf_notebook_readonly');
            if (savedReadOnly !== null && savedReadOnly !== undefined && savedReadOnly !== readOnly) {
                setReadOnly(savedReadOnly);
            }
            const savedSpellcheck = uGet('shelf_notebook_spellcheck');
            if (savedSpellcheck !== null && savedSpellcheck !== undefined && savedSpellcheck !== spellcheck) {
                setSpellcheck(savedSpellcheck);
            }
            const savedAutoCap = uGet('shelf_notebook_autocap');
            if (savedAutoCap !== null && savedAutoCap !== undefined && savedAutoCap !== autoCapitalize) {
                setAutoCapitalize(savedAutoCap);
            }
            const savedFocus = uGet('shelf_notebook_focusmode');
            if (savedFocus !== null && savedFocus !== undefined && savedFocus !== focusMode) {
                setFocusMode(savedFocus);
            }
            const savedWordCount = uGet('shelf_notebook_wordcount');
            if (savedWordCount !== null && savedWordCount !== undefined && savedWordCount !== showWordCount) {
                setShowWordCount(savedWordCount);
            }
            const savedCharCount = uGet('shelf_notebook_charcount');
            if (savedCharCount !== null && savedCharCount !== undefined && savedCharCount !== showCharCount) {
                setShowCharCount(savedCharCount);
            }
        };
        window.addEventListener('storage', handleSync);
        window.addEventListener('notebook-updated', handleSync);
        window.addEventListener('user-switched', handleSync);

        handleSync();

        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('notebook-updated', handleSync);
            window.removeEventListener('user-switched', handleSync);
        };
    }, [
        isViewerMode, currentPageIndex, pages, content, paperStyle, fontFamily, baseFontSize,
        lineHeight, letterSpacing, docPadding, paperColor, lineStyle, lineSpacing, lineOpacity,
        lineThickness, doubleLines, marginStyle, marginOffset, marginColor, readOnly, spellcheck,
        autoCapitalize, focusMode, showWordCount, showCharCount
    ]);

    const setInlineRef = (el) => {
        inlineRef.current = el;
        if (el) {
            if (el.innerHTML !== content) {
                el.innerHTML = content;
            }
            if (findText) {
                highlightSearchQuery(el, findText);
            }
        }
    };

    const setModalRef = (el) => {
        modalRef.current = el;
        if (el) {
            if (el.innerHTML !== content) {
                el.innerHTML = content;
            }
            if (findText) {
                highlightSearchQuery(el, findText);
            }
        }
    };

    // Sync innerHTML to refs when content updates from external events
    useEffect(() => {
        if (inlineRef.current && getCleanHTML(inlineRef.current) !== content) {
            inlineRef.current.innerHTML = content;
        }
        if (modalRef.current && getCleanHTML(modalRef.current) !== content) {
            modalRef.current.innerHTML = content;
        }
    }, [content, isExpanded, spellcheck, autoCapitalize]);

    // Handle document-wide click to close active popovers
    useEffect(() => {
        const handleOutsideClick = (e) => {
            setActivePopover(null);
            setActiveColorPicker(null);

            // Close image selection if clicked outside the image and overlay
            if (activeImageElement && e.target.tagName !== 'IMG' && !e.target.closest('.image-resizer-floating-bar')) {
                activeImageElement.classList.remove('selected-for-resize');
                setActiveImageElement(null);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, [activeImageElement]);

    // Hook to track active styling attributes under selection
    useEffect(() => {
        const handleSelectionChange = () => {
            // Always save selection so toolbar buttons can restore it (works in both inline & expanded)
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                // Only save if range is inside our editor
                const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
                if (activeEditor && activeEditor.contains(range.commonAncestorContainer)) {
                    savedSelectionRef.current = range.cloneRange();
                }
            }
            if (!isExpanded) return;
            try {
                setActiveStyles({
                    bold: document.queryCommandState('bold'),
                    italic: document.queryCommandState('italic'),
                    underline: document.queryCommandState('underline'),
                    strikethrough: document.queryCommandState('strikeThrough'),
                    subscript: document.queryCommandState('subscript'),
                    superscript: document.queryCommandState('superscript'),
                    alignLeft: document.queryCommandState('justifyLeft'),
                    alignCenter: document.queryCommandState('justifyCenter'),
                    alignRight: document.queryCommandState('justifyRight'),
                    alignJustify: document.queryCommandState('justifyFull'),
                    unorderedList: document.queryCommandState('insertUnorderedList'),
                    orderedList: document.queryCommandState('insertOrderedList'),
                    foreColor: document.queryCommandValue('foreColor') || 'rgb(0, 0, 0)',
                    backColor: document.queryCommandValue('backColor') || 'transparent'
                });
            } catch (e) {
                // Out of range, ignore
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);
        document.addEventListener('mouseup', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('keyup', handleSelectionChange);
            document.removeEventListener('mouseup', handleSelectionChange);
        };
    }, [isExpanded]);

    const handleInput = (e) => {
        if (isReadOnlyMode) return;
        const html = getCleanHTML(e.currentTarget);
        setContent(html);

        // Update pages state
        setPages(prevPages => {
            const updated = [...prevPages];
            if (updated[currentPageIndex]) {
                updated[currentPageIndex] = {
                    ...updated[currentPageIndex],
                    content: html
                };
            }
            const pagesKey = userKey('shelf_notebook_pages');
            localStorage.setItem(pagesKey, JSON.stringify(updated));
            return updated;
        });

        const key = userKey('shelf_notebook_scratchpad_html');
        setScratchpadContent(key, html).then(() => {
            window.dispatchEvent(new Event('notebook-updated'));
        });
    };

    const handleChangeStyle = (style) => {
        setPaperStyle(style);
        uSet('shelf_notebook_paper_style', style);
        window.dispatchEvent(new Event('notebook-updated'));
    };

    const handleCopy = () => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.innerText || tempDiv.textContent || '';
        navigator.clipboard.writeText(plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Saved selection for toolbar actions (selecting text then clicking toolbar loses focus)
    const savedSelectionRef = React.useRef(null);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        const activeRef = isExpanded ? modalRef : inlineRef;
        // Focus the editor first so addRange doesn't silently fail
        if (activeRef.current) {
            activeRef.current.focus();
        }
        const sel = window.getSelection();
        if (savedSelectionRef.current && sel) {
            try {
                sel.removeAllRanges();
                sel.addRange(savedSelectionRef.current);
            } catch (e) { }
        }
    };

    const applyFormat = (command, value = null) => {
        if (isReadOnlyMode) return;
        // Restore saved selection so toolbar clicks don't lose the text selection
        restoreSelection();
        if (command === 'backColor') {
            // backColor via execCommand is unreliable; wrap selection in a span
            applyHighlightColor(value);
        } else {
            document.execCommand(command, false, value);
        }
        const activeRef = isExpanded ? modalRef : inlineRef;
        if (activeRef.current) {
            handleInput({ currentTarget: activeRef.current });
        }
        // Force refresh active styles
        setTimeout(() => {
            try {
                setActiveStyles(prev => ({
                    ...prev,
                    bold: document.queryCommandState('bold'),
                    italic: document.queryCommandState('italic'),
                    underline: document.queryCommandState('underline'),
                    strikethrough: document.queryCommandState('strikeThrough'),
                    subscript: document.queryCommandState('subscript'),
                    superscript: document.queryCommandState('superscript'),
                    alignLeft: document.queryCommandState('justifyLeft'),
                    alignCenter: document.queryCommandState('justifyCenter'),
                    alignRight: document.queryCommandState('justifyRight'),
                    alignJustify: document.queryCommandState('justifyFull'),
                    unorderedList: document.queryCommandState('insertUnorderedList'),
                    orderedList: document.queryCommandState('insertOrderedList'),
                    foreColor: document.queryCommandValue('foreColor') || 'rgb(0,0,0)',
                    backColor: document.queryCommandValue('backColor') || 'transparent'
                }));
            } catch (err) { }
        }, 10);
    };

    // Reliable highlight: wrap selected text in a span with background-color
    const applyHighlightColor = (color) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
        const range = sel.getRangeAt(0);
        if (color === 'transparent' || color === 'none') {
            // Remove existing highlight spans in selection
            document.execCommand('removeFormat', false, null);
            return;
        }
        const mark = document.createElement('mark');
        mark.style.backgroundColor = color;
        mark.style.color = 'inherit';
        mark.style.padding = '0 1px';
        mark.style.borderRadius = '2px';
        try {
            range.surroundContents(mark);
        } catch {
            // surroundContents fails on partial cross-element selections; use extractContents
            const frag = range.extractContents();
            mark.appendChild(frag);
            range.insertNode(mark);
        }
        sel.removeAllRanges();
        sel.collapse(mark, mark.childNodes.length);
        const activeRef = isExpanded ? modalRef : inlineRef;
        if (activeRef.current) handleInput({ currentTarget: activeRef.current });
    };

    const changeCase = (type) => {
        if (isReadOnlyMode) return;
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        let selectedText = range.toString();
        if (!selectedText) return;

        if (type === 'upper') selectedText = selectedText.toUpperCase();
        else if (type === 'lower') selectedText = selectedText.toLowerCase();
        else if (type === 'title') {
            selectedText = selectedText.replace(/\b\w/g, c => c.toUpperCase());
        }

        range.deleteContents();
        range.insertNode(document.createTextNode(selectedText));
        handleInput({ currentTarget: isExpanded ? modalRef.current : inlineRef.current });
    };

    const insertTimestamp = () => {
        const now = new Date();
        const timeStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        applyFormat('insertHTML', `&nbsp;<strong>[${timeStr}]</strong>&nbsp;`);
    };
    const insertCheckbox = () => {
        const uniqueId = 'task-' + Math.random().toString(36).substring(2, 9);
        applyFormat(
            'insertHTML',
            `<div class="scratchpad-task-item" style="display: flex; align-items: center; gap: 10px; margin: 8px 0; line-height: 1.5;">
                <input type="checkbox" class="scratchpad-task-checkbox" style="cursor: pointer; width: 16px; height: 16px; margin: 0; accent-color: var(--accent-color);" />
                <span id="${uniqueId}" data-placeholder="Task" style="flex-grow: 1; outline: none; min-width: 50px; display: inline-block;"></span>
            </div>`
        );
        selectInsertedElement(uniqueId);
    };

    const insertCodeBlock = () => {
        const uniqueId = 'code-' + Math.random().toString(36).substring(2, 9);
        applyFormat(
            'insertHTML',
            `<pre id="${uniqueId}" data-placeholder="Write your code here..." style="background-color: #1e293b; color: #1e293b; border: 1.5px solid var(--border-color, #cbd5e1); padding: 14px 18px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; margin: 16px 0; overflow: auto; resize: vertical; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); outline: none; white-space: pre-wrap; word-break: break-all; min-height: 60px; display: block;"></pre>`
        );
        selectInsertedElement(uniqueId);
    };

    const insertQuote = () => {
        const uniqueId = 'quote-' + Math.random().toString(36).substring(2, 9);
        applyFormat(
            'insertHTML',
            `<blockquote id="${uniqueId}" data-placeholder="Write your quote here..." style="border-left: 4px solid var(--accent-color, #10b981); background-color: var(--option-bg, rgba(0, 0, 0, 0.02)); padding: 12px 18px; margin: 16px 0; border-radius: 6px; font-style: italic; color: var(--text-secondary); outline: none; min-height: 24px;"></blockquote>`
        );
        selectInsertedElement(uniqueId);
    };

    const selectInsertedElement = (elementId) => {
        setTimeout(() => {
            const el = document.getElementById(elementId);
            if (!el) return;

            el.focus();

            const range = document.createRange();
            range.selectNodeContents(el);

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            el.removeAttribute("id");
        }, 10);
    };

    const insertTable = () => {
        cPrompt('Insert Table', 'Enter number of rows:', '3', '3').then((rowsVal) => {
            if (rowsVal === null) return;
            const rows = parseInt(rowsVal || '3');
            cPrompt('Insert Table', 'Enter number of columns:', '3', '3').then((colsVal) => {
                if (colsVal === null) return;
                const cols = parseInt(colsVal || '3');
                if (isNaN(rows) || isNaN(cols)) return;

                let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1.5px solid var(--border-color);">`;
                for (let r = 0; r < rows; r++) {
                    tableHtml += `<tr>`;
                    for (let c = 0; c < cols; c++) {
                        tableHtml += `<td style="border: 1px solid var(--border-color); padding: 8px; min-width: 50px;">Cell</td>`;
                    }
                    tableHtml += `</tr>`;
                }
                tableHtml += `</table>`;
                applyFormat('insertHTML', tableHtml);
            });
        });
    };

    const handleLink = () => {
        cPrompt('Insert Link', 'Enter link URL:', 'https://', 'https://').then((url) => {
            if (url) {
                applyFormat('createLink', url);
            }
        });
    };

    const insertResizableImage = (src) => {
        const html = `<img src="${src}" style="width: 180px; height: auto; max-width: 100%; object-fit: contain; display: inline-block; vertical-align: middle; margin: 8px 12px; padding: 6px; cursor: pointer;" />`;
        applyFormat('insertHTML', html);
    };

    const triggerLocalImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    insertResizableImage(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const triggerImageUrlPrompt = () => {
        cPrompt('Insert Image', 'Enter image URL:', 'https://').then((url) => {
            if (url) {
                insertResizableImage(url);
            }
        });
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    insertResizableImage(event.target.result);
                };
                reader.readAsDataURL(file);
                e.preventDefault();
            }
        }
    };

    const handleDrop = (e) => {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            if (files[i].type.indexOf('image') !== -1) {
                const file = files[i];
                const reader = new FileReader();
                reader.onload = (event) => {
                    insertResizableImage(event.target.result);
                };
                reader.readAsDataURL(file);
                e.preventDefault();
            }
        }
    };

    const handleFindReplace = (all = false) => {
        if (!findText) return;
        const activeRef = isExpanded ? modalRef : inlineRef;
        const editor = activeRef.current;
        if (!editor) return;

        const ranges = getSearchRanges(editor, findText);
        if (ranges.length === 0) {
            cAlert('Text Not Found', `Could not find "${findText}" in document.`);
            return;
        }

        if (all) {
            // Replace all matches backwards to preserve node offsets
            for (let i = ranges.length - 1; i >= 0; i--) {
                const range = ranges[i];
                range.deleteContents();
                const textNode = document.createTextNode(replaceText);
                range.insertNode(textNode);
            }

            editor.normalize();
            handleInput({ currentTarget: editor });
            setActiveMatchIndex(0);
            removeSearchHighlights(editor);
        } else {
            // Replace the currently active match
            const idx = Math.max(0, Math.min(activeMatchIndex, ranges.length - 1));
            const range = ranges[idx];
            if (range) {
                range.deleteContents();
                const textNode = document.createTextNode(replaceText);
                range.insertNode(textNode);
            }

            editor.normalize();
            handleInput({ currentTarget: editor });

            // Get new ranges to determine next selection index
            const newRanges = getSearchRanges(editor, findText);
            if (newRanges.length > 0) {
                const newIdx = idx >= newRanges.length ? 0 : idx;
                setActiveMatchIndex(newIdx);
                highlightRanges(newRanges, newIdx);
            } else {
                setActiveMatchIndex(0);
                removeSearchHighlights(editor);
            }
        }
    };

    const handleDownload = () => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.innerText || tempDiv.textContent || '';
        const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'shelf_notes.txt';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportHTML = () => {
        const paperStyleObj = getPaperBackground(paperStyle, lineSpacing, lineOpacity, lineStyle, paperColor, lineThickness);
        const backgroundCSS = `
            background: ${paperStyleObj.background || 'none'};
            background-size: ${paperStyleObj.backgroundSize || 'auto'};
            background-attachment: ${paperStyleObj.backgroundAttachment || 'scroll'};
            background-color: ${paperStyleObj.backgroundColor || 'var(--surface-bg)'};
        `;

        const showMargin = paperStyle === 'lines' && marginStyle !== 'none';
        const marginLineCSS = showMargin ? `
            .margin-line {
                position: absolute;
                top: 0;
                bottom: 0;
                left: ${marginStyle === 'left' ? `${marginOffset}px` : 'auto'};
                right: ${marginStyle === 'right' ? `${marginOffset}px` : 'auto'};
                width: ${doubleLines ? '4px' : '1.5px'};
                border-left: ${doubleLines ? `1px solid ${marginColor}` : 'none'};
                border-right: 1px solid ${marginColor};
                opacity: 0.65;
                pointer-events: none;
                z-index: 2;
            }
        ` : '';

        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Shelf Scratchpad Export</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
        }
        .scratchpad-exported-page {
            position: relative;
            min-height: 100vh;
            box-sizing: border-box;
            padding: 40px ${docPadding}px 60px ${docPadding}px;
            font-family: ${fontFamily};
            font-size: ${baseFontSize}px;
            line-height: ${lineSpacing}px;
            color: #1e293b;
            ${backgroundCSS}
        }
        ${marginLineCSS}
        
        .scratchpad-exported-page h1 {
            font-size: 2.2rem;
            margin: 16px 0 8px 0;
        }
        .scratchpad-exported-page h2 {
            font-size: 1.7rem;
            margin: 14px 0 6px 0;
        }
        .scratchpad-exported-page pre {
            background-color: #f8fafc !important;
            border: 1.5px solid #cbd5e1 !important;
            padding: 10px 14px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9rem;
            margin: 12px 0;
            overflow-x: auto;
            position: relative;
            z-index: 2;
        }
        .scratchpad-exported-page blockquote {
            background-color: #f8fafc !important;
            border-left: 4px solid ${marginColor || '#3b82f6'} !important;
            padding: 8px 14px;
            margin: 12px 0;
            font-style: italic;
            position: relative;
            z-index: 2;
        }
        .scratchpad-exported-page img {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            margin: 8px 12px;
            padding: 6px;
            display: inline-block;
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <div class="scratchpad-exported-page">
        ${showMargin ? '<div class="margin-line"></div>' : ''}
        <div style="position: relative; z-index: 1;">
            ${content}
        </div>
    </div>
</body>
</html>
        `;
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'shelf_notes.html';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportMarkdown = () => {
        let markdown = content
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<i>(.*?)<\/i>/gi, '*$1*')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<u>(.*?)<\/u>/gi, '_$1_')
            .replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~')
            .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<li>(.*?)<\/li>/gi, '- $1')
            .replace(/<ul>/gi, '\n')
            .replace(/<\/ul>/gi, '\n')
            .replace(/<ol>/gi, '\n')
            .replace(/<\/ol>/gi, '\n')
            .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<img[^>]+src="([^">]+)"[^>]*>/gi, '![Image]($1)');

        markdown = markdown.replace(/<[^>]+>/g, '');

        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'shelf_notes.md';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleEditorClick = (e) => {
        // Sticky delete delegation
        const deleteBtn = e.target.closest('.sticky-delete-btn');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const sticky = deleteBtn.closest('.sticky-note-container');
            if (sticky) {
                sticky.remove();
                const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
                if (activeEditor) handleInput({ currentTarget: activeEditor });
            }
            return;
        }

        // Active sticky note tracking delegation
        const activeSticky = e.target.closest('.sticky-note-container');
        if (activeSticky) {
            window.activeStickyNoteId = activeSticky.id;
        }

        // Group Lock toggle delegation
        const lockBtn = e.target.closest('.lock-btn');
        if (lockBtn) {
            e.preventDefault();
            e.stopPropagation();
            const group = lockBtn.closest('.grouped-container');
            if (group) {
                const isLocked = group.classList.toggle('locked');
                const lockSpan = lockBtn.querySelector('.lock-icon-span');
                if (lockSpan) lockSpan.innerHTML = isLocked ? 'Unlock' : 'Lock';
                const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
                if (activeEditor) handleInput({ currentTarget: activeEditor });
            }
            return;
        }

        // Group Ungroup delegation
        const ungroupBtn = e.target.closest('.ungroup-btn');
        if (ungroupBtn) {
            e.preventDefault();
            e.stopPropagation();
            const group = ungroupBtn.closest('.grouped-container');
            const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
            if (group && activeEditor) {
                const contentArea = group.querySelector('.group-content-area');
                if (contentArea) {
                    const children = Array.from(contentArea.children);
                    const groupRect = group.getBoundingClientRect();
                    const editorRect = activeEditor.getBoundingClientRect();
                    const leftOffset = groupRect.left - editorRect.left + activeEditor.scrollLeft;
                    const topOffset = groupRect.top - editorRect.top + activeEditor.scrollTop;

                    children.forEach(child => {
                        const childLeft = parseInt(child.style.left) || 0;
                        const childTop = parseInt(child.style.top) || 0;
                        child.style.position = 'absolute';
                        child.style.left = `${leftOffset + childLeft}px`;
                        child.style.top = `${topOffset + childTop}px`;
                        activeEditor.appendChild(child);
                    });
                }
                group.remove();
                handleInput({ currentTarget: activeEditor });
            }
            return;
        }

        const anchor = e.target.closest('a');
        if (anchor) {
            e.preventDefault();
            window.open(anchor.href, '_blank');
            return;
        }

        const isImg = e.target.tagName === 'IMG';
        if (isImg) {
            e.stopPropagation();

            if (activeImageElement && activeImageElement !== e.target) {
                activeImageElement.classList.remove('selected-for-resize');
            }

            e.target.classList.toggle('selected-for-resize');
            if (e.target.classList.contains('selected-for-resize')) {
                setActiveImageElement(e.target);
            } else {
                setActiveImageElement(null);
            }
        } else {
            if (activeImageElement) {
                activeImageElement.classList.remove('selected-for-resize');
                setActiveImageElement(null);
            }

            // Click-to-position logic when clicking below existing lines
            if (e.target === e.currentTarget && !isReadOnlyMode) {
                const editor = e.currentTarget;
                const rect = editor.getBoundingClientRect();

                // Get line spacing and padding top based on mode (expanded vs inline)
                const spacing = isExpanded ? lineSpacing : 24;
                const paddingTop = isExpanded ? 20 : 12;

                // Click Y relative to the top of the editor content (including scroll)
                const relativeY = e.clientY - rect.top + editor.scrollTop - paddingTop;

                // Which line was clicked (0-indexed)
                const targetLineIndex = Math.max(0, Math.floor(relativeY / spacing));

                // Count current line blocks/elements
                const children = Array.from(editor.children);
                let currentLineCount = children.length;
                if (currentLineCount === 0) {
                    currentLineCount = 1;
                }

                if (targetLineIndex >= currentLineCount) {
                    const linesToAdd = targetLineIndex - currentLineCount + 1;

                    // Create and append empty paragraphs
                    for (let i = 0; i < linesToAdd; i++) {
                        const emptyLine = document.createElement('p');
                        emptyLine.innerHTML = '<br>';
                        editor.appendChild(emptyLine);
                    }

                    // Trigger input to save state
                    handleInput({ currentTarget: editor });

                    // Focus and select the last empty line
                    setTimeout(() => {
                        const lastLine = editor.lastElementChild;
                        if (lastLine) {
                            const range = document.createRange();
                            range.selectNodeContents(lastLine);
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(range);
                            lastLine.focus();
                        }
                    }, 10);
                }
            }
        }
    };

    const handleKeyDown = (e) => {
        // Multicolor mode: cycle through rainbow colors per printable character
        if (isMultiColor && e.key && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
            try {
                const color = MULTI_COLORS[multiColorIndexRef.current % MULTI_COLORS.length];
                document.execCommand('foreColor', false, color);
                multiColorIndexRef.current += 1;
            } catch (err) { }
        } else if (!isMultiColor && activePenColor && e.key && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Sticky pen color formatting
            const isPrintable = e.key.length === 1;
            const isEnter = e.key === 'Enter';
            if (isPrintable || isEnter) {
                try {
                    const currentSelectionColor = document.queryCommandValue('foreColor');
                    if (!isColorActive(currentSelectionColor, activePenColor)) {
                        document.execCommand('foreColor', false, activePenColor);
                    }
                } catch (err) { }
            }
        }

        // Selection state inside pre code blocks: Cmd+A (Mac) or Ctrl+A (Windows)
        const isSelAll = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a';
        if (isSelAll) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const preElement = range.startContainer.nodeType === 3
                    ? range.startContainer.parentNode.closest('pre')
                    : range.startContainer.closest('pre');

                if (preElement) {
                    e.preventDefault();
                    e.stopPropagation();
                    const newRange = document.createRange();
                    newRange.selectNodeContents(preElement);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    return;
                }
            }
        }

        // Auto capitalization logic for physical keyboards
        if (autoCapitalize && e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.startContainer;

                const parentPre = container.nodeType === 3 ? container.parentNode.closest('pre, code') : container.closest('pre, code');
                if (!parentPre) {
                    let isStart = false;
                    let isAfterSentence = false;

                    if (container.nodeType === 3) {
                        const text = container.nodeValue;
                        const offset = range.startOffset;
                        const textBefore = text.slice(0, offset);

                        isStart = textBefore.trim().length === 0;
                        isAfterSentence = /[.!?]\s+$/.test(textBefore);

                        if (isStart && container.previousSibling) {
                            const prevText = container.previousSibling.textContent;
                            if (/[.!?]\s*$/.test(prevText)) {
                                isAfterSentence = true;
                            }
                        }
                    } else if (container.nodeType === 1) {
                        isStart = true;
                    }

                    if (isStart || isAfterSentence) {
                        e.preventDefault();
                        const capChar = e.key.toUpperCase();
                        document.execCommand('insertText', false, capChar);
                    }
                }
            }
        }
    };

    const handleKeyUp = (e) => {
        // Save selection for toolbar actions
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        }
        // Selection state
        try {
            setActiveStyles({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                strikethrough: document.queryCommandState('strikeThrough'),
                subscript: document.queryCommandState('subscript'),
                superscript: document.queryCommandState('superscript'),
                alignLeft: document.queryCommandState('justifyLeft'),
                alignCenter: document.queryCommandState('justifyCenter'),
                alignRight: document.queryCommandState('justifyRight'),
                alignJustify: document.queryCommandState('justifyFull'),
                unorderedList: document.queryCommandState('insertUnorderedList'),
                orderedList: document.queryCommandState('insertOrderedList'),
                foreColor: document.queryCommandValue('foreColor') || 'rgb(0, 0, 0)',
                backColor: document.queryCommandValue('backColor') || 'transparent'
            });
        } catch (err) { }

        // Auto link detection when space or enter is pressed
        if (e.key === ' ' || e.key === 'Enter') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;
            if (textNode.nodeType !== 3) return; // Only text nodes

            const text = textNode.nodeValue;
            const words = text.split(/\s+/);
            const lastWord = words[words.length - 2] || words[words.length - 1]; // get the word before the space

            const urlPattern = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
            if (urlPattern.test(lastWord)) {
                const href = lastWord.startsWith('www.') ? `https://${lastWord}` : lastWord;

                const offset = text.lastIndexOf(lastWord);
                const selectRange = document.createRange();
                selectRange.setStart(textNode, offset);
                selectRange.setEnd(textNode, offset + lastWord.length);
                selection.removeAllRanges();
                selection.addRange(selectRange);

                document.execCommand('createLink', false, href);

                selection.collapseToEnd();
                document.execCommand('insertText', false, ' ');
            }
        }
    };

    const handleClearCanvas = () => {
        if (isReadOnlyMode) return;
        cConfirm('Clear Canvas', 'Are you sure you want to clear all contents of the canvas?').then((confirmed) => {
            if (confirmed) {
                setContent('');
                setPages(prevPages => {
                    const updated = [...prevPages];
                    if (updated[currentPageIndex]) {
                        updated[currentPageIndex] = {
                            ...updated[currentPageIndex],
                            content: ''
                        };
                    }
                    const pagesKey = userKey('shelf_notebook_pages');
                    localStorage.setItem(pagesKey, JSON.stringify(updated));
                    return updated;
                });
                const key = userKey('shelf_notebook_scratchpad_html');
                setScratchpadContent(key, '').then(() => {
                    if (inlineRef.current) inlineRef.current.innerHTML = '';
                    if (modalRef.current) modalRef.current.innerHTML = '';
                    window.dispatchEvent(new Event('notebook-updated'));
                });
            }
        });
    };

    const handleResetSettings = () => {
        cConfirm('Reset Settings', 'Reset all document settings to their default values?').then((confirmed) => {
            if (confirmed) {
                setFontFamily("'Caveat', cursive");
                setBaseFontSize(22);
                setLineSpacing(28);
                setLineHeight(1.5);
                setLetterSpacing(0);
                setDocPadding(60);
                setPaperColor('var(--surface-bg)');
                setLineStyle('solid');
                setLineOpacity(35);
                setLineThickness(1.2);
                setDoubleLines(false);
                setMarginStyle('left');
                setMarginOffset(68);
                setMarginColor('#c83f3f');
                setReadOnly(false);
                setSpellcheck(true);
                setAutoCapitalize(true);
                setFocusMode(false);
                setShowWordCount(true);
                setShowCharCount(true);

                // Persist defaults
                uSet('shelf_notebook_font_family', "'Caveat', cursive");
                uSet('shelf_notebook_font_size', 22);
                uSet('shelf_notebook_line_spacing', 28);
                uSet('shelf_notebook_line_height', 1.5);
                uSet('shelf_notebook_letter_spacing', 0);
                uSet('shelf_notebook_doc_padding', 60);
                uSet('shelf_notebook_paper_color', 'var(--surface-bg)');
                uSet('shelf_notebook_line_style', 'solid');
                uSet('shelf_notebook_line_opacity', 35);
                uSet('shelf_notebook_line_thickness', 1.2);
                uSet('shelf_notebook_double_lines', false);
                uSet('shelf_notebook_margin_style', 'left');
                uSet('shelf_notebook_margin_offset', 68);
                uSet('shelf_notebook_margin_color', '#c83f3f');
                uSet('shelf_notebook_readonly', false);
                uSet('shelf_notebook_spellcheck', true);
                uSet('shelf_notebook_autocap', true);
                uSet('shelf_notebook_focusmode', false);
                uSet('shelf_notebook_wordcount', true);
                uSet('shelf_notebook_charcount', true);

                window.dispatchEvent(new Event('notebook-updated'));
            }
        });
    };

    const getStats = (htmlContent) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const text = tempDiv.innerText || tempDiv.textContent || '';
        const charCount = text.length;
        const words = text.trim().split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        return { charCount, wordCount };
    };

    const isColorActive = (activeColor, targetColor) => {
        if (!activeColor) return false;
        const cleanActive = activeColor.toLowerCase().replace(/\s+/g, '');
        const cleanTarget = targetColor.toLowerCase().replace(/\s+/g, '');
        if (cleanActive === cleanTarget) return true;
        if (targetColor === 'var(--text-primary)') {
            return cleanActive === 'var(--text-primary)' ||
                cleanActive === 'rgb(0,0,0)' ||
                cleanActive === 'black' ||
                cleanActive === '#000000' ||
                cleanActive === 'rgb(15,23,42)' ||
                cleanActive === 'rgb(248,250,252)';
        }
        if (targetColor.startsWith('#')) {
            const r = parseInt(targetColor.slice(1, 3), 16);
            const g = parseInt(targetColor.slice(3, 5), 16);
            const b = parseInt(targetColor.slice(5, 7), 16);
            const rgbStr = `rgb(${r},${g},${b})`;
            return cleanActive === rgbStr;
        }
        return false;
    };

    const getPaperBackground = (style, spacingVal, opacityVal, styleVal, colorVal, thicknessVal) => {
        const opacityDecimal = opacityVal / 100;
        const lineColorStr = `rgba(100, 116, 139, ${opacityDecimal})`;
        const thicknessPx = `${thicknessVal}px`;
        const spacingPx = `${spacingVal}px`;

        switch (style) {
            case 'dots':
                return {
                    background: `radial-gradient(${lineColorStr} ${thicknessPx}, transparent ${thicknessPx})`,
                    backgroundSize: `${spacingPx} ${spacingPx}`,
                    backgroundAttachment: 'local',
                    backgroundColor: colorVal
                };
            case 'grid':
                return {
                    background: `
                        linear-gradient(${lineColorStr} ${thicknessPx}, transparent ${thicknessPx}), 
                        linear-gradient(90deg, ${lineColorStr} ${thicknessPx}, transparent ${thicknessPx})
                    `,
                    backgroundSize: `${spacingPx} ${spacingPx}`,
                    backgroundAttachment: 'local',
                    backgroundColor: colorVal
                };
            case 'seyes':
                const rule8 = `${spacingVal / 4}px`;
                const rule16 = `${spacingVal / 2}px`;
                const rule24 = `${(spacingVal * 3) / 4}px`;
                return {
                    background: `
                        linear-gradient(rgba(100, 116, 139, ${opacityDecimal * 0.35}) ${thicknessPx}, transparent ${thicknessPx}),
                        linear-gradient(rgba(100, 116, 139, ${opacityDecimal * 0.35}) ${thicknessPx}, transparent ${thicknessPx}),
                        linear-gradient(rgba(100, 116, 139, ${opacityDecimal * 0.35}) ${thicknessPx}, transparent ${thicknessPx}),
                        linear-gradient(${lineColorStr} ${thicknessVal * 1.5}px, transparent ${thicknessVal * 1.5}px),
                        linear-gradient(90deg, rgba(100, 116, 139, ${opacityDecimal * 0.5}) ${thicknessPx}, transparent ${thicknessPx})
                    `,
                    backgroundSize: `100% ${rule8}, 100% ${rule16}, 100% ${rule24}, 100% ${spacingPx}, ${spacingPx} 100%`,
                    backgroundPosition: `0 ${rule8}, 0 ${rule16}, 0 ${rule24}, 0 0, 0 0`,
                    backgroundAttachment: 'local',
                    backgroundColor: colorVal
                };
            case 'isometric':
                return {
                    background: `
                        linear-gradient(30deg, ${lineColorStr} ${thicknessVal * 0.5}px, transparent ${thicknessVal * 0.5}px),
                        linear-gradient(150deg, ${lineColorStr} ${thicknessVal * 0.5}px, transparent ${thicknessVal * 0.5}px),
                        linear-gradient(90deg, ${lineColorStr} ${thicknessVal * 0.5}px, transparent ${thicknessVal * 0.5}px)
                    `,
                    backgroundSize: `${spacingPx} ${spacingPx}`,
                    backgroundAttachment: 'local',
                    backgroundColor: colorVal
                };
            case 'blank':
                return {
                    background: 'none',
                    backgroundColor: colorVal
                };
            case 'lines':
            default:
                return {
                    background: styleVal === 'dashed'
                        ? `repeating-linear-gradient(90deg, transparent, transparent 4px, ${lineColorStr} 4px, ${lineColorStr} 8px), linear-gradient(${lineColorStr} ${thicknessPx}, transparent ${thicknessPx})`
                        : styleVal === 'dotted'
                            ? `repeating-linear-gradient(90deg, transparent, transparent 2px, ${lineColorStr} 2px, ${lineColorStr} 4px), linear-gradient(${lineColorStr} ${thicknessPx}, transparent ${thicknessPx})`
                            : `linear-gradient(${lineColorStr} ${thicknessPx}, transparent ${thicknessPx})`,
                    backgroundSize: `100% ${spacingPx}`,
                    backgroundAttachment: 'local',
                    backgroundColor: colorVal
                };
        }
    };

    const renderStyleIcon = (style, size = 14) => {
        switch (style) {
            case 'dots':
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12">
                        <circle cx="3" cy="3" r="1.2" fill="currentColor" />
                        <circle cx="9" cy="3" r="1.2" fill="currentColor" />
                        <circle cx="3" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="6" cy="6" r="1.2" fill="currentColor" />
                    </svg>
                );
            case 'grid':
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.2">
                        <rect x="2" y="2" width="8" height="8" fill="none" />
                        <line x1="6" y1="2" x2="6" y2="10" />
                        <line x1="2" y1="6" x2="10" y2="6" />
                    </svg>
                );
            case 'seyes':
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1">
                        <line x1="1" y1="2" x2="11" y2="2" />
                        <line x1="1" y1="4" x2="11" y2="4" strokeDasharray="1,1" />
                        <line x1="1" y1="6" x2="11" y2="6" strokeDasharray="1,1" />
                        <line x1="1" y1="8" x2="11" y2="8" strokeDasharray="1,1" />
                        <line x1="1" y1="10" x2="11" y2="10" strokeWidth="1.5" />
                        <line x1="3" y1="1" x2="3" y2="11" />
                    </svg>
                );
            case 'isometric':
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1">
                        <line x1="1" y1="10" x2="11" y2="2" />
                        <line x1="1" y1="2" x2="11" y2="10" />
                        <line x1="6" y1="1" x2="6" y2="11" />
                    </svg>
                );
            case 'blank':
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12">
                        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                );
            case 'lines':
            default:
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12">
                        <line x1="2" y1="3" x2="10" y2="3" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="2" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                );
        }
    };



    const inlineSpacing = 24;
    const inlineOpacity = 30;
    const inlineLineStyle = 'solid';
    const inlinePaperColor = 'var(--surface-bg)';
    const inlineThickness = 1.2;

    const textPaddingInline = paperStyle === 'lines' ? '32px 12px 12px 48px' : '32px 12px 12px 16px';
    const textPaddingModal = '20px 60px 60px 60px';

    const getBtnStyle = (isActive) => {
        return {
            background: isActive ? 'var(--option-bg)' : 'var(--panel-bg)',
            border: isActive ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
            borderRadius: '6px',
            width: '26px',
            height: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isActive ? 'var(--option-text)' : 'var(--text-primary)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
        };
    };

    // Dashboard UI styles
    const labelStyle = {
        fontSize: '0.68rem',
        fontWeight: '600',
        color: 'var(--text-primary)'
    };

    const selectStyle = {
        padding: '3px 6px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--panel-bg)',
        color: 'var(--text-primary)',
        outline: 'none',
        fontSize: '0.7rem',
        cursor: 'pointer'
    };

    const checkboxLabelStyle = {
        fontSize: '0.72rem',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        userSelect: 'none'
    };

    const checkboxContainerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    };

    const actionBtnStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        width: '100%',
        padding: '4px 8px',
        borderRadius: '6px',
        background: 'var(--option-bg)',
        color: 'var(--option-text)',
        border: '1px solid var(--border-color)',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
    };

    const stats = getStats(content);

    // Popover Dropper Renderer (Down chevron button replacing raw draggable sliders)
    const renderPopoverButton = (id, label, displayValue, min, max, step, value, onChange) => {
        const isOpen = activePopover === id;
        return (
            <div style={{ position: 'relative', display: 'inline-block' }} className="notebook-popover-container">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setActivePopover(isOpen ? null : id);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: isOpen ? 'var(--option-bg)' : 'var(--panel-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease',
                        userSelect: 'none'
                    }}
                >
                    <span>{label}: <strong style={{ color: 'var(--accent-color)' }}>{displayValue}</strong></span>
                    {/* Down chevron SVG matching user drawing */}
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                        <path d="M1 1.5L4 4.5L7 1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {isOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            backgroundColor: 'var(--panel-bg)',
                            border: '1.5px solid var(--border-color)',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                            padding: '12px',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            minWidth: '155px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{label}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{displayValue}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="range" min={min} max={max} step={step} value={value}
                                onChange={onChange}
                                style={{ cursor: 'pointer', width: '100px', margin: '4px 0' }}
                            />
                            <input
                                type="number"
                                min={min}
                                max={max * 5}
                                step={step}
                                value={value}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? min : parseFloat(e.target.value);
                                    onChange({ target: { value: val } });
                                }}
                                style={{
                                    width: '45px',
                                    height: '22px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--surface-bg)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.68rem',
                                    textAlign: 'center',
                                    outline: 'none',
                                    padding: '0 2px'
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const leftPadding = (paperStyle === 'lines' && marginStyle === 'left') ? `${marginOffset + 24}px` : `${docPadding}px`;
    const rightPadding = (paperStyle === 'lines' && marginStyle === 'right') ? `${marginOffset + 24}px` : `${docPadding}px`;

    return (
        <div style={{ display: 'flex', flex: 1, height: '110px', position: 'relative' }}>
            {/* CSS Animation Injector, placeholders, handwriting fonts and formatting typography tags */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@400;700&family=Homemade+Apple&family=Indie+Flower&family=Patrick+Hand&family=Shadows+Into+Light&family=Inter:wght@400;700&display=swap');
                
                /* Grouping & Drag selection styles */
                .lasso-selection-box {
                    position: absolute;
                    border: 1.5px dashed var(--accent-color);
                    background-color: rgba(59, 130, 246, 0.15);
                    z-index: 10000;
                    pointer-events: none;
                }
                .lasso-selected {
                    outline: 2px dashed var(--accent-color) !important;
                    outline-offset: 3px;
                }
                .grouped-container {
                    position: absolute;
                    display: inline-block;
                    border: 2px dashed rgba(100, 116, 139, 0.4);
                    border-radius: 8px;
                    padding: 8px;
                    background-color: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    cursor: grab;
                    user-select: none;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .grouped-container:hover {
                    border-color: var(--accent-color);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
                }
                .grouped-container.locked {
                    border: 1.5px solid var(--border-color);
                    background-color: transparent;
                    backdrop-filter: none;
                    box-shadow: none;
                    cursor: default;
                }
                .grouped-container:active:not(.locked) {
                    cursor: grabbing;
                }
                .group-controls-overlay {
                    position: absolute;
                    top: -28px;
                    left: 4px;
                    display: flex;
                    gap: 4px;
                    background-color: var(--panel-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 2px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
                    z-index: 101;
                    opacity: 0.1;
                    transition: opacity 0.15s ease;
                }
                .grouped-container:hover .group-controls-overlay {
                    opacity: 1;
                }
                .group-control-btn {
                    background: transparent;
                    border: none;
                    border-radius: 3px;
                    padding: 2px 6px;
                    font-size: 0.65rem;
                    cursor: pointer;
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    gap: 3px;
                }
                .group-control-btn:hover {
                    background-color: var(--option-bg);
                }

                /* Cartoon Sticky Note Styles — inline, compact, draggable */
                .sticky-note-container {
                    position: relative;
                    display: inline-block;
                    vertical-align: middle;
                    margin: 3px 6px;
                    padding: 10px 6px 5px 6px;
                    min-width: 50px;
                    max-width: 180px;
                    border-radius: 2px;
                    border: 2px solid #1e293b;
                    background-color: #fef08a;
                    background-image: none !important;
                    box-shadow: 3px 3px 0px #ca8a04;
                    cursor: grab;
                    box-sizing: border-box;
                    user-select: none;
                    font-size: 12px !important;
                    line-height: 1.3 !important;
                    font-family: sans-serif !important;
                }
                .sticky-note-container:active {
                    cursor: grabbing;
                }
                .sticky-note-tape {
                    position: absolute;
                    top: -7px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: inline-block;
                    width: 36px;
                    height: 12px;
                    background-color: #fbcfe8;
                    border: 1.5px solid #1e293b;
                    clip-path: polygon(
                        0% 0%, 8% 33%, 0% 66%, 8% 100%,
                        100% 100%, 92% 66%, 100% 33%, 92% 0%
                    );
                }
                .sticky-delete-btn {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #ef4444;
                    padding: 1px 2px;
                    line-height: 0;
                    border-radius: 2px;
                    opacity: 0;
                    transition: opacity 0.12s ease;
                    font-size: 0 !important;
                }
                .sticky-note-container:hover .sticky-delete-btn {
                    opacity: 1;
                }
                .sticky-delete-btn:hover {
                    background-color: rgba(239,68,68,0.12);
                }
                .sticky-note-body {
                    display: block;
                    background: transparent !important;
                    background-image: none !important;
                    border: none;
                    outline: none;
                    font-size: 15px !important;
                    line-height: 1.4 !important;
                    font-family: 'Caveat', cursive !important;
                    min-height: 14px;
                    word-break: break-word;
                    white-space: pre-wrap;
                    user-select: text;
                    cursor: text;
                    color: #1e293b;
                    padding: 0;
                    margin: 0;
                }
                
                /* Sticky note body placeholder */
                .sticky-note-body:empty::before {
                    content: 'Write note...';
                    color: rgba(0,0,0,0.3);
                    pointer-events: none;
                    font-family: 'Caveat', cursive !important;
                    font-style: italic;
                }
                .sticky-note-body:focus::before {
                    display: none;
                }
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(20px);
                        border-radius: 500px;
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                        border-radius: 0;
                    }
                }
                ::highlight(search-results) {
                    background-color: #fef08a;
                    color: #1e293b;
                }
                ::highlight(active-search-result) {
                    background-color: #f97316;
                    color: #ffffff;
                }
                .scratchpad-editor:empty:before {
                    content: attr(placeholder);
                    color: var(--text-secondary);
                    opacity: 0.65;
                    font-style: italic;
                }
                /* Hardware-accelerated dynamic sheet backgrounds using CSS variables */
                .scratchpad-editor.dots {
                    background-image: radial-gradient(rgba(100, 116, 139, var(--notebook-opacity, 0.35)) var(--notebook-thickness, 1.2px), transparent var(--notebook-thickness, 1.2px)) !important;
                    background-size: var(--notebook-spacing, 24px) var(--notebook-spacing, 24px) !important;
                    background-attachment: local !important;
                }
                .scratchpad-editor.grid {
                    background-image: 
                        linear-gradient(rgba(100, 116, 139, var(--notebook-opacity, 0.35)) var(--notebook-thickness, 1.2px), transparent var(--notebook-thickness, 1.2px)),
                        linear-gradient(90deg, rgba(100, 116, 139, var(--notebook-opacity, 0.35)) var(--notebook-thickness, 1.2px), transparent var(--notebook-thickness, 1.2px)) !important;
                    background-size: var(--notebook-spacing, 24px) var(--notebook-spacing, 24px) !important;
                    background-attachment: local !important;
                }
                .scratchpad-editor.lines {
                    background-image: linear-gradient(rgba(100, 116, 139, var(--notebook-opacity, 0.35)) var(--notebook-thickness, 1.2px), transparent var(--notebook-thickness, 1.2px)) !important;
                    background-size: 100% var(--notebook-spacing, 24px) !important;
                    background-attachment: local !important;
                }
                .scratchpad-editor.seyes {
                    background-image: 
                        linear-gradient(rgba(100, 116, 139, calc(var(--notebook-opacity, 0.35) * 0.35)) var(--notebook-thickness, 1px), transparent var(--notebook-thickness, 1px)),
                        linear-gradient(rgba(100, 116, 139, calc(var(--notebook-opacity, 0.35) * 0.35)) var(--notebook-thickness, 1px), transparent var(--notebook-thickness, 1px)),
                        linear-gradient(rgba(100, 116, 139, calc(var(--notebook-opacity, 0.35) * 0.35)) var(--notebook-thickness, 1px), transparent var(--notebook-thickness, 1px)),
                        linear-gradient(rgba(100, 116, 139, var(--notebook-opacity, 0.35)) calc(var(--notebook-thickness, 1px) * 1.5), transparent calc(var(--notebook-thickness, 1px) * 1.5)),
                        linear-gradient(90deg, rgba(100, 116, 139, calc(var(--notebook-opacity, 0.35) * 0.6)) var(--notebook-thickness, 1px), transparent var(--notebook-thickness, 1px)) !important;
                    background-size: 100% calc(var(--notebook-spacing, 24px) / 4), 100% calc(var(--notebook-spacing, 24px) / 2), 100% calc(var(--notebook-spacing, 24px) * 3 / 4), 100% var(--notebook-spacing, 24px), var(--notebook-spacing, 24px) 100% !important;
                    background-position: 0 calc(var(--notebook-spacing, 24px) / 4), 0 calc(var(--notebook-spacing, 24px) / 2), 0 calc(var(--notebook-spacing, 24px) * 3 / 4), 0 0, 0 0 !important;
                    background-attachment: local !important;
                }
                .scratchpad-editor.isometric {
                    background-image: 
                        linear-gradient(30deg, rgba(100, 116, 139, var(--notebook-opacity, 0.35)) var(--notebook-thickness, 1px), transparent var(--notebook-thickness, 1px)),
                        linear-gradient(150deg, rgba(100, 116, 139, var(--notebook-opacity, 0.35)) var(--notebook-thickness, 1px), transparent var(--notebook-thickness, 1px)),
                        linear-gradient(90deg, rgba(100, 116, 139, var(--notebook-opacity, 0.35)) var(--notebook-thickness, 1px), transparent var(--notebook-thickness, 1px)) !important;
                    background-size: var(--notebook-spacing, 24px) var(--notebook-spacing, 24px) !important;
                    background-attachment: local !important;
                }
                .scratchpad-editor.blank {
                    background-image: none !important;
                }
                .scratchpad-editor [data-placeholder]:empty:before {
                    content: attr(data-placeholder);
                    color: var(--text-secondary, #94a3b8);
                    opacity: 0.75;
                    pointer-events: none;
                    display: inline-block;
                }
                .scratchpad-editor h1 {
                    font-family: var(--serif);
                    font-weight: 800;
                    font-size: 2.2rem;
                    margin: 16px 0 8px 0;
                    color: var(--ink);
                    line-height: 1.2;
                }
                .scratchpad-editor h2 {
                    font-family: var(--serif);
                    font-weight: 700;
                    font-size: 1.7rem;
                    margin: 14px 0 6px 0;
                    color: var(--ink);
                    line-height: 1.3;
                }
                .scratchpad-editor ul, .scratchpad-editor ol {
                    margin: 8px 0;
                    padding-left: 24px;
                }
                .scratchpad-editor li {
                    margin: 4px 0;
                }
                .scratchpad-editor a {
                    color: var(--accent-color);
                    text-decoration: underline;
                    cursor: pointer;
                }
                .scratchpad-editor img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                    margin: 8px 12px;
                    padding: 6px;
                    display: inline-block;
                    vertical-align: middle;
                    cursor: pointer;
                    transition: outline 0.15s ease, box-shadow 0.15s ease;
                }
                .scratchpad-editor img.selected-for-resize {
                    outline: 2px solid #000000 !important;
                    outline-offset: 2px;
                    box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0,0,0,0.12) !important;
                }
                .scratchpad-editor pre {
                    background-color: var(--option-bg) !important;
                    border: 1.5px solid var(--border-color) !important;
                    padding: 10px 14px;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 0.9rem;
                    margin: 12px 0;
                    overflow-x: auto;
                    position: relative;
                    z-index: 2;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .scratchpad-editor blockquote {
                    background-color: var(--option-bg) !important;
                    border-left: 4px solid var(--accent-color) !important;
                    padding: 8px 14px;
                    margin: 12px 0;
                    font-style: italic;
                    color: var(--text-secondary);
                    position: relative;
                    z-index: 2;
                }
                @media print {
                    @page {
                        margin: 0;
                    }
                    /* Ensure all parents allow rendering and do not overflow clip */
                    body, html, #root, .app-container, [class*="Timer"], [style*="height"] {
                        overflow: visible !important;
                        height: auto !important;
                        background: none !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    /* Set all layout nodes to hidden by default */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Override visibility for the target paper container and all children */
                    .scratchpad-container-hoverable,
                    .scratchpad-container-hoverable *,
                    div[style*="z-index: 2000"],
                    div[style*="z-index: 2000"] * {
                        visibility: visible !important;
                    }
                    /* Hide settings controls and footer status panels completely */
                    .scratchpad-print-hide,
                    .scratchpad-print-hide *,
                    button,
                    select,
                    input,
                    label,
                    svg,
                    .image-resizer-floating-bar,
                    .notebook-popover-container,
                    .scratchpad-floating-actions {
                        display: none !important;
                        height: 0 !important;
                        width: 0 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                    }
                    /* Force container overlay to fill the print view context */
                    .scratchpad-container-hoverable,
                    div[style*="z-index: 2000"] {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background-color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        z-index: 9999960 !important;
                        overflow: visible !important;
                    }
                    .scratchpad-editor {
                        padding: 40px !important;
                        overflow: visible !important;
                        height: auto !important;
                        background-color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Print high contrast notebook lines clearly using CSS variables */
                    .scratchpad-editor.lines {
                        background-image: linear-gradient(rgba(100, 116, 139, var(--print-opacity, 0.45)) var(--print-thickness, 1.2px), transparent var(--print-thickness, 1.2px)) !important;
                        background-size: 100% var(--print-spacing, 36px) !important;
                    }
                    .scratchpad-editor.dots {
                        background-image: radial-gradient(rgba(100, 116, 139, var(--print-opacity, 0.55)) var(--print-thickness, 1.2px), transparent var(--print-thickness, 1.2px)) !important;
                        background-size: var(--print-spacing, 36px) var(--print-spacing, 36px) !important;
                    }
                    .scratchpad-editor.grid {
                        background-image: 
                            linear-gradient(rgba(100, 116, 139, var(--print-opacity, 0.45)) var(--print-thickness, 1.2px), transparent var(--print-thickness, 1.2px)),
                            linear-gradient(90deg, rgba(100, 116, 139, var(--print-opacity, 0.45)) var(--print-thickness, 1.2px), transparent var(--print-thickness, 1.2px)) !important;
                        background-size: var(--print-spacing, 36px) var(--print-spacing, 36px) !important;
                    }
                    .scratchpad-editor.seyes {
                        background-image: 
                            linear-gradient(rgba(100, 116, 139, calc(var(--print-opacity, 0.45) * 0.45)) var(--print-thickness, 1px), transparent var(--print-thickness, 1px)),
                            linear-gradient(rgba(100, 116, 139, calc(var(--print-opacity, 0.45) * 0.45)) var(--print-thickness, 1px), transparent var(--print-thickness, 1px)),
                            linear-gradient(rgba(100, 116, 139, calc(var(--print-opacity, 0.45) * 0.45)) var(--print-thickness, 1px), transparent var(--print-thickness, 1px)),
                            linear-gradient(rgba(100, 116, 139, var(--print-opacity, 0.45)) calc(var(--print-thickness, 1px) * 1.5), transparent calc(var(--print-thickness, 1px) * 1.5)),
                            linear-gradient(90deg, rgba(100, 116, 139, calc(var(--print-opacity, 0.45) * 0.6)) var(--print-thickness, 1px), transparent var(--print-thickness, 1px)) !important;
                        background-size: 100% calc(var(--print-spacing, 36px) / 4), 100% calc(var(--print-spacing, 36px) / 2), 100% calc(var(--print-spacing, 36px) * 3 / 4), 100% var(--print-spacing, 36px), var(--print-spacing, 36px) 100% !important;
                    }
                    .scratchpad-editor.isometric {
                        background-image: 
                            linear-gradient(30deg, rgba(100, 116, 139, var(--print-opacity, 0.45)) var(--print-thickness, 1px), transparent var(--print-thickness, 1px)),
                            linear-gradient(150deg, rgba(100, 116, 139, var(--print-opacity, 0.45)) var(--print-thickness, 1px), transparent var(--print-thickness, 1px)),
                            linear-gradient(90deg, rgba(100, 116, 139, var(--print-opacity, 0.45)) var(--print-thickness, 1px), transparent var(--print-thickness, 1px)) !important;
                        background-size: var(--print-spacing, 36px) var(--print-spacing, 36px) !important;
                    }
                    .scratchpad-editor.blank {
                        background-image: none !important;
                    }
                }
            `}</style>

            {/* Lined Notebook Paper Window */}
            <div
                className="scratchpad-container-hoverable"
                style={{
                    position: 'relative',
                    flex: 1,
                    height: '100%',
                    borderRadius: '16px',
                    border: '1.5px solid var(--border-color)',
                    boxShadow: 'inset 0 1.5px 4px rgba(0,0,0,0.05), 0 2px 10px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                    display: 'flex',
                    backgroundColor: 'var(--surface-bg)',
                }}
            >
                {/* Red Margin Line */}
                {paperStyle === 'lines' && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '40px',
                        width: '1px',
                        backgroundColor: 'rgba(239, 68, 68, 0.4)',
                        zIndex: 2,
                        pointerEvents: 'none'
                    }} />
                )}

                {/* Page Navigation & Management */}

                {/* Paper Style Selector Circles */}
                <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '8px',
                    display: 'flex',
                    gap: '4px',
                    zIndex: 5,
                    padding: '2px 4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: '20px',
                    border: '1.5px solid var(--border-color)'
                }}>
                    {['lines', 'dots', 'grid', 'blank'].map((style) => (
                        <button
                            key={style}
                            onClick={() => handleChangeStyle(style)}
                            style={{
                                background: paperStyle === style ? 'var(--option-bg)' : 'transparent',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: paperStyle === style ? 'var(--option-text)' : 'var(--text-secondary)',
                                transition: 'all 0.15s ease'
                            }}
                            title={style.charAt(0).toUpperCase() + style.slice(1)}
                        >
                            {renderStyleIcon(style, 10)}
                        </button>
                    ))}
                </div>

                {/* Scroll-attached contentEditable Div */}
                <div
                    ref={setInlineRef}
                    contentEditable={!isReadOnlyMode}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onClick={handleEditorClick}
                    placeholder="Jot down quick study notes, links, or clips..."
                    className={`scratchpad-editor ${paperStyle}`}
                    spellCheck={spellcheck}
                    autoCapitalize={autoCapitalize ? 'sentences' : 'none'}
                    key={`${spellcheck}-${autoCapitalize}`}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        cursor: isLassoMode ? 'crosshair' : 'text',
                        fontFamily: fontFamily,
                        fontSize: '1.25rem',
                        lineHeight: '24px',
                        color: 'var(--text-primary)',
                        margin: 0,
                        boxSizing: 'border-box',
                        padding: textPaddingInline,
                        backgroundColor: paperColor.startsWith('var') ? 'var(--surface-bg)' : paperColor,
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        zIndex: 1,
                        '--notebook-spacing': `${lineSpacing}px`,
                        '--notebook-thickness': `${lineThickness}px`,
                        '--notebook-opacity': `${lineOpacity / 100}`,
                        '--print-spacing': `${lineSpacing}px`,
                        '--print-thickness': `${lineThickness}px`,
                        '--print-opacity': `${lineOpacity / 100}`
                    }}
                />

                {/* Floating Action Buttons */}
                <div
                    className="scratchpad-floating-actions"
                    style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        display: 'flex',
                        gap: '6px',
                        zIndex: 5,
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '20px',
                        padding: '2px',
                        border: '1px solid var(--border-color)',
                        transition: 'opacity 0.2s ease, background-color 0.2s ease',
                    }}
                >
                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        style={{
                            background: copied ? 'var(--success-color)' : 'transparent',
                            border: 'none',
                            borderRadius: '50%',
                            width: '26px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: copied ? '#FFFFFF' : 'var(--text-secondary)',
                            transition: 'all 0.2s ease',
                        }}
                        title={copied ? "Copied!" : "Copy Content"}
                    >
                        {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                    </button>

                    {/* Expand Button */}
                    <button
                        onClick={() => setIsExpanded(true)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '50%',
                            width: '26px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s ease'
                        }}
                        title="Expand Notebook"
                    >
                        <Maximize2 size={12} />
                    </button>
                </div>
            </div>

            {/* Immersive Full-Screen Notebook Overlay */}
            {isExpanded && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: paperColor.startsWith('var') ? 'var(--surface-bg)' : paperColor,
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 2000,
                        width: '100vw',
                        height: '100vh',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        animation: 'notebookFullScreenOpen 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    {/* Red Margin Line */}
                    {paperStyle === 'lines' && marginStyle !== 'none' && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: marginStyle === 'left' ? `${marginOffset}px` : 'auto',
                            right: marginStyle === 'right' ? `${marginOffset}px` : 'auto',
                            width: doubleLines ? '4px' : '1.5px',
                            borderLeft: doubleLines ? `1px solid ${marginColor}` : 'none',
                            borderRight: `1px solid ${marginColor}`,
                            opacity: 0.65,
                            pointerEvents: 'none',
                            zIndex: 2
                        }} />
                    )}

                    {/* Compact, Non-shifting, Spacious Dashboard Header Console */}
                    <div className="scratchpad-print-hide" style={{
                        display: focusMode ? 'none' : 'flex',
                        flexDirection: 'column',
                        zIndex: 5,
                        borderBottom: '1.5px solid var(--border-color)',
                        backgroundColor: 'var(--panel-bg)',
                        padding: '8px 40px',
                        gap: '8px'
                    }}
                    >
                        {/* ROW 1: Branding, Text Size, Line Height, Letter spacing, Sheet colors with Custom Sheet Picker */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => { setFocusMode(true); uSet('shelf_notebook_focusmode', true); }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-secondary)',
                                        padding: '4px',
                                        borderRadius: '4px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    title="Hide Settings Toolbar (Focus Mode)"
                                >
                                    <EyeOff size={15} />
                                </button>
                                <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '1.25rem', color: 'var(--ink)' }}>
                                    Interactive Scratchpad
                                </h3>


                            </div>

                            {/* Header Utilities Actions */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleCopy}
                                        style={{
                                            background: copied ? 'var(--success-color)' : 'var(--panel-bg)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            padding: '5px 12px',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            cursor: 'pointer',
                                            color: copied ? '#FFFFFF' : 'var(--text-primary)',
                                            transition: 'all 0.2s ease',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                        }}
                                    >
                                        {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                                        {copied ? 'Copied!' : 'Copy All'}
                                    </button>
                                    {/* Pages Manager Popover Trigger */}
                                    <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => setActivePopover(activePopover === 'pages' ? null : 'pages')}
                                            style={{
                                                ...actionBtnStyle,
                                                width: 'auto',
                                                padding: '4px 10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                backgroundColor: activePopover === 'pages' ? 'var(--option-bg)' : 'var(--panel-bg)'
                                            }}
                                        >
                                            <BookOpen size={11} /> Pages ({pages.length})
                                        </button>

                                        {activePopover === 'pages' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 4px)',
                                                left: 0,
                                                backgroundColor: 'var(--panel-bg)',
                                                border: '1.5px solid var(--border-color)',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                                                zIndex: 100,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                minWidth: '220px',
                                                maxWidth: '280px',
                                                maxHeight: '200px',
                                                overflowY: 'auto'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Manage Pages</span>
                                                    {!isViewerMode && (
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button
                                                                onClick={handleAddPage}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    color: 'var(--text-secondary)'
                                                                }}
                                                                title="Add Note"
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRenamePageAtIndex(currentPageIndex)}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    color: 'var(--text-secondary)'
                                                                }}
                                                                title="Rename Selected Note"
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setBulkDeleteMode(prev => {
                                                                        const next = !prev;
                                                                        if (!next) setCheckedPageIds([]);
                                                                        return next;
                                                                    });
                                                                }}
                                                                style={{
                                                                    background: bulkDeleteMode ? 'var(--option-bg)' : 'transparent',
                                                                    border: bulkDeleteMode ? '1px solid var(--accent-color)' : 'none',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    color: 'var(--text-secondary)',
                                                                    padding: '2px'
                                                                }}
                                                                title="Select Multiple Pages"
                                                            >
                                                                <CheckSquare size={12} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    if (bulkDeleteMode) {
                                                                        handleDeleteSelectedPages();
                                                                    } else {
                                                                        handleDeletePageAtIndex(currentPageIndex, e);
                                                                    }
                                                                }}
                                                                disabled={!bulkDeleteMode && pages.length <= 1}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    cursor: (!bulkDeleteMode && pages.length <= 1) ? 'not-allowed' : 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    color: 'var(--danger-color)',
                                                                    opacity: (!bulkDeleteMode && pages.length <= 1) ? 0.4 : 1
                                                                }}
                                                                title={bulkDeleteMode ? `Delete Checked Notes (${checkedPageIds.length})` : "Delete Selected Note"}
                                                            >
                                                                <Trash2 size={12} /> {bulkDeleteMode && `(${checkedPageIds.length})`}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {pages.map((page, idx) => {
                                                        const isActive = currentPageIndex === idx;
                                                        const isChecked = checkedPageIds.includes(page.id);
                                                        return (
                                                            <div
                                                                key={page.id || idx}
                                                                onClick={() => {
                                                                    if (bulkDeleteMode) {
                                                                        togglePageChecked(page.id);
                                                                    } else {
                                                                        setCurrentPageIndex(idx);
                                                                        setContent(page.content || '');
                                                                    }
                                                                }}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    padding: '6px 8px',
                                                                    paddingLeft: isActive ? '6px' : '8px',
                                                                    borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: isChecked ? 'rgba(239, 68, 68, 0.08)' : (isActive ? 'var(--option-bg)' : 'transparent'),
                                                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: isActive ? '600' : '400'
                                                                }}
                                                                onMouseEnter={(e) => { if (!isActive && !isChecked) e.currentTarget.style.backgroundColor = 'var(--border-color)'; }}
                                                                onMouseLeave={(e) => { if (!isActive && !isChecked) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                            >
                                                                {bulkDeleteMode && (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            togglePageChecked(page.id);
                                                                        }}
                                                                        style={{ marginRight: '6px', cursor: 'pointer' }}
                                                                    />
                                                                )}
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                                    {idx + 1}. {page.title || 'new note'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => setActivePopover(activePopover === 'export' ? null : 'export')}
                                            style={{ ...actionBtnStyle, width: 'auto', padding: '4px 10px' }}
                                        >
                                            <Download size={11} /> Export Notes
                                        </button>
                                        {activePopover === 'export' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 4px)',
                                                right: 0,
                                                backgroundColor: 'var(--panel-bg)',
                                                border: '1.5px solid var(--border-color)',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                                                zIndex: 100,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                minWidth: '170px'
                                            }}>
                                                <button
                                                    onClick={() => { setActivePopover(null); handleDownload(); }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '0.72rem',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        width: '100%'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-bg)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Export Plain Text (.txt)
                                                </button>
                                                <button
                                                    onClick={() => { setActivePopover(null); handleExportMarkdown(); }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '0.72rem',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        width: '100%'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-bg)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Export Markdown (.md)
                                                </button>
                                                <button
                                                    onClick={() => { setActivePopover(null); handleExportHTML(); }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '0.72rem',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        width: '100%'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-bg)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Export HTML Page (.html)
                                                </button>
                                                <button
                                                    onClick={() => { setActivePopover(null); handleShareScrapbook(); }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '0.72rem',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        width: '100%'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-bg)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Share Interactive Scrapbook Link
                                                </button>
                                                <button
                                                    onClick={() => { setActivePopover(null); window.print(); }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 8px',
                                                        fontSize: '0.72rem',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        width: '100%'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-bg)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Print / Save to PDF
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleClearCanvas}
                                        style={{ ...actionBtnStyle, width: 'auto', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.18)' }}
                                    >
                                        <Trash2 size={11} /> Clear Canvas
                                    </button>
                                </div>
                                <button
                                    onClick={handleResetSettings}
                                    style={{
                                        background: 'var(--panel-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        padding: '5px 10px',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                        color: 'var(--text-primary)',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Reset All Configurations to Default"
                                >
                                    <RotateCcw size={12} /> Reset
                                </button>

                                <button
                                    onClick={() => setShowMoreSettings(!showMoreSettings)}
                                    style={{
                                        background: showMoreSettings ? 'var(--option-bg)' : 'var(--panel-bg)',
                                        border: showMoreSettings ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        padding: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: showMoreSettings ? 'var(--accent-color)' : 'var(--text-primary)',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Toggle Page Layout & Margin Settings"
                                >
                                    <Sliders size={14} />
                                </button>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    style={{
                                        background: 'var(--panel-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        padding: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>




                        {/* ROW 3: Rich-Text Typography & Inserts controls */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', flexWrap: 'wrap' }}>
                            {/* History Actions */}
                            <div style={{ display: 'flex', gap: '3px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('undo'); }}
                                    style={getBtnStyle(false)} title="Undo"
                                >
                                    <Undo size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('redo'); }}
                                    style={getBtnStyle(false)} title="Redo"
                                >
                                    <Redo size={12} />
                                </button>
                            </div>

                            {/* Headings & Clean styling */}
                            <div style={{ display: 'flex', gap: '3px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('formatBlock', '<h1>'); }}
                                    style={getBtnStyle(false)} title="Heading 1"
                                >
                                    <Heading1 size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('formatBlock', '<h2>'); }}
                                    style={getBtnStyle(false)} title="Heading 2"
                                >
                                    <Heading2 size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('removeFormat'); }}
                                    style={getBtnStyle(false)} title="Clear Formatting"
                                >
                                    <Eraser size={12} />
                                </button>
                            </div>

                            {/* Advanced Typography Characters */}
                            <div style={{ display: 'flex', gap: '3px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
                                    style={getBtnStyle(activeStyles.bold)} title="Bold"
                                >
                                    <Bold size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
                                    style={getBtnStyle(activeStyles.italic)} title="Italic"
                                >
                                    <Italic size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}
                                    style={getBtnStyle(activeStyles.underline)} title="Underline"
                                >
                                    <Underline size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('strikeThrough'); }}
                                    style={getBtnStyle(activeStyles.strikethrough)} title="Strikethrough"
                                >
                                    <Strikethrough size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('subscript'); }}
                                    style={getBtnStyle(activeStyles.subscript)} title="Subscript"
                                >
                                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>X₂</span>
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('superscript'); }}
                                    style={getBtnStyle(activeStyles.superscript)} title="Superscript"
                                >
                                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>X²</span>
                                </button>
                            </div>

                            {/* Text Case tools */}
                            <div style={{ display: 'flex', gap: '3px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); changeCase('upper'); }}
                                    style={getBtnStyle(false)} title="Uppercase"
                                >
                                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>AA</span>
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); changeCase('lower'); }}
                                    style={getBtnStyle(false)} title="Lowercase"
                                >
                                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>aa</span>
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); changeCase('title'); }}
                                    style={getBtnStyle(false)} title="Title Case"
                                >
                                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>Aa</span>
                                </button>
                            </div>

                            {/* Alignments */}
                            <div style={{ display: 'flex', gap: '3px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyLeft'); }}
                                    style={getBtnStyle(activeStyles.alignLeft)} title="Align Left"
                                >
                                    <AlignLeft size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyCenter'); }}
                                    style={getBtnStyle(activeStyles.alignCenter)} title="Align Center"
                                >
                                    <AlignCenter size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyRight'); }}
                                    style={getBtnStyle(activeStyles.alignRight)} title="Align Right"
                                >
                                    <AlignRight size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyFull'); }}
                                    style={getBtnStyle(activeStyles.alignJustify)} title="Justify"
                                >
                                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>≡</span>
                                </button>
                            </div>

                            {/* Lists & Indents */}
                            <div style={{ display: 'flex', gap: '3px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('insertUnorderedList'); }}
                                    style={getBtnStyle(activeStyles.unorderedList)} title="Bullet List"
                                >
                                    <List size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('insertOrderedList'); }}
                                    style={getBtnStyle(activeStyles.orderedList)} title="Numbered List"
                                >
                                    <ListOrdered size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('indent'); }}
                                    style={getBtnStyle(false)} title="Indent Spacing"
                                >
                                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>→|</span>
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); applyFormat('outdent'); }}
                                    style={getBtnStyle(false)} title="Outdent Spacing"
                                >
                                    <span style={{ fontSize: '8px', fontWeight: 'bold' }}>|←</span>
                                </button>
                            </div>

                            {/* Inserts panel */}
                            <div style={{ display: 'flex', gap: '3px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleLink(); }}
                                    style={getBtnStyle(false)} title="Insert Hyperlink"
                                >
                                    <Link size={12} />
                                </button>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setActivePopover(activePopover === 'image' ? null : 'image');
                                        }}
                                        style={getBtnStyle(activePopover === 'image')}
                                        title="Insert Image"
                                    >
                                        <LucideImage size={12} />
                                    </button>
                                    {activePopover === 'image' && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 4px)',
                                                left: 0,
                                                backgroundColor: 'var(--panel-bg)',
                                                border: '1.5px solid var(--border-color)',
                                                borderRadius: '8px',
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                                padding: '8px',
                                                zIndex: 100,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                minWidth: '160px'
                                            }}
                                        >
                                            <button
                                                onClick={() => {
                                                    setActivePopover(null);
                                                    triggerLocalImageUpload();
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '6px 8px',
                                                    fontSize: '0.72rem',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    width: '100%'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-bg)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Upload size={12} /> Upload from computer
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setActivePopover(null);
                                                    triggerImageUrlPrompt();
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '6px 8px',
                                                    fontSize: '0.72rem',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    width: '100%'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-bg)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Link size={12} /> Insert from URL
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); insertCheckbox(); }}
                                    style={getBtnStyle(false)} title="Insert Checklist Box"
                                >
                                    <CheckSquare size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); insertCodeBlock(); }}
                                    style={getBtnStyle(false)} title="Code Block"
                                >
                                    <Code size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); insertQuote(); }}
                                    style={getBtnStyle(false)} title="Blockquote"
                                >
                                    <Quote size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); insertTable(); }}
                                    style={getBtnStyle(false)} title="Insert Grid Table"
                                >
                                    <Table size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); insertTimestamp(); }}
                                    style={getBtnStyle(false)} title="Stamp Date/Time"
                                >
                                    <Calendar size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); setIsLassoMode(!isLassoMode); }}
                                    style={getBtnStyle(isLassoMode)} title="Lasso / Drag Selection Mode"
                                >
                                    <MousePointer size={12} />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); insertStickyNote(); }}
                                    style={getBtnStyle(false)} title="Insert Sticky Note"
                                >
                                    <StickyNote size={12} />
                                </button>
                            </div>

                            {/* Color Palettes (Pen, Highlight) */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pen</span>
                                    {/* Multicolor rainbow toggle */}
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); setIsMultiColor(prev => !prev); multiColorIndexRef.current = 0; }}
                                        style={{
                                            width: '14px',
                                            height: '14px',
                                            borderRadius: '50%',
                                            background: 'conic-gradient(#e03c3c, #e07c3c, #d4b800, #2a9e4e, #2b5cc8, #7b2fb5, #e03c3c)',
                                            border: isMultiColor ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                            cursor: 'pointer',
                                            boxShadow: isMultiColor ? '0 0 5px var(--accent-color)' : '0 1px 2px rgba(0,0,0,0.08)',
                                            transform: isMultiColor ? 'scale(1.2)' : 'scale(1)',
                                            transition: 'all 0.15s ease',
                                            flexShrink: 0
                                        }}
                                        title={isMultiColor ? 'Multicolor ON — click to disable' : 'Enable Multicolor (rainbow) mode'}
                                    />
                                    {[
                                        { name: 'Dark', value: '#000000', display: 'var(--text-primary)' },
                                        { name: 'Rust', value: '#c83f3f', display: '#c83f3f' },
                                        { name: 'Forest', value: '#2a6f40', display: '#2a6f40' },
                                        { name: 'Blue', value: '#2b5c8f', display: '#2b5c8f' },
                                        { name: 'Ochre', value: '#b8860b', display: '#b8860b' },
                                        { name: 'Plum', value: '#7b1fa2', display: '#7b1fa2' }
                                    ].map(color => {
                                        const isActive = isColorActive(activePenColor, color.value);
                                        return (
                                            <button
                                                key={color.name}
                                                onMouseDown={(e) => { e.preventDefault(); setActivePenColor(color.value); applyFormat('foreColor', color.value); }}
                                                style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    backgroundColor: color.display || color.value,
                                                    border: isActive ? '1.8px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                    cursor: 'pointer',
                                                    boxShadow: isActive ? '0 0 3px var(--accent-color)' : '0 1px 2px rgba(0,0,0,0.08)',
                                                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                                                    transition: 'all 0.1s ease'
                                                }}
                                                title={`Pen Color: ${color.name}`}
                                            />
                                        );
                                    })}

                                    {/* Custom Pen Color Picker Popover */}
                                    <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); const next = activeColorPicker === 'pen' ? null : 'pen'; setActiveColorPicker(next); if (next === 'pen') setPenHexInput(rgbToHex(activeStyles.foreColor)); }}
                                            style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                background: 'conic-gradient(red, yellow, green, cyan, blue, magenta, red)',
                                                border: activePenColor && !['#000000', 'rgb(0,0,0)', '#c83f3f', '#2a6f40', '#2b5c8f', '#b8860b', '#7b1fa2'].some(val => isColorActive(activePenColor, val)) ? '1.8px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                textShadow: '0px 0px 1px #000'
                                            }}
                                            title="Custom Pen Color"
                                        >
                                            <Palette size={9} style={{ filter: 'drop-shadow(0px 0px 1px rgba(0,0,0,0.5))' }} />
                                        </button>
                                        {activeColorPicker === 'pen' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 8px)',
                                                left: '-10px',
                                                backgroundColor: 'var(--panel-bg)',
                                                border: '1.5px solid var(--border-color)',
                                                borderRadius: '12px',
                                                padding: '10px',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                                                zIndex: 100,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                minWidth: '200px',
                                                animation: 'notebookFullScreenOpen 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                            }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Palette size={10} /> Custom Pen Color
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
                                                        <input
                                                            type="color"
                                                            value={penHexInput}
                                                            onChange={(e) => { setPenHexInput(e.target.value); }}
                                                            onBlur={(e) => { let v = e.target.value; if (v.length === 7 && v.startsWith('#')) { setActivePenColor(v); applyFormat('foreColor', v); } }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '-4px',
                                                                left: '-4px',
                                                                width: '36px',
                                                                height: '36px',
                                                                padding: 0,
                                                                margin: 0,
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                background: 'none'
                                                            }}
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={penHexInput}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (val.length > 0 && !val.startsWith('#')) val = '#' + val;
                                                            setPenHexInput(val);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                let val = penHexInput;
                                                                if (val.length === 7 && val.startsWith('#')) { setActivePenColor(val); applyFormat('foreColor', val); }
                                                                setActiveColorPicker(null);
                                                            }
                                                        }}
                                                        placeholder="#Hex Code"
                                                        style={{
                                                            flex: 1,
                                                            height: '28px',
                                                            padding: '2px 8px',
                                                            border: '1.5px solid var(--border-color)',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'var(--surface-bg)',
                                                            color: 'var(--text-primary)',
                                                            outline: 'none',
                                                            fontFamily: 'monospace'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => { let val = penHexInput; if (val.length === 7 && val.startsWith('#')) { setActivePenColor(val); applyFormat('foreColor', val); } setActiveColorPicker(null); }}
                                                        style={{
                                                            height: '28px',
                                                            padding: '0 10px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 'bold',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            background: 'var(--accent-color)',
                                                            color: '#fff',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'filter 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Highlight</span>
                                    {[
                                        { name: 'None', value: 'transparent' },
                                        { name: 'Yellow', value: '#fef08a' },
                                        { name: 'Green', value: '#bbf7d0' },
                                        { name: 'Blue', value: '#bfdbfe' },
                                        { name: 'Pink', value: '#fbcfe8' },
                                        { name: 'Orange', value: '#fed7aa' }
                                    ].map(color => {
                                        const isActive = isColorActive(activeStyles.backColor, color.value);
                                        return (
                                            <button
                                                key={color.name}
                                                onMouseDown={(e) => { e.preventDefault(); applyFormat('backColor', color.value); }}
                                                style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    backgroundColor: color.value === 'transparent' ? 'transparent' : color.value,
                                                    border: isActive ? '1.8px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                    cursor: 'pointer',
                                                    boxShadow: isActive ? '0 0 3px var(--accent-color)' : '0 1px 2px rgba(0,0,0,0.08)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                                                    transition: 'all 0.1s ease'
                                                }}
                                                title={`Highlight: ${color.name}`}
                                            >
                                                {color.value === 'transparent' && <span style={{ fontSize: '7px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>X</span>}
                                            </button>
                                        );
                                    })}

                                    {/* Custom Highlight Color Picker Popover */}
                                    <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); const next = activeColorPicker === 'highlight' ? null : 'highlight'; setActiveColorPicker(next); if (next === 'highlight') setHighlightHexInput(rgbToHex(activeStyles.backColor)); }}
                                            style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                background: 'conic-gradient(red, yellow, green, cyan, blue, magenta, red)',
                                                border: activeStyles.backColor && activeStyles.backColor !== 'rgba(0, 0, 0, 0)' && activeStyles.backColor !== 'transparent' && !['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa'].some(val => isColorActive(activeStyles.backColor, val)) ? '1.8px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                textShadow: '0px 0px 1px #000'
                                            }}
                                            title="Custom Highlight Color"
                                        >
                                            <Palette size={9} style={{ filter: 'drop-shadow(0px 0px 1px rgba(0,0,0,0.5))' }} />
                                        </button>
                                        {activeColorPicker === 'highlight' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 8px)',
                                                left: '-10px',
                                                backgroundColor: 'var(--panel-bg)',
                                                border: '1.5px solid var(--border-color)',
                                                borderRadius: '12px',
                                                padding: '10px',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                                                zIndex: 100,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                minWidth: '200px',
                                                animation: 'notebookFullScreenOpen 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                            }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Palette size={10} /> Custom Highlight Color
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
                                                        <input
                                                            type="color"
                                                            value={highlightHexInput}
                                                            onChange={(e) => { setHighlightHexInput(e.target.value); }}
                                                            onBlur={(e) => { let v = e.target.value; if (v.length === 7 && v.startsWith('#')) { applyFormat('backColor', v); } }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '-4px',
                                                                left: '-4px',
                                                                width: '36px',
                                                                height: '36px',
                                                                padding: 0,
                                                                margin: 0,
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                background: 'none'
                                                            }}
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={highlightHexInput}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (val.length > 0 && !val.startsWith('#')) val = '#' + val;
                                                            setHighlightHexInput(val);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                let val = highlightHexInput;
                                                                if (val.length === 7 && val.startsWith('#')) { applyFormat('backColor', val); }
                                                                setActiveColorPicker(null);
                                                            }
                                                        }}
                                                        placeholder="#Hex Code"
                                                        style={{
                                                            flex: 1,
                                                            height: '28px',
                                                            padding: '2px 8px',
                                                            border: '1.5px solid var(--border-color)',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'var(--surface-bg)',
                                                            color: 'var(--text-primary)',
                                                            outline: 'none',
                                                            fontFamily: 'monospace'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => { let val = highlightHexInput; if (val.length === 7 && val.startsWith('#')) { applyFormat('backColor', val); } setActiveColorPicker(null); }}
                                                        style={{
                                                            height: '28px',
                                                            padding: '0 10px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 'bold',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            background: 'var(--accent-color)',
                                                            color: '#fff',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'filter 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ROW 4: Find & Replace, Document Locking preferences (Open & Arranged) */}
                        <div style={{ display: 'flex', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                            {/* Find & Replace Tools */}
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', borderRight: '1.5px solid var(--border-color)', paddingRight: '12px' }}>
                                <span style={labelStyle}>Find</span>
                                <input
                                    type="text" placeholder="Find..." value={findText}
                                    onChange={(e) => {
                                        setFindText(e.target.value);
                                        setActiveMatchIndex(0);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const activeRef = isExpanded ? modalRef : inlineRef;
                                            if (activeRef.current) {
                                                const marks = activeRef.current.querySelectorAll('.search-mark');
                                                if (marks.length > 0) {
                                                    setActiveMatchIndex((prev) => (prev + 1) % marks.length);
                                                }
                                            }
                                        }
                                    }}
                                    style={{ ...selectStyle, width: '90px' }}
                                />
                                <span style={labelStyle}>Replace</span>
                                <input
                                    type="text" placeholder="With..." value={replaceText}
                                    onChange={(e) => setReplaceText(e.target.value)}
                                    style={{ ...selectStyle, width: '90px' }}
                                />
                                <button
                                    onClick={() => handleFindReplace(false)}
                                    style={{ ...actionBtnStyle, width: 'auto', padding: '3px 8px' }}
                                >
                                    Replace
                                </button>
                                <button
                                    onClick={() => handleFindReplace(true)}
                                    style={{ ...actionBtnStyle, width: 'auto', padding: '3px 8px' }}
                                >
                                    All
                                </button>
                            </div>

                            {/* Lock note / Auto cap / Spellcheck options */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderRight: '1.5px solid var(--border-color)', paddingRight: '12px', flexWrap: 'wrap' }}>
                                <div style={checkboxContainerStyle}>
                                    <input
                                        type="checkbox" id="readOnlyToggle" checked={readOnly}
                                        onChange={(e) => { setReadOnly(e.target.checked); uSet('shelf_notebook_readonly', e.target.checked); }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="readOnlyToggle" style={checkboxLabelStyle}>Lock Note</label>
                                </div>
                                <div style={checkboxContainerStyle}>
                                    <input
                                        type="checkbox" id="spellcheckToggle" checked={spellcheck}
                                        onChange={(e) => { setSpellcheck(e.target.checked); uSet('shelf_notebook_spellcheck', e.target.checked); }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="spellcheckToggle" style={checkboxLabelStyle}>Spellcheck</label>
                                </div>
                                <div style={checkboxContainerStyle}>
                                    <input
                                        type="checkbox" id="autoCapToggle" checked={autoCapitalize}
                                        onChange={(e) => { setAutoCapitalize(e.target.checked); uSet('shelf_notebook_autocap', e.target.checked); }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="autoCapToggle" style={checkboxLabelStyle}>Auto Cap</label>
                                </div>
                                <div style={checkboxContainerStyle}>
                                    <input
                                        type="checkbox" id="focusToggle" checked={focusMode}
                                        onChange={(e) => { setFocusMode(e.target.checked); uSet('shelf_notebook_focusmode', e.target.checked); }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="focusToggle" style={checkboxLabelStyle}>Focus Mode</label>
                                </div>
                            </div>

                            {/* Count display configuration */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderRight: '1.5px solid var(--border-color)', paddingRight: '12px' }}>
                                <div style={checkboxContainerStyle}>
                                    <input
                                        type="checkbox" id="showWordToggle" checked={showWordCount}
                                        onChange={(e) => { setShowWordCount(e.target.checked); uSet('shelf_notebook_wordcount', e.target.checked); }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="showWordToggle" style={checkboxLabelStyle}>Word Count</label>
                                </div>
                                <div style={checkboxContainerStyle}>
                                    <input
                                        type="checkbox" id="showCharToggle" checked={showCharCount}
                                        onChange={(e) => { setShowCharCount(e.target.checked); uSet('shelf_notebook_charcount', e.target.checked); }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="showCharToggle" style={checkboxLabelStyle}>Char Count</label>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', borderLeft: '1.5px solid var(--border-color)', paddingLeft: '12px', marginLeft: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Sticky Color:</span>
                                    {[
                                        { name: 'Yellow', value: '#fef08a' },
                                        { name: 'Green', value: '#bbf7d0' },
                                        { name: 'Blue', value: '#bfdbfe' },
                                        { name: 'Pink', value: '#fbcfe8' },
                                        { name: 'Orange', value: '#fed7aa' }
                                    ].map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => updateStickyColor(c.value)}
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: c.value,
                                                border: stickyColor === c.value ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Collapsible Panel for Font, Layout, and Margin */}
                        {showMoreSettings && (
                            <div className="scratchpad-print-hide" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                                {/* Row containing Font settings */}
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {/* Font Selector */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={labelStyle}>Font</span>
                                        <select
                                            value={fontFamily}
                                            onChange={(e) => {
                                                setFontFamily(e.target.value);
                                                uSet('shelf_notebook_font_family', e.target.value);
                                            }}
                                            style={{ ...selectStyle, width: '90px' }}
                                        >
                                            <option value="'Caveat', cursive">Caveat</option>
                                            <option value="'Architects Daughter', cursive">Architects</option>
                                            <option value="'Homemade Apple', cursive">Classic Script</option>
                                            <option value="'Indie Flower', cursive">Indie Flower</option>
                                            <option value="'Patrick Hand', cursive">Patrick Hand</option>
                                            <option value="'Shadows Into Light', cursive">Shadows</option>
                                            <option value="'Inter', sans-serif">Sans-Serif</option>
                                            <option value="Georgia, serif">Georgia</option>
                                        </select>

                                        {/* Text size popover menu */}
                                        {renderPopoverButton('size', 'Size', `${baseFontSize}px`, 14, 36, 1, baseFontSize, (e) => {
                                            const val = parseInt(e.target.value);
                                            setBaseFontSize(val);
                                            uSet('shelf_notebook_font_size', val);
                                        })}

                                        {/* Line Height popover menu */}
                                        {renderPopoverButton('height', 'Height', lineHeight, 1.1, 2.5, 0.1, lineHeight, (e) => {
                                            const val = parseFloat(e.target.value);
                                            setLineHeight(val);
                                            uSet('shelf_notebook_line_height', val);
                                        })}

                                        {/* Letter Spacing popover menu */}
                                        {renderPopoverButton('letter', 'Letter', `${letterSpacing}px`, -1, 6, 0.5, letterSpacing, (e) => {
                                            const val = parseFloat(e.target.value);
                                            setLetterSpacing(val);
                                            uSet('shelf_notebook_letter_spacing', val);
                                        })}

                                        {/* Paper Color Sheet selection */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                                            <span style={{ ...labelStyle, marginRight: '2px' }}>Sheet</span>
                                            {[
                                                { name: 'Theme', value: 'var(--surface-bg)' },
                                                { name: 'White', value: '#ffffff' },
                                                { name: 'Ivory', value: '#fcfaf2' },
                                                { name: 'Peach', value: '#fff7ed' },
                                                { name: 'Mint', value: '#f0fdf4' },
                                                { name: 'Slate', value: '#f1f5f9' },
                                                { name: 'Dark', value: '#1e293b' }
                                            ].map(color => (
                                                <button
                                                    key={color.name}
                                                    onClick={() => {
                                                        setPaperColor(color.value);
                                                        uSet('shelf_notebook_paper_color', color.value);
                                                    }}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '50%',
                                                        backgroundColor: color.value.startsWith('var') ? 'var(--surface-bg)' : color.value,
                                                        border: paperColor === color.value ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                                        position: 'relative'
                                                    }}
                                                    title={color.name}
                                                >
                                                    {paperColor === color.value && (
                                                        <span style={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            width: '4px',
                                                            height: '4px',
                                                            borderRadius: '50%',
                                                            backgroundColor: color.value === '#1e293b' ? '#ffffff' : 'var(--accent-color)'
                                                        }} />
                                                    )}
                                                </button>
                                            ))}

                                            {/* Custom Sheet Color Popover Container */}
                                            <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setActiveColorPicker(activeColorPicker === 'sheet' ? null : 'sheet')}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '50%',
                                                        background: 'conic-gradient(red, yellow, green, cyan, blue, magenta, red)',
                                                        border: !['var(--surface-bg)', '#ffffff', '#fcfaf2', '#fff7ed', '#f0fdf4', '#f1f5f9', '#1e293b'].includes(paperColor) ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#fff',
                                                        textShadow: '0px 0px 1px #000'
                                                    }}
                                                    title="Custom Sheet Color"
                                                >
                                                    <Palette size={10} style={{ filter: 'drop-shadow(0px 0px 1px rgba(0,0,0,0.5))' }} />
                                                </button>
                                                {activeColorPicker === 'sheet' && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 'calc(100% + 8px)',
                                                        left: '-10px',
                                                        backgroundColor: 'var(--panel-bg)',
                                                        border: '1.5px solid var(--border-color)',
                                                        borderRadius: '12px',
                                                        padding: '10px',
                                                        boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                                                        zIndex: 100,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                        minWidth: '200px',
                                                        animation: 'notebookFullScreenOpen 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                                    }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Palette size={10} /> Custom Sheet Color
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
                                                                <input
                                                                    type="color"
                                                                    value={paperColor.startsWith('#') ? paperColor : '#ffffff'}
                                                                    onChange={(e) => {
                                                                        setPaperColor(e.target.value);
                                                                        uSet('shelf_notebook_paper_color', e.target.value);
                                                                    }}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: '-4px',
                                                                        left: '-4px',
                                                                        width: '36px',
                                                                        height: '36px',
                                                                        padding: 0,
                                                                        margin: 0,
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        background: 'none'
                                                                    }}
                                                                />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={paperColor.startsWith('#') ? paperColor : ''}
                                                                onChange={(e) => {
                                                                    let val = e.target.value;
                                                                    if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                                                                    setPaperColor(val);
                                                                    uSet('shelf_notebook_paper_color', val);
                                                                }}
                                                                placeholder="#Hex Code"
                                                                style={{
                                                                    flex: 1,
                                                                    height: '28px',
                                                                    padding: '2px 8px',
                                                                    border: '1.5px solid var(--border-color)',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    backgroundColor: 'var(--surface-bg)',
                                                                    color: 'var(--text-primary)',
                                                                    outline: 'none',
                                                                    fontFamily: 'monospace'
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => setActiveColorPicker(null)}
                                                                style={{
                                                                    height: '28px',
                                                                    padding: '0 10px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 'bold',
                                                                    borderRadius: '6px',
                                                                    border: 'none',
                                                                    background: 'var(--accent-color)',
                                                                    color: '#fff',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'filter 0.15s ease'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                                                            >
                                                                Done
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Row containing Layout settings */}
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                                    {/* Layout Selection */}
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <span style={labelStyle}>Layout</span>
                                        {['lines', 'dots', 'grid', 'seyes', 'isometric', 'blank'].map((style) => (
                                            <button
                                                key={style}
                                                onClick={() => handleChangeStyle(style)}
                                                style={{
                                                    background: paperStyle === style ? 'var(--option-bg)' : 'var(--panel-bg)',
                                                    border: paperStyle === style ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    padding: '4px 8px',
                                                    fontSize: '0.7rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer',
                                                    color: paperStyle === style ? 'var(--option-text)' : 'var(--text-secondary)',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                    transition: 'all 0.15s ease',
                                                }}
                                                title={style.charAt(0).toUpperCase() + style.slice(1)}
                                            >
                                                {renderStyleIcon(style, 8)}
                                                {style.charAt(0).toUpperCase() + style.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Guideline Spacing, Opacity, Thickness, Style, Double Line */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderLeft: '1.5px solid var(--border-color)', paddingLeft: '12px', flexWrap: 'wrap' }}>
                                        {renderPopoverButton('spacing', 'Spacing', `${lineSpacing}px`, 20, 48, 1, lineSpacing, (e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) {
                                                setLineSpacing(val);
                                                uSet('shelf_notebook_line_spacing', val);
                                            }
                                        })}

                                        {renderPopoverButton('opacity', 'Opacity', `${lineOpacity}%`, 10, 100, 1, lineOpacity, (e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) {
                                                setLineOpacity(val);
                                                uSet('shelf_notebook_line_opacity', val);
                                            }
                                        })}

                                        {renderPopoverButton('thickness', 'Stroke', `${lineThickness}px`, 0.5, 3, 0.2, lineThickness, (e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) {
                                                setLineThickness(val);
                                                uSet('shelf_notebook_line_thickness', val);
                                            }
                                        })}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <input
                                                type="checkbox" id="doubleLines" checked={doubleLines}
                                                onChange={(e) => {
                                                    setDoubleLines(e.target.checked);
                                                    uSet('shelf_notebook_double_lines', e.target.checked);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <label htmlFor="doubleLines" style={checkboxLabelStyle}>Double Line</label>
                                        </div>
                                    </div>

                                    {/* Margin settings */}
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', borderLeft: '1.5px solid var(--border-color)', paddingLeft: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span style={labelStyle}>Margin</span>
                                            <select
                                                value={marginStyle}
                                                onChange={(e) => {
                                                    setMarginStyle(e.target.value);
                                                    uSet('shelf_notebook_margin_style', e.target.value);
                                                }}
                                                style={{ ...selectStyle, width: '90px' }}
                                            >
                                                <option value="left">Left Margin</option>
                                                <option value="right">Right Margin</option>
                                                <option value="none">No Margin</option>
                                            </select>
                                        </div>

                                        {renderPopoverButton('position', 'Position', `${marginOffset}px`, 30, 200, 1, marginOffset, (e) => {
                                            const val = parseInt(e.target.value);
                                            setMarginOffset(val);
                                            uSet('shelf_notebook_margin_offset', val);
                                        })}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span style={labelStyle}>Ink</span>
                                            <select
                                                value={marginColor}
                                                onChange={(e) => {
                                                    setMarginColor(e.target.value);
                                                    uSet('shelf_notebook_margin_color', e.target.value);
                                                }}
                                                style={{ ...selectStyle, width: '85px' }}
                                            >
                                                <option value="#c83f3f">Crimson</option>
                                                <option value="#2a6f40">Forest</option>
                                                <option value="#2b5c8f">Navy Blue</option>
                                                <option value="#7b1fa2">Plum</option>
                                                <option value="#94a3b8">Slate</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Full-Screen contentEditable Workspace (With custom padding margins) */}
                    <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
                        {/* Sidebar: Pages list (Collapsible, Premium Sidebar UI) */}
                        {pagesSidebarOpen && (
                            pagesSidebarMinimized ? (
                                <div className="scratchpad-print-hide" style={{
                                    width: '44px',
                                    borderRight: '1.5px solid var(--border-color)',
                                    backgroundColor: 'var(--panel-bg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    height: '100%',
                                    zIndex: 10,
                                    flexShrink: 0,
                                    padding: '8px 0',
                                    gap: '12px'
                                }}>
                                    <button
                                        onClick={() => {
                                            setPagesSidebarMinimized(false);
                                            uSet('shelf_notebook_sidebar_minimized', false);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--text-secondary)',
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--option-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                        title="Expand Sidebar"
                                    >
                                        <ChevronRight size={16} />
                                    </button>

                                    <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--border-color)' }} />

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, width: '100%', alignItems: 'center' }}>
                                        {pages.map((page, index) => {
                                            const isActive = currentPageIndex === index;
                                            return (
                                                <button
                                                    key={page.id || index}
                                                    onClick={() => {
                                                        setCurrentPageIndex(index);
                                                        setContent(page.content || '');
                                                    }}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        border: isActive ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                        backgroundColor: isActive ? 'var(--option-bg)' : 'var(--surface-bg)',
                                                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                        fontSize: '0.72rem',
                                                        fontWeight: isActive ? '700' : '500',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--border-color)'; }}
                                                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--surface-bg)'; }}
                                                    title={page.title || 'new note'}
                                                >
                                                    {index + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="scratchpad-print-hide" style={{
                                    width: '220px',
                                    borderRight: '1.5px solid var(--border-color)',
                                    backgroundColor: 'var(--panel-bg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    zIndex: 10,
                                    flexShrink: 0
                                }}>
                                    {/* Sidebar Header */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        padding: '12px 16px',
                                        borderBottom: '1.5px solid var(--border-color)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                Pages
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setPagesSidebarMinimized(true);
                                                    uSet('shelf_notebook_sidebar_minimized', true);
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: 'var(--text-secondary)'
                                                }}
                                                title="Minimize Sidebar"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                        </div>

                                        {/* Action Buttons for Selected Page */}
                                        {!isViewerMode && (
                                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                                                <button
                                                    onClick={handleAddPage}
                                                    style={{
                                                        background: 'var(--surface-bg)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.7rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                    title="Add New Note"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleRenamePageAtIndex(currentPageIndex)}
                                                    style={{
                                                        background: 'var(--surface-bg)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.7rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                    title="Rename Selected Note"
                                                >
                                                    <Edit3 size={12} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setBulkDeleteMode(prev => {
                                                            const next = !prev;
                                                            if (!next) setCheckedPageIds([]);
                                                            return next;
                                                        });
                                                    }}
                                                    style={{
                                                        background: bulkDeleteMode ? 'var(--option-bg)' : 'var(--surface-bg)',
                                                        border: bulkDeleteMode ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.7rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                    title="Select Multiple Pages"
                                                >
                                                    <CheckSquare size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        if (bulkDeleteMode) {
                                                            handleDeleteSelectedPages();
                                                        } else {
                                                            handleDeletePageAtIndex(currentPageIndex, e);
                                                        }
                                                    }}
                                                    disabled={!bulkDeleteMode && pages.length <= 1}
                                                    style={{
                                                        background: bulkDeleteMode ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-bg)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.7rem',
                                                        cursor: (!bulkDeleteMode && pages.length <= 1) ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        color: 'var(--danger-color)',
                                                        opacity: (!bulkDeleteMode && pages.length <= 1) ? 0.5 : 1
                                                    }}
                                                    title={bulkDeleteMode ? `Delete Checked Notes (${checkedPageIds.length})` : "Delete Selected Note"}
                                                >
                                                    <Trash2 size={12} /> {bulkDeleteMode && `(${checkedPageIds.length})`}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar Pages List */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                                        {pages.map((page, index) => {
                                            const isActive = currentPageIndex === index;
                                            const isChecked = checkedPageIds.includes(page.id);
                                            return (
                                                <div
                                                    key={page.id || index}
                                                    onClick={() => {
                                                        if (bulkDeleteMode) {
                                                            togglePageChecked(page.id);
                                                        } else {
                                                            setCurrentPageIndex(index);
                                                            setContent(page.content || '');
                                                        }
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '8px 12px',
                                                        paddingLeft: isActive ? '9px' : '12px',
                                                        borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                                                        borderRadius: '6px',
                                                        backgroundColor: isChecked ? 'rgba(239, 68, 68, 0.08)' : (isActive ? 'var(--option-bg)' : 'transparent'),
                                                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        marginBottom: '4px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: isActive ? '600' : '400',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isActive && !isChecked) e.currentTarget.style.backgroundColor = 'var(--border-color)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isActive && !isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    {bulkDeleteMode && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                togglePageChecked(page.id);
                                                            }}
                                                            style={{ marginRight: '8px', cursor: 'pointer' }}
                                                        />
                                                    )}
                                                    <span style={{ opacity: 0.6, fontSize: '0.7rem', marginRight: '8px' }}>{index + 1}.</span>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                        {page.title || 'new note'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        )}
                        <div
                            ref={setModalRef}
                            contentEditable={!isReadOnlyMode}
                            onInput={handleInput}
                            onPaste={handlePaste}
                            onDrop={handleDrop}
                            onKeyDown={handleKeyDown}
                            onKeyUp={handleKeyUp}
                            onClick={handleEditorClick}
                            placeholder="Write your thoughts, paste codes, or draft ideas..."
                            className={`scratchpad-editor ${paperStyle}`}
                            spellCheck={spellcheck}
                            autoCapitalize={autoCapitalize ? 'sentences' : 'none'}
                            key={`${spellcheck}-${autoCapitalize}`}
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                outline: 'none',
                                cursor: isLassoMode ? 'crosshair' : 'text',
                                fontFamily: fontFamily,
                                fontSize: `${baseFontSize}px`,
                                lineHeight: `${lineSpacing}px`,
                                color: 'var(--text-primary)',
                                margin: 0,
                                boxSizing: 'border-box',
                                padding: `20px ${rightPadding} 60px ${leftPadding}`,
                                style: { lineHeight: lineHeight }, // inline height override
                                backgroundColor: paperColor.startsWith('var') ? 'var(--surface-bg)' : paperColor,
                                zIndex: 1,
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                '--notebook-spacing': `${lineSpacing}px`,
                                '--notebook-thickness': `${lineThickness}px`,
                                '--notebook-opacity': `${lineOpacity / 100}`,
                                '--print-spacing': `${lineSpacing}px`,
                                '--print-thickness': `${lineThickness}px`,
                                '--print-opacity': `${lineOpacity / 100}`
                            }}
                        />
                    </div>

                    {/* Footer Status Bar showing statistics */}
                    <div className="scratchpad-print-hide" style={{
                        display: focusMode ? 'none' : 'flex',
                        justifyContent: 'flex-start',
                        gap: '20px',
                        alignItems: 'center',
                        backgroundColor: 'var(--panel-bg)',
                        borderTop: '1.5px solid var(--border-color)',
                        padding: '6px 40px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        zIndex: 5
                    }}
                    >
                        {showWordCount && <span>{stats.wordCount} words</span>}
                        {showCharCount && <span>{stats.charCount} characters</span>}
                        <span>Reading Time: {Math.ceil(stats.wordCount / 200)} min</span>
                        {readOnly && <span style={{ color: 'var(--danger-color)' }}>Locked (Read-Only)</span>}
                    </div>

                    {/* Floating Exit Focus Mode Button */}
                    {focusMode && (
                        <button
                            onClick={() => { setFocusMode(false); uSet('shelf_notebook_focusmode', false); }}
                            style={{
                                position: 'fixed',
                                top: '16px',
                                left: '20px',
                                zIndex: 2100,
                                background: 'var(--panel-bg)',
                                border: '1.5px solid var(--border-color)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                opacity: 0.6,
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--accent-color)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            title="Show Settings Toolbar (Exit Focus Mode)"
                        >
                            <Eye size={15} />
                        </button>
                    )}
                </div>
            )}

            {activeImageElement && (
                <ImageResizerOverlay
                    target={activeImageElement}
                    onClose={() => {
                        activeImageElement.classList.remove('selected-for-resize');
                        setActiveImageElement(null);
                    }}
                    onChangeSize={(newWidth, newHeight) => {
                        if (newWidth) activeImageElement.style.width = newWidth;
                        if (newHeight) activeImageElement.style.height = newHeight;
                        const activeRef = isExpanded ? modalRef : inlineRef;
                        if (activeRef.current) {
                            handleInput({ currentTarget: activeRef.current });
                        }
                    }}
                />
            )}

            {selectedElements.length > 0 && (
                <div 
                    className="scratchpad-print-hide"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'var(--panel-bg)',
                        border: '1.5px solid var(--accent-color)',
                        borderRadius: '12px',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                        zIndex: 999999,
                        animation: 'notebookFullScreenOpen 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {selectedElements.length} items selected
                    </span>
                    <button
                        onClick={() => handleGroupElements(selectedElements)}
                        style={{
                            background: 'var(--accent-color)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Group & Lock
                    </button>
                    <button
                        onClick={() => {
                            const activeEditor = isExpanded ? modalRef.current : inlineRef.current;
                            if (activeEditor) {
                                activeEditor.querySelectorAll('.lasso-selected').forEach(el => el.classList.remove('lasso-selected'));
                            }
                            setSelectedElements([]);
                        }}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        Clear Selection
                    </button>
                </div>
            )}
        </div>
    );
}

const ImageResizerOverlay = ({ target, onClose, onChangeSize }) => {
    const [rect, setRect] = useState(null);

    const updateRect = () => {
        if (target) {
            setRect(target.getBoundingClientRect());
        }
    };

    useEffect(() => {
        updateRect();
        window.addEventListener('resize', updateRect);

        const scrollContainers = document.querySelectorAll('.scratchpad-editor, .scratchpad-container-hoverable');
        scrollContainers.forEach(container => container.addEventListener('scroll', updateRect));

        return () => {
            window.removeEventListener('resize', updateRect);
            scrollContainers.forEach(container => container.removeEventListener('scroll', updateRect));
        };
    }, [target]);

    const onChangePlacement = (placement) => {
        if (!target) return;
        if (placement === 'inline') {
            target.style.display = 'inline-block';
            target.style.verticalAlign = 'middle';
            target.style.float = 'none';
            target.style.clear = 'none';
            target.style.margin = '8px 12px';
        } else if (placement === 'above') {
            target.style.display = 'block';
            target.style.float = 'none';
            target.style.clear = 'both';
            target.style.margin = '12px auto 6px auto';
        } else if (placement === 'below') {
            target.style.display = 'block';
            target.style.float = 'none';
            target.style.clear = 'both';
            target.style.margin = '6px auto 12px auto';
        }
        // Save the modifications
        onChangeSize(null, null);
    };

    let activePlacement = 'inline';
    if (target && target.style.display === 'block') {
        const marginStr = target.style.margin || '';
        if (marginStr.startsWith('12px') || target.style.marginTop === '12px') {
            activePlacement = 'above';
        } else {
            activePlacement = 'below';
        }
    }

    if (!rect) return null;

    const currentWidth = target.style.width || `${target.clientWidth}px` || '180px';
    const numericWidth = parseInt(currentWidth) || 180;

    const top = rect.top - 48 < 10 ? rect.top + rect.height + 10 : rect.top - 48;
    const left = Math.max(10, Math.min(window.innerWidth - 230, rect.left + rect.width / 2 - 110));

    const handleDragStart = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();

        const isTouch = e.type === 'touchstart';
        const startX = isTouch ? e.touches[0].clientX : e.clientX;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        const startWidth = target.clientWidth;
        const startHeight = target.clientHeight;

        const handleDragMove = (moveEvent) => {
            const moveIsTouch = moveEvent.type === 'touchmove';
            const clientX = moveIsTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const clientY = moveIsTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            if (!clientX || !clientY) return;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            let newWidth = null;
            let newHeight = null;

            if (direction === 'right' || direction === 'corner') {
                newWidth = `${Math.max(50, startWidth + deltaX)}px`;
            }
            if (direction === 'bottom' || direction === 'corner') {
                newHeight = `${Math.max(50, startHeight + deltaY)}px`;
            }

            onChangeSize(newWidth, newHeight);
            updateRect();
        };

        const handleDragEnd = () => {
            if (isTouch) {
                window.removeEventListener('touchmove', handleDragMove);
                window.removeEventListener('touchend', handleDragEnd);
            } else {
                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
            }
        };

        if (isTouch) {
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        } else {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        }
    };

    return (
        <>
            {/* Outline Box Overlay with resize handles */}
            <div
                style={{
                    position: 'fixed',
                    top: `${rect.top}px`,
                    left: `${rect.left}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                    border: '2px solid #000000',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
                    zIndex: 999,
                    pointerEvents: 'none',
                    borderRadius: '12px',
                    boxSizing: 'border-box'
                }}
            >
                {/* Right Edge Handle */}
                <div
                    onMouseDown={(e) => handleDragStart(e, 'right')}
                    onTouchStart={(e) => handleDragStart(e, 'right')}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        bottom: '10px',
                        right: '-5px',
                        width: '10px',
                        cursor: 'ew-resize',
                        pointerEvents: 'auto',
                        zIndex: 1001
                    }}
                />

                {/* Bottom Edge Handle */}
                <div
                    onMouseDown={(e) => handleDragStart(e, 'bottom')}
                    onTouchStart={(e) => handleDragStart(e, 'bottom')}
                    style={{
                        position: 'absolute',
                        left: '10px',
                        right: '10px',
                        bottom: '-5px',
                        height: '10px',
                        cursor: 'ns-resize',
                        pointerEvents: 'auto',
                        zIndex: 1001
                    }}
                />

                {/* Bottom Right Corner Handle */}
                <div
                    onMouseDown={(e) => handleDragStart(e, 'corner')}
                    onTouchStart={(e) => handleDragStart(e, 'corner')}
                    style={{
                        position: 'absolute',
                        bottom: '-6px',
                        right: '-6px',
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#000000',
                        border: '2.5px solid #ffffff',
                        borderRadius: '50%',
                        cursor: 'nwse-resize',
                        pointerEvents: 'auto',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                        zIndex: 1002
                    }}
                />
            </div>

            {/* Floating toolbar options bar */}
            <div
                className="image-resizer-floating-bar"
                style={{
                    position: 'fixed',
                    top: `${top}px`,
                    left: `${left}px`,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#1e293b',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    animation: 'notebookFullScreenOpen 0.15s ease'
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <span style={{ fontSize: '0.68rem', fontWeight: 'bold', minWidth: '32px', fontFamily: 'monospace' }}>
                    {numericWidth}px
                </span>
                <input
                    type="range"
                    min="60"
                    max="800"
                    value={numericWidth}
                    onChange={(e) => onChangeSize(`${e.target.value}px`, 'auto')}
                    style={{ width: '80px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                />
                <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                        onClick={() => onChangeSize('150px', 'auto')}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', border: 'none', borderRadius: '4px', background: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        S
                    </button>
                    <button
                        onClick={() => onChangeSize('300px', 'auto')}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', border: 'none', borderRadius: '4px', background: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        M
                    </button>
                    <button
                        onClick={() => onChangeSize('500px', 'auto')}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', border: 'none', borderRadius: '4px', background: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        L
                    </button>
                    <button
                        onClick={() => onChangeSize('100%', 'auto')}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', border: 'none', borderRadius: '4px', background: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Full
                    </button>
                </div>

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

                {/* Placement Options */}
                <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                        onClick={() => onChangePlacement('inline')}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            border: 'none',
                            borderRadius: '4px',
                            background: activePlacement === 'inline' ? 'var(--accent-color, #10b981)' : '#334155',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}
                        title="Inline in text"
                    >
                        In Text
                    </button>
                    <button
                        onClick={() => onChangePlacement('above')}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            border: 'none',
                            borderRadius: '4px',
                            background: activePlacement === 'above' ? 'var(--accent-color, #10b981)' : '#334155',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}
                        title="Block above text"
                    >
                        Above Text
                    </button>
                    <button
                        onClick={() => onChangePlacement('below')}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            border: 'none',
                            borderRadius: '4px',
                            background: activePlacement === 'below' ? 'var(--accent-color, #10b981)' : '#334155',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}
                        title="Block below text"
                    >
                        Below Text
                    </button>
                </div>

                <button
                    onClick={onClose}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                        marginLeft: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                    <X size={12} />
                </button>
            </div>
        </>
    );
};
