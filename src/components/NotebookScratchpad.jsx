import React, { useState, useEffect, useRef } from 'react';
import { 
    Copy, Maximize2, X, Check, Bold, Italic, Underline,
    Undo, Redo, Heading1, Heading2, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
    Link, Image as LucideImage, Eraser, Download, Trash2, 
    Calendar, CheckSquare, Code, Quote, Table, RotateCcw
} from 'lucide-react';
import { uGet, uSet } from '../utils/userKey';

export default function NotebookScratchpad() {
    const [content, setContent] = useState(() => uGet('shelf_notebook_scratchpad_html') || '');
    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
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

    // Sync content and styles if modified elsewhere
    useEffect(() => {
        const handleSync = () => {
            const savedContent = uGet('shelf_notebook_scratchpad_html');
            if (savedContent !== null && savedContent !== undefined) {
                setContent(savedContent);
            }
            const savedStyle = uGet('shelf_notebook_paper_style');
            if (savedStyle !== null && savedStyle !== undefined) {
                setPaperStyle(savedStyle);
            }
            const savedFont = uGet('shelf_notebook_font_family');
            if (savedFont !== null && savedFont !== undefined) {
                setFontFamily(savedFont);
            }
            const savedSize = uGet('shelf_notebook_font_size');
            if (savedSize !== null && savedSize !== undefined) {
                setBaseFontSize(savedSize);
            }
            const savedLHeight = uGet('shelf_notebook_line_height');
            if (savedLHeight !== null && savedLHeight !== undefined) {
                setLineHeight(savedLHeight);
            }
            const savedLSpacingLetter = uGet('shelf_notebook_letter_spacing');
            if (savedLSpacingLetter !== null && savedLSpacingLetter !== undefined) {
                setLetterSpacing(savedLSpacingLetter);
            }
            const savedDPadding = uGet('shelf_notebook_doc_padding');
            if (savedDPadding !== null && savedDPadding !== undefined) {
                setDocPadding(savedDPadding);
            }
            const savedColor = uGet('shelf_notebook_paper_color');
            if (savedColor !== null && savedColor !== undefined) {
                setPaperColor(savedColor);
            }
            const savedLStyle = uGet('shelf_notebook_line_style');
            if (savedLStyle !== null && savedLStyle !== undefined) {
                setLineStyle(savedLStyle);
            }
            const savedLSpacing = uGet('shelf_notebook_line_spacing');
            if (savedLSpacing !== null && savedLSpacing !== undefined) {
                setLineSpacing(savedLSpacing);
            }
            const savedLOpacity = uGet('shelf_notebook_line_opacity');
            if (savedLOpacity !== null && savedLOpacity !== undefined) {
                setLineOpacity(savedLOpacity);
            }
            const savedLThickness = uGet('shelf_notebook_line_thickness');
            if (savedLThickness !== null && savedLThickness !== undefined) {
                setLineThickness(savedLThickness);
            }
            const savedDoubleLines = uGet('shelf_notebook_double_lines');
            if (savedDoubleLines !== null && savedDoubleLines !== undefined) {
                setDoubleLines(savedDoubleLines);
            }
            const savedMargin = uGet('shelf_notebook_margin_style');
            if (savedMargin !== null && savedMargin !== undefined) {
                setMarginStyle(savedMargin);
            }
            const savedMarginOffset = uGet('shelf_notebook_margin_offset');
            if (savedMarginOffset !== null && savedMarginOffset !== undefined) {
                setMarginOffset(savedMarginOffset);
            }
            const savedMarginColor = uGet('shelf_notebook_margin_color');
            if (savedMarginColor !== null && savedMarginColor !== undefined) {
                setMarginColor(savedMarginColor);
            }
            const savedReadOnly = uGet('shelf_notebook_readonly');
            if (savedReadOnly !== null && savedReadOnly !== undefined) {
                setReadOnly(savedReadOnly);
            }
            const savedSpellcheck = uGet('shelf_notebook_spellcheck');
            if (savedSpellcheck !== null && savedSpellcheck !== undefined) {
                setSpellcheck(savedSpellcheck);
            }
            const savedAutoCap = uGet('shelf_notebook_autocap');
            if (savedAutoCap !== null && savedAutoCap !== undefined) {
                setAutoCapitalize(savedAutoCap);
            }
            const savedFocus = uGet('shelf_notebook_focusmode');
            if (savedFocus !== null && savedFocus !== undefined) {
                setFocusMode(savedFocus);
            }
            const savedWordCount = uGet('shelf_notebook_wordcount');
            if (savedWordCount !== null && savedWordCount !== undefined) {
                setShowWordCount(savedWordCount);
            }
            const savedCharCount = uGet('shelf_notebook_charcount');
            if (savedCharCount !== null && savedCharCount !== undefined) {
                setShowCharCount(savedCharCount);
            }
        };
        window.addEventListener('storage', handleSync);
        window.addEventListener('notebook-updated', handleSync);
        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('notebook-updated', handleSync);
        };
    }, []);

    // Sync innerHTML to refs when content updates from external events
    useEffect(() => {
        if (inlineRef.current && inlineRef.current.innerHTML !== content) {
            inlineRef.current.innerHTML = content;
        }
        if (modalRef.current && modalRef.current.innerHTML !== content) {
            modalRef.current.innerHTML = content;
        }
    }, [content]);

    // Handle document-wide click to close active popovers
    useEffect(() => {
        const handleOutsideClick = () => {
            setActivePopover(null);
        };
        document.addEventListener('click', handleOutsideClick);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, []);

    // Hook to track active styling attributes under selection
    useEffect(() => {
        const handleSelectionChange = () => {
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
        const html = e.currentTarget.innerHTML;
        setContent(html);
        uSet('shelf_notebook_scratchpad_html', html);
        window.dispatchEvent(new Event('notebook-updated'));
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

    const applyFormat = (command, value = null) => {
        if (readOnly) return;
        document.execCommand(command, false, value);
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
            } catch (err) {}
        }, 10);
    };

    const changeCase = (type) => {
        if (readOnly) return;
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
        applyFormat('insertHTML', `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" style="cursor: pointer;" />&nbsp;Task</div>`);
    };

    const insertCodeBlock = () => {
        applyFormat('insertHTML', `<pre style="background: var(--option-bg); border: 1px solid var(--border-color); padding: 8px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; margin: 8px 0; overflow-x: auto;">Code Here</pre>`);
    };

    const insertQuote = () => {
        applyFormat('insertHTML', `<blockquote style="border-left: 4px solid var(--accent-color); padding-left: 12px; margin: 12px 0; font-style: italic; color: var(--text-secondary);">Quote Here</blockquote>`);
    };

    const insertTable = () => {
        const rows = parseInt(prompt('Enter number of rows:', '3') || '3');
        const cols = parseInt(prompt('Enter number of columns:', '3') || '3');
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
    };

    const handleLink = () => {
        const url = prompt('Enter link URL:', 'https://');
        if (url) {
            applyFormat('createLink', url);
        }
    };

    const handleImage = () => {
        const url = prompt('Enter image URL:');
        if (url) {
            applyFormat('insertImage', url);
        }
    };

    const handleFindReplace = (all = false) => {
        if (!findText) return;
        const activeRef = isExpanded ? modalRef : inlineRef;
        if (!activeRef.current) return;
        
        if (window.find) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            
            if (all) {
                let found = window.find(findText, false, false, true, false, true, false);
                while (found) {
                    document.execCommand('insertHTML', false, replaceText);
                    found = window.find(findText, false, false, true, false, true, false);
                }
            } else {
                const found = window.find(findText, false, false, true, false, true, false);
                if (found) {
                    document.execCommand('insertHTML', false, replaceText);
                } else {
                    alert('Text not found!');
                }
            }
        } else {
            let html = activeRef.current.innerHTML;
            const escaped = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escaped, all ? 'g' : '');
            const newHtml = html.replace(regex, replaceText);
            activeRef.current.innerHTML = newHtml;
            handleInput({ currentTarget: activeRef.current });
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

    const handleClearCanvas = () => {
        if (window.confirm('Are you sure you want to clear all contents of the canvas?')) {
            setContent('');
            uSet('shelf_notebook_scratchpad_html', '');
            if (inlineRef.current) inlineRef.current.innerHTML = '';
            if (modalRef.current) modalRef.current.innerHTML = '';
            window.dispatchEvent(new Event('notebook-updated'));
        }
    };

    const handleResetSettings = () => {
        if (window.confirm('Reset all document settings to their default values?')) {
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
        const lineColorStr = `rgba(148, 163, 184, ${opacityDecimal})`;
        const thicknessPx = `${thicknessVal}px`;
        const spacingPx = `${spacingVal}px`;

        switch(style) {
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
                        linear-gradient(rgba(148, 163, 184, ${opacityDecimal * 0.35}) ${thicknessPx}, transparent ${thicknessPx}),
                        linear-gradient(rgba(148, 163, 184, ${opacityDecimal * 0.35}) ${thicknessPx}, transparent ${thicknessPx}),
                        linear-gradient(rgba(148, 163, 184, ${opacityDecimal * 0.35}) ${thicknessPx}, transparent ${thicknessPx}),
                        linear-gradient(${lineColorStr} ${thicknessVal * 1.5}px, transparent ${thicknessVal * 1.5}px),
                        linear-gradient(90deg, rgba(148, 163, 184, ${opacityDecimal * 0.5}) ${thicknessPx}, transparent ${thicknessPx})
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
        switch(style) {
            case 'dots':
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12">
                        <circle cx="3" cy="3" r="1.2" fill="currentColor"/>
                        <circle cx="9" cy="3" r="1.2" fill="currentColor"/>
                        <circle cx="3" cy="9" r="1.2" fill="currentColor"/>
                        <circle cx="9" cy="9" r="1.2" fill="currentColor"/>
                        <circle cx="6" cy="6" r="1.2" fill="currentColor"/>
                    </svg>
                );
            case 'grid':
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.2">
                        <rect x="2" y="2" width="8" height="8" fill="none"/>
                        <line x1="6" y1="2" x2="6" y2="10"/>
                        <line x1="2" y1="6" x2="10" y2="6"/>
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
                        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                );
            case 'lines':
            default:
                return (
                    <svg width={size} height={size} viewBox="0 0 12 12">
                        <line x1="2" y1="3" x2="10" y2="3" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="2" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                );
        }
    };

    const inlineSpacing = 24;
    const inlineOpacity = 30;
    const inlineLineStyle = 'solid';
    const inlinePaperColor = 'var(--surface-bg)';
    const inlineThickness = 1.2;

    const textPaddingInline = '12px 12px 12px 32px';
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
                        <input 
                            type="range" min={min} max={max} step={step} value={value} 
                            onChange={onChange}
                            style={{ cursor: 'pointer', width: '130px', margin: '4px 0' }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, height: '100px' }}>
            {/* CSS Animation Injector, placeholders, handwriting fonts and formatting typography tags */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@400;700&family=Homemade+Apple&family=Indie+Flower&family=Patrick+Hand&family=Shadows+Into+Light&family=Inter:wght@400;700&display=swap');
                
                @keyframes notebookFullScreenOpen {
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
                .scratchpad-editor:empty:before {
                    content: attr(placeholder);
                    color: var(--text-secondary);
                    opacity: 0.65;
                    font-style: italic;
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
                    margin: 16px 0;
                    display: block;
                }
            `}</style>

            {/* Lined Notebook Paper Window */}
            <div 
                style={{ 
                    position: 'relative', 
                    flex: 1, 
                    height: '100px', 
                    borderRadius: '12px',
                    border: '1.5px solid var(--border-color)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                    display: 'flex',
                    backgroundColor: 'var(--surface-bg)',
                }}
            >
                {/* Binder Spine on Left */}
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '24px',
                    backgroundColor: 'var(--option-bg)',
                    borderTopLeftRadius: '10px',
                    borderBottomLeftRadius: '10px',
                    borderRight: '1.5px solid var(--border-color)',
                    zIndex: 2
                }} />

                {/* Spiral Rings */}
                <div style={{
                    position: 'absolute',
                    left: '18px',
                    top: '12px',
                    bottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    {[...Array(4)].map((_, i) => (
                        <svg key={i} width="10" height="16" viewBox="0 0 10 16" fill="none" style={{ filter: 'drop-shadow(0.5px 1px 1px rgba(0,0,0,0.15))' }}>
                            <path
                                d="M 1 14 C -0.5 9, 0.5 1, 4 1 C 8 1, 10 9, 9 14"
                                stroke="var(--border-color)"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 2 12 C 1 8, 1 3, 4 3"
                                stroke="var(--panel-bg)"
                                strokeWidth="0.8"
                                strokeLinecap="round"
                            />
                        </svg>
                    ))}
                </div>

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
                    ref={inlineRef}
                    contentEditable={!readOnly}
                    onInput={handleInput}
                    placeholder="Jot down quick study notes, links, or clips..."
                    className="scratchpad-editor"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        fontFamily: fontFamily,
                        fontSize: '1.25rem',
                        lineHeight: '24px',
                        color: 'var(--text-primary)',
                        margin: 0,
                        boxSizing: 'border-box',
                        padding: textPaddingInline,
                        ...getPaperBackground(paperStyle, inlineSpacing, inlineOpacity, inlineLineStyle, inlinePaperColor, inlineThickness),
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}
                />
            </div>

            {/* Action Shortcut Buttons right beside the window */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Copy Button */}
                <button
                    onClick={handleCopy}
                    style={{
                        background: copied ? 'var(--success-color)' : 'var(--panel-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: copied ? '#FFFFFF' : 'var(--text-secondary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease',
                    }}
                    title={copied ? "Copied!" : "Copy Content"}
                >
                    {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                </button>

                {/* Expand Button */}
                <button
                    onClick={() => setIsExpanded(true)}
                    style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease'
                    }}
                    title="Expand Notebook"
                >
                    <Maximize2 size={14} />
                </button>
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
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        zIndex: 5, 
                        borderBottom: '1.5px solid var(--border-color)',
                        backgroundColor: 'var(--panel-bg)',
                        opacity: focusMode ? 0.08 : 1,
                        transition: 'opacity 0.3s ease',
                        padding: '8px 40px',
                        gap: '8px'
                    }}
                    onMouseEnter={(e) => { if(focusMode) e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={(e) => { if(focusMode) e.currentTarget.style.opacity = 0.08; }}
                    >
                        {/* ROW 1: Branding, Font select, Text Size, Line Height, Letter spacing, margins and Sheet colors */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '1.25rem', color: 'var(--ink)' }}>
                                    Interactive Scratchpad
                                </h3>

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
                                </div>

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

                                {/* Text margins padding popover menu */}
                                {renderPopoverButton('margins', 'Margins', `${docPadding}px`, 20, 140, 1, docPadding, (e) => {
                                    const val = parseInt(e.target.value);
                                    setDocPadding(val);
                                    uSet('shelf_notebook_doc_padding', val);
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
                                </div>
                            </div>

                            {/* Header Utilities Actions */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

                        {/* ROW 2: Layout buttons group and guideline customizers */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', flexWrap: 'wrap' }}>
                            {/* Layout Selection */}
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', borderRight: '1.5px solid var(--border-color)', paddingRight: '12px' }}>
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
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderRight: '1.5px solid var(--border-color)', paddingRight: '12px', flexWrap: 'wrap' }}>
                                {renderPopoverButton('spacing', 'Spacing', `${lineSpacing}px`, 20, 48, 1, lineSpacing, (e) => {
                                    const val = parseInt(e.target.value);
                                    setLineSpacing(val);
                                    uSet('shelf_notebook_line_spacing', val);
                                })}

                                {renderPopoverButton('opacity', 'Opacity', `${lineOpacity}%`, 10, 100, 1, lineOpacity, (e) => {
                                    const val = parseInt(e.target.value);
                                    setLineOpacity(val);
                                    uSet('shelf_notebook_line_opacity', val);
                                })}

                                {renderPopoverButton('thickness', 'Stroke', `${lineThickness}px`, 0.5, 3, 0.2, lineThickness, (e) => {
                                    const val = parseFloat(e.target.value);
                                    setLineThickness(val);
                                    uSet('shelf_notebook_line_thickness', val);
                                })}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={labelStyle}>Design</span>
                                    <select 
                                        value={lineStyle} 
                                        onChange={(e) => {
                                            setLineStyle(e.target.value);
                                            uSet('shelf_notebook_line_style', e.target.value);
                                        }} 
                                        style={{ ...selectStyle, width: '75px' }}
                                    >
                                        <option value="solid">Solid</option>
                                        <option value="dashed">Dashed</option>
                                        <option value="dotted">Dotted</option>
                                    </select>
                                </div>

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

                            {/* Margins Alignments, Position offset, color */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleImage(); }}
                                    style={getBtnStyle(false)} title="Insert Image"
                                >
                                    <LucideImage size={12} />
                                </button>
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
                            </div>

                            {/* Color Palettes (Pen, Highlight) */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1.5px solid var(--border-color)', paddingRight: '10px' }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pen</span>
                                    {[
                                        { name: 'Dark', value: 'var(--text-primary)' },
                                        { name: 'Rust', value: '#c83f3f' },
                                        { name: 'Forest', value: '#2a6f40' },
                                        { name: 'Blue', value: '#2b5c8f' },
                                        { name: 'Ochre', value: '#b8860b' },
                                        { name: 'Plum', value: '#7b1fa2' }
                                    ].map(color => {
                                        const isActive = isColorActive(activeStyles.foreColor, color.value);
                                        return (
                                            <button
                                                key={color.name}
                                                onMouseDown={(e) => { e.preventDefault(); applyFormat('foreColor', color.value); }}
                                                style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    backgroundColor: color.value === 'var(--text-primary)' ? 'var(--text-primary)' : color.value,
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
                                </div>
                            </div>
                        </div>

                        {/* ROW 4: Find & Replace, Document Locking preferences (Open & Arranged) */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                            {/* Find & Replace Tools */}
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', borderRight: '1.5px solid var(--border-color)', paddingRight: '12px' }}>
                                <span style={labelStyle}>Find</span>
                                <input 
                                    type="text" placeholder="Find..." value={findText} 
                                    onChange={(e) => setFindText(e.target.value)}
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
                            </div>

                            {/* Direct Download & Wipe utilities */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleDownload}
                                    style={{ ...actionBtnStyle, width: 'auto', padding: '4px 10px' }}
                                >
                                    <Download size={11} /> Export TXT
                                </button>
                                <button
                                    onClick={handleClearCanvas}
                                    style={{ ...actionBtnStyle, width: 'auto', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.18)' }}
                                >
                                    <Trash2 size={11} /> Clear Canvas
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Full-Screen contentEditable Workspace (With custom padding margins) */}
                    <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <div
                            ref={modalRef}
                            contentEditable={!readOnly}
                            onInput={handleInput}
                            placeholder="Write your thoughts, paste codes, or draft ideas..."
                            className="scratchpad-editor"
                            spellCheck={spellcheck}
                            autoCapitalize={autoCapitalize ? 'sentences' : 'none'}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                outline: 'none',
                                fontFamily: fontFamily,
                                fontSize: `${baseFontSize}px`,
                                lineHeight: `${lineSpacing}px`,
                                color: 'var(--text-primary)',
                                margin: 0,
                                boxSizing: 'border-box',
                                padding: `20px ${docPadding}px 60px ${docPadding}px`,
                                style: { lineHeight: lineHeight }, // inline height override
                                ...getPaperBackground(paperStyle, lineSpacing, lineOpacity, lineStyle, paperColor, lineThickness),
                                zIndex: 1,
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                transition: 'all 0.15s ease'
                            }}
                        />
                    </div>

                    {/* Footer Status Bar showing statistics */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        gap: '20px',
                        alignItems: 'center',
                        backgroundColor: 'var(--panel-bg)',
                        borderTop: '1.5px solid var(--border-color)',
                        padding: '6px 40px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        opacity: focusMode ? 0.08 : 1,
                        transition: 'opacity 0.3s ease',
                        zIndex: 5
                    }}
                    onMouseEnter={(e) => { if(focusMode) e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={(e) => { if(focusMode) e.currentTarget.style.opacity = 0.08; }}
                    >
                        {showWordCount && <span>{stats.wordCount} words</span>}
                        {showCharCount && <span>{stats.charCount} characters</span>}
                        <span>Reading Time: {Math.ceil(stats.wordCount / 200)} min</span>
                        {readOnly && <span style={{ color: 'var(--danger-color)' }}>Locked (Read-Only)</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
