'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import case001 from '@/data/cases/case_001.json';
import { Scenario } from '@/types/game';
import { soundManager } from '@/lib/sound';

export default function MainMenu() {
    const { userProfile, login, loadScenario } = useGameStore();
    const [nameInput, setNameInput] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (nameInput.trim()) {
            soundManager.playClick();
            login(nameInput.trim());
        }
    };

    const handleStartCase = () => {
        soundManager.playClick();
        loadScenario(case001 as unknown as Scenario);
    };

    if (!userProfile) {
        return (
            <div className="flex flex-col items-center justify-center h-dvh w-full bg-black text-slate-200 font-mono p-4 relative overflow-hidden">
                {/* Background Effect */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #000000 100%)'
                }}></div>

                <div className="z-10 w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="text-center space-y-2">
                        <div className="w-20 h-20 bg-slate-900 rounded-full mx-auto flex items-center justify-center border-2 border-slate-700 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <span className="text-4xl">🕵️‍♂️</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-widest text-slate-100">METRO POLICE</h1>
                        <p className="text-sm text-slate-500 tracking-widest uppercase">Detective Database Access</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4 bg-slate-900/50 p-8 rounded-xl border border-slate-800 shadow-2xl backdrop-blur-sm">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Authentication</label>
                            <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="ENTER DETECTIVE NAME..."
                                className="w-full bg-black/50 border border-slate-700 rounded p-3 text-center text-lg tracking-wider focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-700"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!nameInput.trim()}
                            className="w-full bg-blue-900 hover:bg-blue-800 text-blue-100 font-bold py-3 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest border border-blue-800 hover:border-blue-600 shadow-[0_0_20px_rgba(30,58,138,0.3)]"
                        >
                            Login to System
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-dvh w-full bg-slate-950 text-slate-200 font-mono overflow-hidden">
            {/* Sidebar / Profile */}
            <aside className="w-full md:w-80 h-auto md:h-full bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col z-10 shadow-2xl shrink-0 max-h-[40vh] md:max-h-none overflow-y-auto md:overflow-visible">
                <div className="p-8 border-b border-slate-800 bg-slate-900/50">
                    <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-slate-700 shadow-inner">
                        <span className="text-5xl">👮‍♂️</span>
                    </div>
                    <h2 className="text-xl font-bold text-center text-white mb-1">{userProfile.name}</h2>
                    <div className="text-center text-xs text-blue-400 font-bold tracking-widest uppercase mb-4">
                        Level {userProfile.level} Detective
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 border-t border-slate-800 pt-4">
                        <span>Cases Solved:</span>
                        <span className="font-bold text-white">{userProfile.solvedCases.length}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 pl-2">Case Archive</h3>
                    {userProfile.solvedCases.length === 0 ? (
                        <div className="text-center py-8 text-slate-600 text-xs border border-dashed border-slate-800 rounded">
                            No files found in archive.
                        </div>
                    ) : (
                        userProfile.solvedCases.map((c) => (
                            <div key={c.caseId} className="bg-slate-800 p-4 rounded border border-slate-700 hover:border-slate-500 transition-colors group cursor-pointer relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-green-900/50 text-green-400 text-[9px] px-2 py-1 font-bold uppercase rounded-bl">Solved</div>
                                <h4 className="font-bold text-sm text-slate-200 mb-1">{c.caseTitle}</h4>
                                <div className="text-[10px] text-slate-500 mb-2">{new Date(c.date).toLocaleDateString()}</div>
                                <div className="text-xs text-slate-400 font-serif italic line-clamp-2">"{c.headline}"</div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => window.location.reload()} className="w-full py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors uppercase tracking-wider">
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content / Scenario Selection */}
            <main className="flex-1 p-4 md:p-12 overflow-y-auto relative">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}></div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <header className="mb-12">
                        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Active Cases</h1>
                        <p className="text-slate-400">Open investigation files awaiting assignment.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Case Card */}
                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all group">
                            <div className="h-40 bg-slate-800 relative overflow-hidden">
                                {/* Placeholder for case image */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80"></div>
                                <div className="absolute bottom-4 left-4">
                                    <div className="text-xs font-bold bg-red-600 text-white px-2 py-1 rounded inline-block mb-2 shadow-lg">HOMICIDE</div>
                                    <h3 className="text-2xl font-bold text-white shadow-black drop-shadow-lg">{case001.title}</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                    {case001.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-slate-500">
                                        Difficulty: <span className="text-amber-400">⭐⭐⭐</span>
                                    </div>
                                    <button
                                        onClick={handleStartCase}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-blue-900/20 group-hover:scale-105 transform duration-200"
                                    >
                                        TAKE CASE
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Coming Soon Card */}
                        <div className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800 border-dashed flex items-center justify-center min-h-[300px] opacity-50">
                            <div className="text-center">
                                <span className="text-4xl mb-4 block">🔒</span>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">New Cases Coming Soon</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
