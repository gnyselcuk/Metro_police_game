'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { clsx } from 'clsx';
import { BoardItem } from '@/types/game';
import { Search, StickyNote, Link as LinkIcon, Pin } from 'lucide-react';

export default function InvestigationBoard({ onClose }: { onClose: () => void }) {
    const { boardItems, boardConnections, updateBoardItem, addBoardConnection, addBoardItem } = useGameStore();
    const constraintsRef = useRef(null);
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDesc, setEditDesc] = useState("");

    // ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editingId) {
                    setEditingId(null); // Close edit mode first if open
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, editingId]);

    const handleItemClick = (id: string) => {
        if (connectingFrom) {
            if (connectingFrom !== id) {
                addBoardConnection(connectingFrom, id);
                setConnectingFrom(null);
            }
        }
    };

    const handleDoubleClick = (item: BoardItem) => {
        if (item.type === 'note') {
            setEditingId(item.id);
            setEditTitle(item.title);
            setEditDesc(item.description || "");
        }
    };

    const saveEdit = () => {
        if (editingId) {
            updateBoardItem(editingId, {
                title: editTitle,
                description: editDesc
            });
            setEditingId(null);
        }
    };

    const startConnection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConnectingFrom(id);
    };

    const addNote = () => {
        const id = `note_${Date.now()}`;
        addBoardItem({
            id,
            type: 'note',
            title: 'New Note',
            description: 'Click to edit...',
            x: window.innerWidth / 2 - 100, // Center of screen
            y: window.innerHeight / 2 - 100,
            rotation: Math.random() * 6 - 3
        });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-stone-900 flex flex-col animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="h-14 bg-stone-800 border-b border-stone-700 flex items-center justify-between px-4 shadow-lg z-50">
                <div className="flex items-center gap-4">
                    <h2 className="text-stone-200 font-bold tracking-widest text-lg hidden md:block flex items-center gap-2"><Search className="w-5 h-5" /> INVESTIGATION BOARD</h2>
                    <div className="h-6 w-px bg-stone-600" />
                    <button
                        onClick={addNote}
                        className="bg-yellow-600 hover:bg-yellow-500 text-yellow-100 px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-2"
                    >
                        <StickyNote className="w-4 h-4" /> <span className="hidden md:inline">ADD NOTE</span>
                    </button>
                    {connectingFrom && (
                        <span className="text-xs text-red-400 animate-pulse font-bold">
                            📍 SELECT TARGET TO CONNECT...
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-stone-400 hover:text-white font-bold text-sm hover:bg-stone-700 px-3 py-1 rounded transition-colors"
                >
                    ✕ CLOSE <span className="hidden md:inline">[ESC]</span>
                </button>
            </div>

            {/* Corkboard Area */}
            <div
                className="flex-1 overflow-hidden relative bg-stone-700"
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 25px 25px, rgba(0,0,0,0.1) 2%, transparent 0%),
                        radial-gradient(circle at 75px 75px, rgba(0,0,0,0.1) 2%, transparent 0%)
                    `,
                    backgroundSize: '100px 100px',
                    backgroundPosition: '0 0, 50px 50px'
                }}
                ref={constraintsRef}
            >

                {/* Empty State */}
                {boardItems.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center text-stone-500 font-mono">
                            <Pin className="w-16 h-16 mb-4 mx-auto" />
                            <div className="text-lg font-bold mb-2">Investigation Board Empty</div>
                            <div className="text-sm opacity-75">Collect evidence or add notes to connect the dots.</div>
                        </div>
                    </div>
                )}

                {/* Connections Layer (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {boardConnections.map(conn => {
                        const from = boardItems.find(i => i.id === conn.fromId);
                        const to = boardItems.find(i => i.id === conn.toId);
                        if (!from || !to) return null;

                        return (
                            <line
                                key={conn.id}
                                x1={from.x + 100} y1={from.y + 60}
                                x2={to.x + 100} y2={to.y + 60}
                                stroke="#ef4444"
                                strokeWidth="3"
                                strokeDasharray="5,5"
                                className="opacity-80"
                            />
                        );
                    })}
                </svg>

                {/* Items Layer */}
                {boardItems.map((item) => (
                    <motion.div
                        key={item.id}
                        drag
                        dragMomentum={false}
                        dragConstraints={constraintsRef}
                        initial={{ x: item.x, y: item.y, rotate: item.rotation }}
                        onDragEnd={(e, info) => {
                            updateBoardItem(item.id, {
                                x: item.x + info.offset.x,
                                y: item.y + info.offset.y
                            });
                        }}
                        onClick={() => handleItemClick(item.id)}
                        onDoubleClick={() => handleDoubleClick(item)}
                        className={clsx(
                            "absolute w-52 p-4 shadow-2xl cursor-grab active:cursor-grabbing group border-2 transition-shadow hover:shadow-2xl hover:z-40",
                            item.type === 'note' ? "bg-yellow-200 text-yellow-900 border-yellow-400" :
                                item.type === 'evidence' ? "bg-white text-slate-900 border-slate-300" :
                                    "bg-stone-100 text-stone-900 border-stone-300"
                        )}
                        style={{
                            zIndex: connectingFrom === item.id ? 50 : 1,
                        }}
                    >
                        {/* Pin */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-600 shadow-lg z-20 border-2 border-red-800" />

                        {/* Content */}
                        <div className="relative z-10 pointer-events-none"> {/* Disable pointer events on content to allow drag */}
                            {item.type === 'character' && (
                                <div className="w-full h-32 bg-stone-300 mb-2 overflow-hidden grayscale contrast-125 border border-stone-400">
                                    <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs font-bold">
                                        SUSPECT PHOTO
                                    </div>
                                </div>
                            )}

                            {item.type === 'evidence' && (
                                <Search className="w-6 h-6 mb-2" />
                            )}

                            {item.type === 'note' && (
                                <StickyNote className="w-6 h-6 mb-2" />
                            )}

                            <h3 className="font-bold text-sm leading-tight mb-1 font-mono uppercase border-b-2 border-current pb-1">
                                {item.title}
                            </h3>
                            <p className="text-[11px] leading-snug opacity-90 font-serif whitespace-pre-wrap">
                                {item.description || 'No description'}
                            </p>
                        </div>

                        {/* Connect Button (Pointer events auto) */}
                        <button
                            onClick={(e) => startConnection(e, item.id)}
                            className="absolute -right-7 top-1/2 -translate-y-1/2 w-6 h-6 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 shadow-lg border-2 border-red-700 pointer-events-auto"
                            title="Draw connection"
                        >
                            <LinkIcon className="w-3 h-3" />
                        </button>
                    </motion.div>
                ))}

            </div>

            {/* Edit Note Modal */}
            {editingId && (
                <div className="absolute inset-0 z-[200] bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-yellow-100 p-6 rounded shadow-2xl w-80 border-4 border-yellow-400 rotate-1">
                        <h3 className="text-yellow-900 font-bold mb-4 uppercase tracking-wider border-b border-yellow-300 pb-2">Edit Note</h3>
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-yellow-50 border border-yellow-300 p-2 mb-2 rounded text-yellow-900 font-bold placeholder:text-yellow-700/50 focus:outline-none focus:border-yellow-500"
                            placeholder="Title..."
                            autoFocus
                        />
                        <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full h-32 bg-yellow-50 border border-yellow-300 p-2 mb-4 rounded text-yellow-900 text-sm font-serif placeholder:text-yellow-700/50 focus:outline-none focus:border-yellow-500 resize-none"
                            placeholder="Write your notes here..."
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 text-yellow-800 hover:bg-yellow-200 rounded text-xs font-bold"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={saveEdit}
                                className="px-4 py-1 bg-yellow-600 text-yellow-100 hover:bg-yellow-700 rounded text-xs font-bold shadow-sm"
                            >
                                SAVE NOTE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
