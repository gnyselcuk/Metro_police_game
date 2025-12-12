'use client';
import { useGameStore } from '@/lib/store';
import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { soundManager } from '@/lib/sound';

export default function LogStream() {
    const { history, settings } = useGameStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Play a short burst of data noise when new log arrives
        if (history.length > 0) {
            const lastEntry = history[history.length - 1];
            // Only play sound for system/assistant messages to avoid echo on user input
            if (lastEntry.role !== 'user') {
                // Play a few random clicks to simulate data stream
                let count = 0;
                const interval = setInterval(() => {
                    soundManager.playKeystroke();
                    count++;
                    if (count > 5) clearInterval(interval);
                }, 50);
            }
        }
    }, [history]);

    const fontSizeClass = {
        small: 'text-[10px] md:text-xs',
        medium: 'text-xs md:text-sm',
        large: 'text-sm md:text-base'
    }[settings.fontSize];

    return (
        <div className={clsx(
            "flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 font-mono scroll-smooth",
            fontSizeClass
        )}>
            {history.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Header Line */}
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-50">
                        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <span>|</span>
                        <span className={clsx(
                            "font-bold",
                            entry.role === 'user' ? "text-blue-400" :
                                entry.role === 'assistant' ? "text-slate-400" :
                                    "text-amber-500"
                        )}>
                            {entry.role === 'user' ? 'DETECTIVE LOG' :
                                entry.role === 'assistant' ? 'OBSERVATION' : 'SYSTEM ALERT'}
                        </span>
                    </div>

                    {/* Content Body */}
                    <div className={clsx(
                        "p-3 border-l-2 leading-relaxed whitespace-pre-wrap",
                        entry.role === 'user' ? "border-blue-500 bg-blue-950/10 text-blue-100" :
                            entry.role === 'assistant' ? "border-slate-600 text-slate-300" :
                                "border-amber-500 bg-amber-950/10 text-amber-200"
                    )}>
                        {entry.content}
                    </div>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
