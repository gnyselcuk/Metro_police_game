'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface SceneDisplayProps {
    locationId: string;
    locationName: string;
    imageSrc?: string | null;
    characterImageSrc?: string | null;
}

export default function SceneDisplay({ locationId, locationName, imageSrc, characterImageSrc }: SceneDisplayProps) {
    return (
        <div className="relative w-full h-full bg-black overflow-hidden border-b border-slate-800">
            {/* Main Scene Layer */}
            <AnimatePresence mode="wait">
                {imageSrc ? (
                    <motion.img
                        key={imageSrc}
                        src={imageSrc}
                        alt="Scene"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 w-full h-full object-cover opacity-80 grayscale-[10%] contrast-110"
                    />
                ) : (
                    <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center"
                    >
                        <div className="text-slate-700 font-mono text-xs tracking-[0.5em] animate-pulse">
                            NO SIGNAL // {locationId.toUpperCase()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Character Mugshot Overlay */}
            <AnimatePresence>
                {characterImageSrc && (
                    <motion.div
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        className="absolute right-4 top-4 w-32 h-48 md:right-8 md:top-8 md:bottom-8 md:w-64 md:h-auto bg-slate-900/90 border border-slate-700 p-2 shadow-2xl backdrop-blur-sm flex flex-col z-10 pointer-events-auto"
                    >
                        <div className="text-[10px] text-red-500 font-bold mb-1 tracking-widest">SUSPECT ID</div>
                        <div className="flex-1 relative overflow-hidden border border-slate-800 bg-black">
                            <img
                                src={characterImageSrc}
                                alt="Suspect"
                                className="w-full h-full object-cover grayscale contrast-125"
                            />
                            {/* Scanlines overlay */}
                            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-20 pointer-events-none mix-blend-overlay" />
                        </div>
                        <div className="mt-2 text-[9px] text-slate-400 font-mono leading-tight hidden md:block">
                            MATCH: 98.4%<br />
                            DB: METRO_CRIM
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay UI Elements (HUD) */}
            <div className="absolute inset-0 pointer-events-none z-20">
                {/* Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] opacity-50 bg-[length:100%_2px,3px_100%]" />

                {/* Vignette */}
                <div className="absolute inset-0 bg-radial-gradient-to-c from-transparent via-transparent to-black/80" />

                {/* Timestamp & Location */}
                <div className="absolute top-4 left-4 font-mono text-xs text-green-500/80 drop-shadow-md">
                    <div>REC ● {new Date().toLocaleTimeString()}</div>
                    <div className="text-[10px] text-green-500/50 mt-1">CAM-04 // {locationName.toUpperCase()}</div>
                </div>

                {/* Crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-green-500/20 opacity-50" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-green-500/50 rounded-full" />
            </div>
        </div>
    );
}

