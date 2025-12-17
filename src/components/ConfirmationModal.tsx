'use client'

import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning' | 'info'
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmationModal({
    isOpen,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel
}: ConfirmationModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 scale-100 animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${variant === 'danger' ? 'bg-red-500/10 text-red-500' :
                        variant === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-blue-500/10 text-blue-500'
                        }`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                            {description}
                        </p>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-all cursor-pointer ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' :
                                    variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20' :
                                        'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'
                                    }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
