'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { soundManager } from '@/lib/sound';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2 } from 'lucide-react';

interface CityMapProps {
    onClose: () => void;
}

export default function CityMap({ onClose }: CityMapProps) {
    const { scenario, currentLocationId, setCurrentLocation } = useGameStore();
    const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
    const [currentMapId, setCurrentMapId] = useState<string>('city');

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const mapRef = useRef<HTMLDivElement>(null);

    // Initialize map based on current location
    useEffect(() => {
        if (scenario?.locations[currentLocationId]?.mapId) {
            setCurrentMapId(scenario.locations[currentLocationId].mapId!);
        } else {
            setCurrentMapId('city');
        }
    }, [scenario, currentLocationId]);

    // Reset zoom on map layer change
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [currentMapId]);

    // ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Mouse Wheel Zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = -Math.sign(e.deltaY) * 0.1;
        setScale(prev => Math.min(Math.max(1, prev + delta), 3)); // Min 1x, Max 3x
    };

    // Panning Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleTravel = (locationId: string) => {
        if (locationId === currentLocationId) return;

        soundManager.playClick();
        setCurrentLocation(locationId);
        onClose();
    };

    const handleNodeClick = (targetMapId: string) => {
        soundManager.playClick();
        setCurrentMapId(targetMapId);
    };

    const handleBack = () => {
        if (currentMapLayer?.parentId) {
            soundManager.playClick();
            setCurrentMapId(currentMapLayer.parentId);
        }
    };

    if (!scenario) return null;

    const currentMapLayer = scenario.maps?.[currentMapId];
    // Fallback to old behavior if no maps defined
    const bgImage = currentMapLayer?.image || '/city_map_bg.png';
    const mapName = currentMapLayer?.name || 'METRO CITY';

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl aspect-video bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 pointer-events-none bg-gradient-to-b from-slate-900/80 to-transparent">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-200 tracking-widest uppercase drop-shadow-lg flex items-center gap-2">
                            {currentMapLayer?.parentId && (
                                <button
                                    onClick={handleBack}
                                    className="pointer-events-auto text-slate-400 hover:text-white mr-2 transition-transform hover:-translate-x-1"
                                >
                                    ⬅
                                </button>
                            )}
                            {mapName}
                        </h2>
                        <div className="text-xs text-green-500 font-mono mt-1 animate-pulse">
                            SATELLITE LINK: ACTIVE // LAYER: {currentMapId.toUpperCase()} // ZOOM: {Math.round(scale * 100)}%
                        </div>
                    </div>
                    <div className="flex gap-2 pointer-events-auto">
                        <div className="flex flex-col gap-1 mr-4">
                            <button onClick={() => setScale(s => Math.min(3, s + 0.5))} className="w-6 h-6 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded flex items-center justify-center text-xs">+</button>
                            <button onClick={() => setScale(s => Math.max(1, s - 0.5))} className="w-6 h-6 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded flex items-center justify-center text-xs">-</button>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 px-4 py-2 rounded border border-slate-700 transition-colors font-bold text-xs tracking-wider h-fit"
                        >
                            CLOSE [ESC]
                        </button>
                    </div>
                </div>

                {/* Map Viewport */}
                <div
                    className="relative w-full h-full overflow-hidden cursor-move"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    ref={mapRef}
                >
                    <div
                        className="absolute inset-0 w-full h-full transition-transform duration-100 ease-out origin-center"
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
                        }}
                    >
                        {/* Map Background */}
                        <div className="absolute inset-0">
                            <img
                                src={bgImage}
                                alt="Map Layer"
                                className="w-full h-full object-cover opacity-60 grayscale-[20%] contrast-125 mix-blend-screen"
                                draggable={false}
                            />
                            <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply" />
                        </div>

                        {/* Map Content (Pins) */}
                        <div className="absolute inset-0 p-12">
                            {/* 1. Render Navigation Nodes */}
                            {currentMapLayer?.nodes?.map((node) => (
                                <div
                                    key={node.id}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node.targetMapId); }}
                                    onMouseEnter={() => {
                                        setHoveredLocation(node.id);
                                        soundManager.playKeystroke();
                                    }}
                                    onMouseLeave={() => setHoveredLocation(null)}
                                >
                                    <div className="w-12 h-12 flex items-center justify-center" style={{ transform: `scale(${1 / scale})` }}>
                                        <div className="absolute inset-0 border-2 border-blue-500/50 rounded-full animate-ping" />
                                        <div className="relative w-8 h-8 bg-blue-900/80 border border-blue-400 rounded flex items-center justify-center text-lg shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">
                                            <Building2 className="w-4 h-4 text-blue-200" />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {hoveredLocation === node.id && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded border border-blue-500 bg-blue-900/90 text-blue-100 text-xs font-bold whitespace-nowrap z-20 pointer-events-none"
                                                style={{ transform: `scale(${1 / scale})` }}
                                            >
                                                {node.name.toUpperCase()}
                                                <span className="block text-[9px] text-blue-300 font-normal">ENTER [CLICK]</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}

                            {/* 2. Render Locations */}
                            {Object.values(scenario.locations).map((loc) => {
                                if (scenario.maps && loc.mapId !== currentMapId) return null;

                                const x = (loc as any).coordinates?.x || 50;
                                const y = (loc as any).coordinates?.y || 50;
                                const isCurrent = loc.id === currentLocationId;
                                const isHovered = hoveredLocation === loc.id;

                                return (
                                    <div
                                        key={loc.id}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                        style={{ left: `${x}%`, top: `${y}%` }}
                                        onClick={(e) => { e.stopPropagation(); handleTravel(loc.id); }}
                                        onMouseEnter={() => {
                                            setHoveredLocation(loc.id);
                                            soundManager.playKeystroke();
                                        }}
                                        onMouseLeave={() => setHoveredLocation(null)}
                                    >
                                        <div className={clsx(
                                            "relative flex items-center justify-center transition-all duration-300",
                                            isCurrent ? "w-8 h-8" : "w-4 h-4 group-hover:w-6 group-hover:h-6"
                                        )} style={{ transform: `scale(${1 / scale})` }}>
                                            <div className={clsx(
                                                "absolute inset-0 rounded-full animate-ping opacity-75",
                                                isCurrent ? "bg-green-500" : "bg-slate-500 group-hover:bg-green-500"
                                            )} />
                                            <div className={clsx(
                                                "relative rounded-full shadow-lg border-2 z-10 w-full h-full",
                                                isCurrent
                                                    ? "bg-green-600 border-green-300 shadow-green-500/50"
                                                    : "bg-slate-800 border-slate-500 group-hover:bg-green-600 group-hover:border-green-300 group-hover:shadow-green-500/50"
                                            )} />
                                        </div>

                                        <AnimatePresence>
                                            {(isHovered || isCurrent) && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className={clsx(
                                                        "absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded border text-xs font-bold whitespace-nowrap z-20 pointer-events-none",
                                                        isCurrent
                                                            ? "bg-green-900/90 border-green-500 text-green-100"
                                                            : "bg-slate-900/90 border-slate-600 text-slate-200"
                                                    )}
                                                    style={{ transform: `scale(${1 / scale})` }}
                                                >
                                                    {loc.name.toUpperCase()}
                                                    {isCurrent && <span className="block text-[9px] text-green-300 font-normal">CURRENT LOCATION</span>}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Radar Scan Effect (Fixed on screen) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div className="absolute w-full h-[2px] bg-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-[scan_4s_linear_infinite]" />
                </div>

                {/* Footer Legend */}
                <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] font-mono text-slate-500 pointer-events-none bg-slate-900/80 p-2 rounded border border-slate-800 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>CURRENT LOCATION</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                        <span>KNOWN LOCATION</span>
                    </div>
                    {currentMapLayer?.nodes && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded bg-blue-500 border border-blue-300" />
                            <span>BUILDING ENTRANCE</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
