'use client';

import React from 'react';
import { SolvedCase } from '@/types/game';
import { soundManager } from '@/lib/sound';

interface CaseClosedProps {
    data: SolvedCase;
    onClose: () => void;
}

export default function CaseClosed({ data, onClose }: CaseClosedProps) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-1000">
            <div className="max-w-3xl w-full relative perspective-1000">

                {/* Newspaper Container */}
                <div className="bg-[#f4e4bc] text-black p-8 shadow-2xl rotate-1 animate-in zoom-in slide-in-from-bottom-10 duration-1000 delay-300 origin-bottom" style={{
                    fontFamily: '"Playfair Display", serif',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    {/* Paper Texture */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }}></div>

                    {/* Header */}
                    <div className="border-b-4 border-black pb-4 mb-6 text-center">
                        <div className="flex justify-between items-center border-b border-black pb-2 mb-2 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                            <span>Metro City Chronicle</span>
                            <span>{new Date().toLocaleDateString()}</span>
                            <span>Price: $1.50</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-2 transform scale-y-110">
                            METRO GAZETTE
                        </h1>
                    </div>

                    {/* Headline */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl md:text-4xl font-bold uppercase leading-tight mb-4 border-y-2 border-black py-4">
                            {data.headline}
                        </h2>
                    </div>

                    {/* Content */}
                    <div className="columns-1 md:columns-2 gap-8 text-justify text-sm leading-relaxed border-b border-black pb-8 mb-8">
                        <p className="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:mt-[-10px]">
                            {data.story}
                        </p>
                    </div>

                    {/* Footer / Action */}
                    <div className="text-center">
                        <button
                            onClick={() => {
                                soundManager.playClick();
                                onClose();
                            }}
                            className="bg-red-700 hover:bg-red-800 text-white font-sans font-bold py-3 px-8 rounded shadow-lg uppercase tracking-widest transition-transform hover:scale-105"
                        >
                            Archive File and Exit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
