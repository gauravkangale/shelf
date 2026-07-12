import React, { useState, useEffect, useRef } from 'react';
import {
    Copy, Maximize2, X, Check, Bold, Italic, Underline,
    Undo, Redo, Heading1, Heading2, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
    Link, Image as LucideImage, Eraser, Download, Trash2,
    Calendar, CheckSquare, Code, Quote, Table, RotateCcw,
    Upload, Sliders, Palette, Eye, EyeOff
} from 'lucide-react';
import { uGet, uSet, userKey } from '../utils/userKey';
import { getScratchpadContent, setScratchpadContent } from '../utils/scratchpadStore';
import CustomAlertModal from './CustomAlertModal';

export default function NotebookScratchpad() {
    const [content, setContent] = useState(() => {
        try {
            const key = userKey('shelf_notebook_scratchpad_html');
            return localStorage.getItem(key) || '';
        } catch {
            return '';
        }
    });
    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeColorPicker, setActiveColorPicker] = useState(null); // 'sheet' | 'pen' | 'highlight' | null

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
    const penColorInputRef = useRef(null);
    const highlightColorInputRef = useRef(null);
    const sheetColorInputRef = useRef(null);
    const [showMoreSettings, setShowMoreSettings] = useState(false);
    const [activeImageElement, setActiveImageElement] = useState(null);
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
        placeholder: '',
        defaultValue: '',
        onConfirm: () => { },
        onCancel: () => { }
    });

    const showModal = (type, title, message, placeholder = '', defaultValue = '') => {
        return new Promise((resolve) => {
            setModalConfig({
                isOpen: true,
                type,
                title,
                message,
                placeholder,
                defaultValue,
                onConfirm: (val) => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    resolve(val);
                },
                onCancel: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    resolve(null);
                }
            });
        });
    };

    const cAlert = (title, message) => showModal('alert', title, message);
    const cConfirm = (title, message) => showModal('confirm', title, message);
    const cPrompt = (title, message, placeholder = '', defaultValue = '') => showModal('prompt', title, message, placeholder, defaultValue);

    const highlightSearchQuery = (element, query) => {
        removeSearchHighlights(element);
        if (!query) return;

        const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');

        const traverse = (node) => {
            if (node.nodeType === 3) { // Text node
                const text = node.nodeValue;
                if (regex.test(text)) {
                    const span = document.createElement('span');
                    span.className = 'find-highlight';
                    span.innerHTML = text.replace(regex, '<mark style="background-color: #fef08a; color: #1e293b; padding: 1px 2px; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">$1</mark>');
                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === 1 && node.childNodes && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.nodeName) && node.className !== 'find-highlight') {
                for (let i = node.childNodes.length - 1; i >= 0; i--) {
                    traverse(node.childNodes[i]);
                }
            }
        };

        traverse(element);
    };

    const removeSearchHighlights = (element) => {
        if (!element) return;
        const highlights = element.querySelectorAll('.find-highlight');
        highlights.forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                const textNode = document.createTextNode(span.innerText);
                parent.replaceChild(textNode, span);
                parent.normalize();
            }
        });
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
        return clone.innerHTML;
    };

    useEffect(() => {
        const activeRef = isExpanded ? modalRef : inlineRef;
        if (activeRef.current) {
            highlightSearchQuery(activeRef.current, findText);
        }
    }, [findText, isExpanded]);

    // Sync content and styles if modified elsewhere
    useEffect(() => {
        const handleSync = async () => {
            const key = userKey('shelf_notebook_scratchpad_html');
            const savedContent = await getScratchpadContent(key);
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
        window.addEventListener('user-switched', handleSync);

        handleSync();

        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('notebook-updated', handleSync);
            window.removeEventListener('user-switched', handleSync);
        };
    }, []);

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
        const html = getCleanHTML(e.currentTarget);
        setContent(html);
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
            } catch (err) { }
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
                    cAlert('Text Not Found', `Could not find "${findText}" in document.`);
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
        }
    };

    const handleKeyDown = (e) => {
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
        cConfirm('Clear Canvas', 'Are you sure you want to clear all contents of the canvas?').then((confirmed) => {
            if (confirmed) {
                setContent('');
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
        const lineColorStr = `rgba(148, 163, 184, ${opacityDecimal})`;
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

    const textPaddingInline = paperStyle === 'lines' ? '12px 12px 12px 48px' : '12px 12px 12px 16px';
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

    return (
        <div style={{ display: 'flex', flex: 1, height: '110px', position: 'relative' }}>
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
                    contentEditable={!readOnly}
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
                        wordBreak: 'break-word',
                        zIndex: 1,
                        '--print-spacing': `${inlineSpacing}px`,
                        '--print-thickness': `${inlineThickness}px`,
                        '--print-opacity': `${inlineOpacity / 100}`
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

                                    {/* Custom Pen Color Picker Popover */}
                                    <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); setActiveColorPicker(activeColorPicker === 'pen' ? null : 'pen'); }}
                                            style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                background: 'conic-gradient(red, yellow, green, cyan, blue, magenta, red)',
                                                border: activeStyles.foreColor && !['rgb(0, 0, 0)', 'var(--text-primary)', '#c83f3f', '#2a6f40', '#2b5c8f', '#b8860b', '#7b1fa2'].some(val => isColorActive(activeStyles.foreColor, val)) ? '1.8px solid var(--accent-color)' : '1px solid var(--border-color)',
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
                                                            value={rgbToHex(activeStyles.foreColor)}
                                                            onChange={(e) => applyFormat('foreColor', e.target.value)}
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
                                                        value={rgbToHex(activeStyles.foreColor)}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                                                            applyFormat('foreColor', val);
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
                                            onMouseDown={(e) => { e.preventDefault(); setActiveColorPicker(activeColorPicker === 'highlight' ? null : 'highlight'); }}
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
                                                            value={rgbToHex(activeStyles.backColor)}
                                                            onChange={(e) => applyFormat('backColor', e.target.value)}
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
                                                        value={rgbToHex(activeStyles.backColor)}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                                                            applyFormat('backColor', val);
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

                        {/* ROW 4: Find & Replace, Document Locking preferences (Open & Arranged) */}
                        <div style={{ display: 'flex', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
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
                                <div style={{ display: 'flex', gap: '8px' }}>
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
                                                bottom: 'calc(100% + 4px)',
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
                        <div
                            ref={setModalRef}
                            contentEditable={!readOnly}
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
                                transition: 'all 0.15s ease',
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

            <CustomAlertModal {...modalConfig} />
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
                onMouseDown={(e) => e.preventDefault()}
            >
                <span style={{ fontSize: '0.68rem', fontWeight: 'bold', minWidth: '32px', fontFamily: 'monospace' }}>
                    {numericWidth}px
                </span>
                <input
                    type="range"
                    min="60"
                    max="800"
                    value={numericWidth}
                    onChange={(e) => onChangeSize(`${e.target.value}px`, null)}
                    style={{ width: '100px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                />
                <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                        onClick={() => onChangeSize('150px', null)}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', border: 'none', borderRadius: '4px', background: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        S
                    </button>
                    <button
                        onClick={() => onChangeSize('300px', null)}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', border: 'none', borderRadius: '4px', background: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        M
                    </button>
                    <button
                        onClick={() => onChangeSize('500px', null)}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', border: 'none', borderRadius: '4px', background: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        L
                    </button>
                    <button
                        onClick={() => onChangeSize('100%', 'auto')}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', border: 'none', borderRadius: '4px', background: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Full
                    </button>
                </div>
                <button
                    onClick={onClose}
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
