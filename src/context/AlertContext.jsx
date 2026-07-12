import React, { createContext, useContext, useState } from 'react';
import CustomAlertModal from '../components/CustomAlertModal';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
        placeholder: '',
        defaultValue: '',
        confirmText: '',
        cancelText: '',
        onConfirm: () => { },
        onCancel: () => { }
    });

    const showModal = (type, title, message, placeholder = '', defaultValue = '', confirmText = '', cancelText = '') => {
        return new Promise((resolve) => {
            setModalConfig({
                isOpen: true,
                type,
                title,
                message,
                placeholder,
                defaultValue,
                confirmText,
                cancelText,
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
    
    const cConfirm = (title, message, confirmText = '', cancelText = '') => 
        showModal('confirm', title, message, '', '', confirmText, cancelText);
        
    const cPrompt = (title, message, placeholder = '', defaultValue = '', confirmText = '', cancelText = '') => 
        showModal('prompt', title, message, placeholder, defaultValue, confirmText, cancelText);

    return (
        <AlertContext.Provider value={{ cAlert, cConfirm, cPrompt }}>
            {children}
            <CustomAlertModal {...modalConfig} />
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
}
