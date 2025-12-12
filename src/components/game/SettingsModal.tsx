'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';
import { soundManager } from '@/lib/sound';
import { clsx } from 'clsx';
import { Settings, Volume, Volume2 } from 'lucide-react';

interface SettingsModalProps {
    onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
    const { settings, updateSettings, exitCase, scenario } = useGameStore();

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        updateSettings({ volume: newVolume });
        soundManager.setVolume(newVolume);
        // Play a test sound to give feedback
        if (Math.random() > 0.8) soundManager.playClick();
    };

    const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
        updateSettings({ fontSize: size });
        soundManager.playClick();
    };

    const handleQuit = () => {
        if (confirm("Mevcut vakadan çıkmak istediğinize emin misiniz? Kaydedilmemiş ilerleme kaybolabilir.")) {
            soundManager.playAlert();
            exitCase();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-md shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-slate-200 font-bold tracking-widest uppercase flex items-center gap-2">
                        <Settings className="w-5 h-5" /> SYSTEM SETTINGS
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">

                    {/* Volume Control */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            VOLUME: {Math.round(settings.volume * 100)}%
                        </label>
                        <div className="flex items-center gap-4">
                            <Volume className="w-5 h-5 text-slate-400" />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.volume}
                                onChange={handleVolumeChange}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <Volume2 className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>

                    {/* Font Size Control */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            FONT SIZE
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleFontSizeChange('small')}
                                className={clsx(
                                    "py-2 border rounded text-xs font-bold transition-all",
                                    settings.fontSize === 'small'
                                        ? "bg-blue-900/50 border-blue-500 text-blue-200"
                                        : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700"
                                )}
                            >
                                SMALL
                            </button>
                            <button
                                onClick={() => handleFontSizeChange('medium')}
                                className={clsx(
                                    "py-2 border rounded text-sm font-bold transition-all",
                                    settings.fontSize === 'medium'
                                        ? "bg-blue-900/50 border-blue-500 text-blue-200"
                                        : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700"
                                )}
                            >
                                MEDIUM
                            </button>
                            <button
                                onClick={() => handleFontSizeChange('large')}
                                className={clsx(
                                    "py-2 border rounded text-base font-bold transition-all",
                                    settings.fontSize === 'large'
                                        ? "bg-blue-900/50 border-blue-500 text-blue-200"
                                        : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700"
                                )}
                            >
                                LARGE
                            </button>
                        </div>
                    </div>

                    {/* Quit Button */}
                    {scenario && (
                        <div className="pt-4 border-t border-slate-800">
                            <button
                                onClick={handleQuit}
                                className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 hover:text-red-200 font-bold tracking-widest uppercase rounded transition-all"
                            >
                                EXIT CASE
                            </button>
                            <p className="text-[10px] text-slate-600 text-center mt-2">
                                WARNING: Unsaved data will be lost.
                            </p>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="bg-slate-950 p-2 text-center">
                    <div className="text-[10px] text-slate-700 font-mono">
                        METRO OS v2.4.1 // BUILD 8492
                    </div>
                </div>
            </div>
        </div>
    );
}
