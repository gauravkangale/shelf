import React, { useState } from 'react';
import { AlertCircle, HelpCircle, Link2, Image, RotateCcw, Trash2 } from 'lucide-react';

export default function CustomAlertModal({
    isOpen,
    type, // 'alert' | 'confirm' | 'prompt'
    title,
    message,
    placeholder = '',
    defaultValue = '',
    onConfirm,
    onCancel
}) {
    const [inputValue, setInputValue] = useState(defaultValue);

    if (!isOpen) return null;

    const getIcon = () => {
        const lowerTitle = title?.toLowerCase() || '';
        if (lowerTitle.includes('link')) return <Link2 size={20} style={{ color: 'var(--accent-color)' }} />;
        if (lowerTitle.includes('image')) return <Image size={20} style={{ color: 'var(--accent-color)' }} />;
        if (lowerTitle.includes('clear')) return <Trash2 size={20} style={{ color: 'var(--danger-color)' }} />;
        if (lowerTitle.includes('reset')) return <RotateCcw size={20} style={{ color: 'var(--danger-color)' }} />;
        if (type === 'confirm') return <HelpCircle size={20} style={{ color: 'var(--accent-color)' }} />;
        return <AlertCircle size={20} style={{ color: 'var(--accent-color)' }} />;
    };

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                animation: 'notebookFullScreenOpen 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={onCancel}
        >
            <div 
                style={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '24px',
                    width: '380px',
                    maxWidth: '90%',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--option-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        {getIcon()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {title}
                        </h4>
                        {message && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {message}
                            </span>
                        )}
                    </div>
                </div>

                {/* Input for prompts */}
                {type === 'prompt' && (
                    <input 
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholder}
                        autoFocus
                        style={{
                            width: '100%',
                            height: '36px',
                            padding: '0 12px',
                            border: '1.5px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--surface-bg)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.15s ease'
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onConfirm(inputValue);
                            }
                        }}
                    />
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                    {(type === 'confirm' || type === 'prompt') && (
                        <button 
                            onClick={onCancel}
                            style={{
                                padding: '8px 16px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                borderRadius: '8px',
                                border: '1.5px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--option-bg)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                        >
                            Cancel
                        </button>
                    )}
                    <button 
                        onClick={() => onConfirm(type === 'prompt' ? inputValue : true)}
                        style={{
                            padding: '8px 16px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            borderRadius: '8px',
                            border: 'none',
                            background: title?.toLowerCase().includes('clear') || title?.toLowerCase().includes('reset') ? 'var(--danger-color)' : 'var(--accent-color)',
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'filter 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                    >
                        {type === 'alert' ? 'OK' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
