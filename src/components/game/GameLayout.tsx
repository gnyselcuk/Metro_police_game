'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import case001 from '@/data/cases/case_001.json';
import SceneDisplay from './SceneDisplay';
import LogStream from './LogStream';
import InvestigationBoard from './InvestigationBoard';
import { Scenario } from '@/types/game';
import { clsx } from 'clsx';
import { processAction, processDialogue, analyzeEvidence, generateFiboScene } from '@/app/actions';
import { soundManager } from '@/lib/sound';
import CaseClosed from './CaseClosed';
import SettingsModal from './SettingsModal';
import CityMap from './CityMap';
import { Folder, Microscope, Users, Scale, Pin, Map, Settings as SettingsIcon, Mic, MicOff, Search, ShieldAlert, Headphones, DollarSign } from 'lucide-react';

export default function GameLayout() {
    const { loadScenario, addLog, inventory, scenario, currentLocationId, activeCharacterId, setActiveCharacter, setSuggestions, knownCharacterIds, suspectIds, markSuspect, unmarkSuspect, addCharacter, completeCase, exitCase, isProcessing, setProcessing, notifications, setNotification, addVisualToHistory, visualHistory } = useGameStore();
    const [inputMode, setInputMode] = useState<'action' | 'dialogue'>('action');
    const [sidebarTab, setSidebarTab] = useState<'evidence' | 'lab' | 'da' | 'dossiers'>('evidence');
    const [daMessage, setDaMessage] = useState<string>("Investigation protocols active...");
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [currentSeed, setCurrentSeed] = useState<number | null>(null);
    const [characterImage, setCharacterImage] = useState<string | null>(null);
    const [isBoardOpen, setIsBoardOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<{ id: string, itemName: string, content: string, timestamp: number } | null>(null);
    const [daAction, setDaAction] = useState<'arrest' | 'wiretap' | 'search' | 'financial' | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [solvedCaseData, setSolvedCaseData] = useState<{ headline: string, story: string } | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const handleTabChange = (tab: 'evidence' | 'lab' | 'da' | 'dossiers') => {
        if (sidebarTab === tab && isPanelOpen) {
            setIsPanelOpen(false);
        } else {
            setSidebarTab(tab);
            setIsPanelOpen(true);
            setNotification(tab, false);
        }
        soundManager.playClick();
    };
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'tr-TR';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (inputRef.current) {
                    inputRef.current.value = transcript;
                    inputRef.current.focus();
                }
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech error", event.error);
                setIsListening(false);

                let errorMessage = "Speech recognition error.";
                if (event.error === 'network') {
                    errorMessage = "Network Error: Web Speech API requires internet connection. Try using Chrome.";
                } else if (event.error === 'not-allowed') {
                    errorMessage = "Microphone permission denied.";
                } else if (event.error === 'no-speech') {
                    return; // Ignore no-speech errors (just silence)
                }

                addLog({
                    id: Date.now().toString(),
                    role: 'system',
                    content: `MICROPHONE ERROR: ${errorMessage}`,
                    timestamp: Date.now()
                });
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            addLog({
                id: Date.now().toString(),
                role: 'system',
                content: "Your browser does not support voice input.",
                timestamp: Date.now()
            });
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            soundManager.playClick();
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    useEffect(() => {
        // Load the demo case on mount
        loadScenario(case001 as unknown as Scenario);

        // Set initial image if available (Intro Image)
        // Initial image will be generated by the location effect
        // if (case001.introImage) {
        //     setCurrentImage(case001.introImage);
        // }
    }, []);

    // Generate Character Image when active character changes
    useEffect(() => {
        if (activeCharacterId && scenario) {
            const char = scenario.characters[activeCharacterId];
            if (char) {
                setCharacterImage(null); // Reset previous image
                soundManager.playScan();

                // Use FIBO if character has visuals defined
                if (char.visuals) {
                    generateFiboScene(char.visuals, undefined, "3:4").then((result: any) => {
                        if (result && result.image) {
                            console.log("CHARACTER FIBO GENERATED");
                            setCharacterImage(result.image);
                            soundManager.playScan();
                        }
                    });
                } else {
                    // Fallback: No dynamic generation, use static image if available
                    // Or we could generate a placeholder
                    console.log("No visuals for character:", char.name);
                }
            }
        } else {
            setCharacterImage(null);
        }
    }, [activeCharacterId, scenario]);

    // Cache for generated images to avoid re-generating
    const imageCache = useRef<Record<string, { image: string, seed: number }>>({});

    // Track ongoing requests to prevent duplicates
    const loadingRef = useRef<Set<string>>(new Set());

    // Flag to skip useEffect when newLocationVisuals handler generates the image
    const skipNextLocationEffect = useRef<string | null>(null);

    // Generate Scene Image when location changes (FIBO Integration)
    useEffect(() => {
        if (scenario && currentLocationId) {
            const location = scenario.locations[currentLocationId];

            // Skip if newLocationVisuals handler already processed this location
            if (skipNextLocationEffect.current === currentLocationId) {
                console.log(`Skipping useEffect for ${currentLocationId} - already handled by newLocationVisuals`);
                skipNextLocationEffect.current = null;
                return;
            }

            // Check cache first
            if (imageCache.current[currentLocationId]) {
                const cached = imageCache.current[currentLocationId];
                setCurrentImage(cached.image);
                setCurrentSeed(cached.seed);
                return;
            }

            // Check if already loading
            if (loadingRef.current.has(currentLocationId)) {
                console.log(`Already loading image for ${currentLocationId}, skipping duplicate request`);
                return;
            }

            // If location has FIBO visuals, generate dynamic image
            if (location && location.visuals) {
                setCurrentImage(null); // Show loading state
                soundManager.playScan();

                // Mark as loading
                loadingRef.current.add(currentLocationId);

                // Use the visuals directly - they should already be in FIBO format
                generateFiboScene(location.visuals, undefined, "16:9").then(result => {
                    if (result && result.image) {
                        console.log("FIBO SCENE GENERATED", result.seed);
                        setCurrentImage(result.image);
                        setCurrentSeed(result.seed || null);

                        // Cache the result
                        imageCache.current[currentLocationId] = {
                            image: result.image,
                            seed: result.seed || 0
                        };

                        // Track visual history for consistency
                        addVisualToHistory({
                            locationId: currentLocationId,
                            action: 'location_view',
                            visuals: location.visuals || {},
                            imageUrl: result.image,
                            seed: result.seed || null
                        });

                        soundManager.playScan();
                    }
                }).finally(() => {
                    // Remove from loading set
                    loadingRef.current.delete(currentLocationId);
                });
            } else {
                // No FIBO visuals defined - fallback to static image if available
                // No FIBO visuals defined - do nothing or log warning. No static fallback.
                console.warn(`No visuals at all for location: ${currentLocationId}`);
                setCurrentImage(null);
            }
        }
    }, [currentLocationId]); // Only depend on currentLocationId, not scenario

    const handleAnalyze = async (item: { id: string, name: string }) => {
        if (analyzingId) return;
        soundManager.playClick();
        setAnalyzingId(item.id);

        addLog({
            id: Date.now().toString(),
            role: 'system',
            content: `Sending evidence [${item.name.toUpperCase()}] to Forensics Lab...`,
            timestamp: Date.now()
        });

        soundManager.playScan();

        try {
            const currentState = useGameStore.getState();
            const result = await analyzeEvidence(item.id, item.name, currentState.scenario!);

            soundManager.playAlert();
            const report = {
                id: Date.now().toString(),
                itemName: item.name,
                content: result.report,
                timestamp: Date.now()
            };

            useGameStore.getState().addLabReport(report);

            // Removed chat log for report to keep it realistic and only in the file system
            addLog({
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: `FORENSICS: Analysis complete for [${item.name.toUpperCase()}]. Report added to file.`,
                timestamp: Date.now()
            });
        } catch (error) {
            addLog({
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: "Forensics Lab connection timeout.",
                timestamp: Date.now()
            });
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {

        e.preventDefault();
        if (isProcessing) return;

        soundManager.playClick();
        const form = e.currentTarget;
        const input = form.elements.namedItem('command') as HTMLInputElement;
        if (!input.value.trim()) return;

        const content = input.value;
        setProcessing(true);

        // Visual feedback for the user
        addLog({
            id: Date.now().toString() + Math.random().toString(36).substring(2),
            role: 'user',
            content: inputMode === 'dialogue' ? `"${content}"` : content,
            timestamp: Date.now()
        });

        // Call Server Action
        try {
            const currentState = useGameStore.getState();

            if (inputMode === 'action') {
                const response = await processAction(content, currentState, currentState.scenario!);

                // 1. Show Narrative
                addLog({
                    id: Date.now().toString() + Math.random().toString(36).substring(2),
                    role: 'assistant',
                    content: response.data.narrative,
                    timestamp: Date.now()
                });

                // 1.5 Check for Case Solved
                if (response.data.caseSolved && response.data.caseSolved.isSolved) {
                    soundManager.playAlert(); // Victory sound?
                    setSolvedCaseData({
                        headline: response.data.caseSolved.headline,
                        story: response.data.caseSolved.story
                    });
                    return; // Stop processing other things
                }


                // 2. DA Feedback
                if (response.data.daFeedback) {
                    setDaMessage(response.data.daFeedback);
                    setNotification('da', true);
                    soundManager.playAlert();
                }

                // 3. Update Suggestions
                if (response.data.suggestions) {
                    setSuggestions(response.data.suggestions);
                }

                // 3.5 Handle New Characters (Dynamic Creation)
                if (response.data.newCharacters && Array.isArray(response.data.newCharacters)) {
                    response.data.newCharacters.forEach((char: any) => {
                        useGameStore.getState().addCharacter(char);
                    });
                }

                // 3.6 Handle New Location Visuals (Dynamic FIBO Integration)
                // This handler creates the location AND generates the image (single source of truth)
                if (response.data.newLocationVisuals && response.data.newLocationVisuals.locationId) {
                    const { locationId, visuals } = response.data.newLocationVisuals;
                    const currentState = useGameStore.getState();

                    if (currentState.scenario && visuals) {
                        // IMMEDIATELY add to loadingRef and set skip flag to prevent useEffect from also generating
                        loadingRef.current.add(locationId);
                        skipNextLocationEffect.current = locationId;

                        // Check if location exists, if not create it
                        if (!currentState.scenario.locations[locationId]) {
                            currentState.scenario.locations[locationId] = {
                                id: locationId,
                                name: locationId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                                description: visuals.short_description || "A dynamically discovered location.",
                                mapId: "dynamic",
                                visuals: visuals,
                                interactables: [],
                                connections: [currentState.currentLocationId]
                            };
                            console.log("DYNAMIC LOCATION CREATED:", locationId);
                        } else {
                            currentState.scenario.locations[locationId].visuals = visuals;
                            console.log("LOCATION VISUALS UPDATED:", locationId);
                        }

                        // Generate image now (useEffect will skip because loadingRef contains this locationId)
                        if (!imageCache.current[locationId]) {
                            setCurrentImage(null);
                            generateFiboScene(visuals, undefined, "16:9").then(result => {
                                if (result && result.image) {
                                    console.log("DYNAMIC LOCATION VISUAL GENERATED (from handler)", result.seed);
                                    setCurrentImage(result.image);
                                    setCurrentSeed(result.seed || null);
                                    imageCache.current[locationId] = {
                                        image: result.image,
                                        seed: result.seed || 0
                                    };
                                    addVisualToHistory({
                                        locationId: locationId,
                                        action: 'dynamic_location',
                                        visuals: visuals,
                                        imageUrl: result.image,
                                        seed: result.seed || null
                                    });
                                }
                            }).finally(() => {
                                loadingRef.current.delete(locationId);
                            });
                        } else {
                            // Already cached, use it
                            setCurrentImage(imageCache.current[locationId].image);
                            setCurrentSeed(imageCache.current[locationId].seed);
                            loadingRef.current.delete(locationId);
                        }
                    }
                }

                // 4. Apply State Changes
                if (response.data.newState) {
                    const { currentLocationId, addToInventory, activeCharacterId: newActiveCharId, metCharacters } = response.data.newState;

                    if (currentLocationId) {
                        useGameStore.getState().setCurrentLocation(currentLocationId);
                        // Only reset image if not cached (prevents flicker for revisited locations)
                        if (!imageCache.current[currentLocationId]) {
                            setCurrentImage(null);
                        } else {
                            // Use cached image immediately
                            setCurrentImage(imageCache.current[currentLocationId].image);
                            setCurrentSeed(imageCache.current[currentLocationId].seed);
                        }
                    }

                    if (addToInventory) {
                        useGameStore.getState().addToInventory(addToInventory);
                        soundManager.playAlert(); // Item found sound
                    }

                    if (metCharacters && Array.isArray(metCharacters)) {
                        metCharacters.forEach(id => useGameStore.getState().meetCharacter(id));
                    }

                    if (newActiveCharId) {
                        setActiveCharacter(newActiveCharId);
                        setInputMode('dialogue'); // Auto-switch to dialogue mode
                    }

                    if (response.data.newState.analyzeItem) {
                        const itemName = response.data.newState.analyzeItem;
                        const tempId = `improvised_${Date.now()}_${itemName.replace(/\s+/g, '_').toLowerCase()}`;
                        await handleAnalyze({
                            id: tempId,
                            name: itemName
                        });
                    }
                }

                // 5. Handle Visual Refinement (FIBO) - Generate Close-up or use LLM-provided visuals
                if (response.data.visualRefinement && scenario && currentLocationId) {
                    const { targetObject, visuals: refinementVisuals, modifications } = response.data.visualRefinement;
                    const location = scenario.locations[currentLocationId];

                    // If LLM provided full visuals, use them directly
                    if (refinementVisuals && refinementVisuals.short_description) {
                        console.log("GENERATING VISUAL FROM LLM REFINEMENT", targetObject);
                        setCurrentImage(null);

                        generateFiboScene(refinementVisuals, currentSeed || undefined, "1:1").then(result => {
                            if (result && result.image) {
                                setCurrentImage(result.image);
                                setCurrentSeed(result.seed || null);
                                soundManager.playScan();

                                // Track in visual history
                                addVisualToHistory({
                                    locationId: currentLocationId,
                                    action: `examine_${targetObject}`,
                                    visuals: refinementVisuals,
                                    imageUrl: result.image,
                                    seed: result.seed || null
                                });
                            }
                        });
                    }
                    // Fallback: Generate close-up from existing location visuals
                    else if (location && location.visuals && location.visuals.objects && currentSeed) {
                        const targetObj = location.visuals.objects.find((obj: any) =>
                            obj.description && obj.description.toLowerCase().includes(targetObject.toLowerCase())
                        );

                        if (targetObj) {
                            const closeUpPrompt = {
                                short_description: `Extreme close-up macro shot of ${targetObj.description}. ${modifications?.state || ''}`,
                                context: `Forensic examination of ${targetObject} at a crime scene.`,
                                objects: [
                                    {
                                        ...targetObj,
                                        name: targetObj.name || targetObject,
                                        relationship: "Main focus, filling the entire frame",
                                        relative_size: "large within frame",
                                        appearance_details: `${targetObj.appearance_details}. ${modifications?.state || ''}. Highly detailed macro view.`,
                                        location: "center, filling most of frame"
                                    }
                                ],
                                background_setting: `Blurred background of ${location.visuals.background_setting}`,
                                lighting: location.visuals.lighting,
                                aesthetics: {
                                    ...location.visuals.aesthetics,
                                    composition: "Extreme close-up macro shot, object fills frame",
                                    color_scheme: location.visuals.aesthetics?.color_scheme || "Muted noir tones"
                                },
                                photographic_characteristics: {
                                    depth_of_field: "Very shallow, subject razor-sharp",
                                    focus: `Sharp focus on ${targetObject}`,
                                    camera_angle: "Close-up, slightly overhead",
                                    lens_focal_length: "Macro 100mm"
                                },
                                style_medium: "photograph",
                                artistic_style: location.visuals.artistic_style || "Film noir"
                            };

                            console.log("GENERATING CLOSE-UP", currentSeed, "Target:", targetObject);
                            setCurrentImage(null);

                            generateFiboScene(closeUpPrompt, currentSeed, "1:1").then(result => {
                                if (result && result.image) {
                                    setCurrentImage(result.image);
                                    setCurrentSeed(currentSeed);
                                    soundManager.playScan();

                                    addVisualToHistory({
                                        locationId: currentLocationId,
                                        action: `examine_${targetObject}`,
                                        visuals: closeUpPrompt,
                                        imageUrl: result.image,
                                        seed: currentSeed
                                    });
                                }
                            });
                        } else {
                            console.warn(`Target object "${targetObject}" not found in scene objects`);
                        }
                    }
                }

            } else {

                // Dialogue Mode
                let targetCharId = activeCharacterId;

                // Smart fallback: If no active character, try to find one in the current room
                if (!targetCharId) {
                    const presentChars = Object.values(currentState.scenario!.characters)
                        .filter(c => c.locationId === currentState.currentLocationId);

                    if (presentChars.length > 0) {
                        const knownInRoom = currentState.knownCharacterIds
                            .filter(id => presentChars.some(c => c.id === id))
                            .reverse(); // Newest first

                        if (knownInRoom.length > 0) {
                            targetCharId = knownInRoom[0];
                        } else {
                            targetCharId = presentChars[0].id;
                        }

                        setActiveCharacter(targetCharId);
                        const charName = currentState.scenario!.characters[targetCharId].name;

                        addLog({
                            id: Date.now().toString() + Math.random().toString(36).substring(2),
                            role: 'system',
                            content: `Approaching ${charName}...`,
                            timestamp: Date.now()
                        });
                    } else {
                        addLog({
                            id: Date.now().toString() + Math.random().toString(36).substring(2),
                            role: 'system',
                            content: "No one here to talk to.",
                            timestamp: Date.now()
                        });
                        input.value = '';
                        return;
                    }
                }

                const response = await processDialogue(content, targetCharId!, currentState, currentState.scenario!);
                addLog({
                    id: Date.now().toString() + Math.random().toString(36).substring(2),
                    role: 'assistant',
                    content: response.message,
                    timestamp: Date.now()
                });

                if (response.suggestions) {
                    setSuggestions(response.suggestions);
                }
            }

        } catch (error) {
            console.error(error);
            addLog({
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: "Connection lost. The city goes dark.",
                timestamp: Date.now()
            });
        } finally {
            setProcessing(false);
            // Re-focus input after processing
            setTimeout(() => inputRef.current?.focus(), 50);
        }

        input.value = '';
    };


    const presentCharacters = useMemo(() => {
        if (!scenario) return [];
        return Object.values(scenario.characters).filter(c => c.locationId === currentLocationId);
    }, [scenario, currentLocationId]);

    return (
        <div className="flex flex-col md:flex-row h-dvh w-full bg-slate-950 text-slate-200 font-mono selection:bg-blue-900 selection:text-white">
            {/* Case Closed Modal */}
            {solvedCaseData && (
                <CaseClosed
                    data={{
                        caseId: scenario!.id,
                        caseTitle: scenario!.title,
                        date: Date.now(),
                        headline: solvedCaseData.headline,
                        story: solvedCaseData.story
                    }}
                    onClose={() => {
                        completeCase(scenario!.id, {
                            caseId: scenario!.id,
                            caseTitle: scenario!.title,
                            date: Date.now(),
                            headline: solvedCaseData.headline,
                            story: solvedCaseData.story
                        });
                        exitCase();
                    }}
                />
            )}

            {/* Investigation Board Modal */}
            {isBoardOpen && <InvestigationBoard onClose={() => setIsBoardOpen(false)} />}

            {/* Settings Modal */}
            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

            {/* City Map Modal */}
            {isMapOpen && <CityMap onClose={() => setIsMapOpen(false)} />}

            {/* Lab Report Modal (A4 Paper Style) */}
            {selectedReport && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedReport(null)}>
                    <div
                        className="bg-[#f0f0f0] text-black w-full max-w-2xl h-[85vh] overflow-y-auto shadow-2xl relative font-serif p-12 rotate-1"
                        onClick={e => e.stopPropagation()}
                        style={{
                            boxShadow: '0 0 50px rgba(0,0,0,0.5), inset 0 0 100px rgba(0,0,0,0.1)',
                            backgroundImage: 'linear-gradient(#e8e8e8 1px, transparent 1px)',
                            backgroundSize: '100% 2rem'
                        }}
                    >
                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-10 mix-blend-multiply" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                        }}></div>

                        {/* Stamp */}
                        <div className="absolute top-8 right-8 border-4 border-red-700 text-red-700 font-black text-xl px-4 py-2 -rotate-12 opacity-60 select-none">
                            CONFIDENTIAL
                        </div>

                        {/* Header */}
                        <div className="border-b-2 border-black pb-4 mb-8 flex items-center gap-4">
                            <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-2xl rounded-full">
                                MPD
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold uppercase tracking-widest">METRO POLICE DEPARTMENT</h1>
                                <h2 className="text-sm font-bold uppercase text-gray-600">FORENSIC LAB REPORT</h2>
                            </div>
                        </div>

                        {/* Content (Markdown Rendering) */}
                        <div className="prose prose-sm max-w-none font-serif leading-relaxed whitespace-pre-wrap">
                            {selectedReport.content}
                        </div>

                        {/* Footer */}
                        <div className="mt-12 pt-8 border-t border-gray-400 flex justify-between items-end">
                            <div className="text-xs text-gray-500">
                                Report ID: {selectedReport.id}<br />
                                Created: {new Date(selectedReport.timestamp).toLocaleString()}
                            </div>
                            <div className="text-center">
                                <div className="font-script text-2xl mb-2 text-blue-900">Dr. A. Vance</div>
                                <div className="text-xs uppercase border-t border-black pt-1 font-bold">Chief Medical Examiner</div>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedReport(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors print:hidden"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Top Header - Police System Bar */}
            <header className="fixed top-0 left-0 right-0 h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 md:px-4 z-50 shadow-lg">
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500 animate-pulse" />
                    <h1 className="text-xs md:text-lg font-bold tracking-widest text-slate-400">
                        METRO POLICE <span className="text-slate-600 hidden sm:inline">|</span> <span className="hidden sm:inline">CASE MANAGEMENT</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[10px] md:text-xs text-slate-500 truncate text-right">
                        <span className="hidden sm:inline">OFFICER ID: 8492-A <span className="mx-2">|</span> RANK: DETECTIVE</span>
                        <span className="sm:hidden">8492-A</span>
                    </div>
                    <button
                        onClick={() => { setIsSettingsOpen(true); soundManager.playClick(); }}
                        className="text-slate-400 hover:text-white md:hidden p-1"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setIsMapOpen(true); soundManager.playClick(); }}
                        className="text-slate-400 hover:text-white md:hidden p-1"
                    >
                        <Map className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex w-full h-full pt-12">
                {/* 1. Navigation Rail (Slim Sidebar) */}
                <nav className="fixed bottom-0 left-0 right-0 h-16 md:relative md:h-auto md:w-16 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-4 gap-1 md:gap-4 z-50">
                    {/* Board Toggle Button */}
                    <button
                        onClick={() => { setIsBoardOpen(true); soundManager.playClick(); }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-stone-700 text-stone-200 hover:bg-stone-600 hover:text-white shadow-lg transition-all group relative mb-0 md:mb-2 border border-stone-600"
                        title="Investigation Board"
                    >
                        <Pin className="w-5 h-5" />
                        <div className="hidden md:block absolute left-14 bg-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 font-bold tracking-wider">
                            EVIDENCE BOARD
                        </div>
                    </button>

                    <div className="hidden md:block h-px w-8 bg-slate-800 my-2" />

                    <button
                        onClick={() => handleTabChange('evidence')}
                        className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative",
                            sidebarTab === 'evidence' && isPanelOpen ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                        )}
                        title="Evidence Locker"
                    >
                        <Folder className="w-5 h-5" />
                        {notifications.evidence && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                        )}
                        {/* Tooltip */}
                        <div className="hidden md:block absolute left-14 bg-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 font-bold tracking-wider">
                            EVIDENCE
                        </div>
                    </button>

                    <button
                        onClick={() => handleTabChange('lab')}
                        className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative",
                            sidebarTab === 'lab' && isPanelOpen ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                        )}
                        title="Forensics Lab"
                    >
                        <Microscope className="w-5 h-5" />
                        {notifications.lab && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                        )}
                        <div className="hidden md:block absolute left-14 bg-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 font-bold tracking-wider">
                            FORENSICS
                        </div>
                    </button>

                    <button
                        onClick={() => handleTabChange('dossiers')}
                        className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative",
                            sidebarTab === 'dossiers' && isPanelOpen ? "bg-red-600 text-white shadow-lg shadow-red-900/50" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                        )}
                        title="Dossiers"
                    >
                        <Users className="w-5 h-5" />
                        {notifications.dossiers && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                        )}
                        <div className="hidden md:block absolute left-14 bg-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 font-bold tracking-wider">
                            DOSSIERS
                        </div>
                    </button>

                    <button
                        onClick={() => handleTabChange('da')}
                        className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative",
                            sidebarTab === 'da' && isPanelOpen ? "bg-amber-600 text-white shadow-lg shadow-amber-900/50" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                        )}
                        title="District Attorney"
                    >
                        <Scale className="w-5 h-5" />
                        {notifications.da && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                        )}
                        <div className="hidden md:block absolute left-14 bg-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 font-bold tracking-wider">
                            D.A. OFFICE
                        </div>
                    </button>

                    <div className="hidden md:block h-px w-8 bg-slate-800 my-2" />

                    <button
                        onClick={() => { setIsMapOpen(true); soundManager.playClick(); }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-blue-400 hover:bg-slate-800 transition-colors hidden md:flex"
                        title="City Map [M]"
                    >
                        <Map className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => { setIsSettingsOpen(true); soundManager.playClick(); }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-colors mt-auto hidden md:flex"
                        title="Settings"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                </nav>

                {/* 2. Active Panel (Drawer) */}
                <aside className={clsx(
                    "border-r border-slate-800 bg-slate-900/95 flex flex-col transition-all duration-300 ease-in-out z-40",
                    // Mobile: Fixed overlay
                    "fixed inset-x-0 top-12 bottom-16",
                    // Desktop: Static layout shift
                    "md:static md:inset-auto",
                    // Visibility State
                    isPanelOpen
                        ? "translate-x-0 md:w-72 md:translate-x-0"
                        : "translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden"
                )}>
                    {/* Panel Header */}
                    <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-800/30 shrink-0">
                        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap overflow-hidden">
                            {sidebarTab === 'evidence' && <><Folder className="w-4 h-4 text-blue-500" /> EVIDENCE LOCKER</>}
                            {sidebarTab === 'lab' && <><Microscope className="w-4 h-4 text-purple-500" /> FORENSICS LAB</>}
                            {sidebarTab === 'dossiers' && <><Users className="w-4 h-4 text-red-500" /> SUSPECT DOSSIERS</>}
                            {sidebarTab === 'da' && <><Scale className="w-4 h-4 text-amber-500" /> D.A. OVERSIGHT</>}
                        </h2>
                        <button
                            onClick={() => setIsPanelOpen(false)}
                            className="text-slate-500 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Panel Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">

                        {/* EVIDENCE TAB */}
                        {sidebarTab === 'evidence' && (
                            <>
                                {inventory.length === 0 ? (
                                    <div className="text-xs text-slate-600 border border-dashed border-slate-800 p-4 rounded text-center">
                                        No physical evidence recorded.
                                    </div>
                                ) : (
                                    inventory.map((item) => (
                                        <div key={item.id} className="bg-slate-800 p-3 rounded border-l-2 border-blue-500 shadow-sm hover:bg-slate-700 transition-colors group relative">
                                            <div className="font-bold text-slate-200 text-xs mb-1 group-hover:text-blue-400">{item.name.toUpperCase()}</div>
                                            <div className="text-[10px] text-slate-500 leading-tight">{item.description}</div>
                                            <div className="mt-2 flex justify-between items-center">
                                                <span className="text-[9px] text-slate-600 font-bold">REF: {item.id.substring(0, 8)}</span>
                                                <button
                                                    onClick={() => handleAnalyze(item)}
                                                    disabled={analyzingId === item.id}
                                                    className="text-[10px] bg-slate-700 hover:bg-purple-600 text-slate-300 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                >
                                                    {analyzingId === item.id ? 'SENDING...' : <><Microscope className="w-3 h-3" /> SEND TO LAB</>}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {/* LAB TAB */}
                        {sidebarTab === 'lab' && (
                            <div className="space-y-4">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Son Raporlar</div>
                                {useGameStore.getState().labReports.length === 0 ? (
                                    <div className="bg-slate-800 p-3 rounded border-l-2 border-purple-500">
                                        <div className="text-xs text-purple-300 font-bold mb-1">LAB STATUS: ONLINE</div>
                                        <div className="text-[10px] text-slate-400">
                                            Forensics team ready. Send evidence from Evidence Locker for analysis.
                                        </div>
                                    </div>
                                ) : (
                                    useGameStore.getState().labReports.map(report => (
                                        <button
                                            key={report.id}
                                            onClick={() => {
                                                setSelectedReport(report);
                                                soundManager.playClick();
                                            }}
                                            className="w-full text-left bg-slate-800 p-3 rounded border-l-2 border-purple-500 shadow-sm hover:bg-slate-700 transition-all group"
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="text-xs text-purple-300 font-bold group-hover:text-purple-200">REPORT: {report.itemName.toUpperCase()}</div>
                                                <div className="text-[9px] text-slate-500">{new Date(report.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate font-mono">
                                                Click to view report...
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {/* DOSSIERS TAB */}
                        {sidebarTab === 'dossiers' && (
                            <div className="space-y-3">
                                {knownCharacterIds.length === 0 ? (
                                    <div className="text-xs text-slate-600 border border-dashed border-slate-800 p-4 rounded text-center">
                                        No subjects identified yet.
                                    </div>
                                ) : (
                                    knownCharacterIds.map(charId => {
                                        const char = scenario?.characters[charId];
                                        if (!char) return null;
                                        const isSuspect = suspectIds.includes(charId);
                                        const isPresent = char.locationId === currentLocationId;

                                        return (
                                            <div
                                                key={charId}
                                                className={clsx(
                                                    "p-3 rounded border-l-2 transition-all relative overflow-hidden",
                                                    isSuspect
                                                        ? "bg-red-950/30 border-red-500"
                                                        : "bg-slate-800 border-slate-600"
                                                )}
                                            >
                                                {/* Suspect Stamp */}
                                                {isSuspect && (
                                                    <div className="absolute -right-4 -top-2 text-[40px] font-black text-red-500/10 rotate-12 pointer-events-none select-none">
                                                        SUSPECT
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mb-2 relative z-10">
                                                    <div className={clsx("font-bold text-xs", isSuspect ? "text-red-400" : "text-slate-200")}>
                                                        {char.name.toUpperCase()}
                                                    </div>
                                                    {isPresent && <span className="text-[9px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded border border-green-800">PRESENT</span>}
                                                </div>

                                                <div className="text-[10px] text-slate-400 leading-tight mb-3 relative z-10">{char.description}</div>

                                                <div className="flex gap-2 relative z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isSuspect) {
                                                                unmarkSuspect(charId);
                                                                addLog({
                                                                    id: Date.now().toString(),
                                                                    role: 'system',
                                                                    content: `SUSPECT CLEARED: ${char.name.toUpperCase()} removed from suspect list.`,
                                                                    timestamp: Date.now()
                                                                });
                                                            } else {
                                                                markSuspect(charId);
                                                                addLog({
                                                                    id: Date.now().toString(),
                                                                    role: 'system',
                                                                    content: `SUSPECT MARKED: ${char.name.toUpperCase()} identified as a Person of Interest.`,
                                                                    timestamp: Date.now()
                                                                });
                                                            }
                                                            soundManager.playClick();
                                                        }}
                                                        className={clsx(
                                                            "flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded border transition-colors",
                                                            isSuspect
                                                                ? "bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/40"
                                                                : "bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
                                                        )}
                                                    >
                                                        {isSuspect ? 'UNMARK' : 'MARK SUSPECT'}
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            if (isPresent) {
                                                                setActiveCharacter(charId);
                                                                setInputMode('dialogue');
                                                                soundManager.playClick();
                                                            }
                                                        }}
                                                        disabled={!isPresent}
                                                        className={clsx(
                                                            "flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded border transition-colors",
                                                            isPresent
                                                                ? "bg-blue-900/30 border-blue-800 text-blue-400 hover:bg-blue-900/50"
                                                                : "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                                                        )}
                                                    >
                                                        INTERROGATE
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* D.A. TAB */}
                        {sidebarTab === 'da' && (
                            <div className="space-y-4">
                                <div className="bg-amber-900/20 border border-amber-900/50 p-3 rounded animate-in fade-in duration-500">
                                    <div className="text-[10px] text-amber-500 font-bold mb-1">LATEST NOTE</div>
                                    <p className="text-xs text-amber-200/80 leading-relaxed font-mono">
                                        "{daMessage}"
                                    </p>
                                </div>

                                {!daAction ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                // Search warrant usually targets a location. For now, let's just request for current location.
                                                const locName = scenario?.locations[currentLocationId]?.name || "Current Location";
                                                const request = `D.A. REQUEST: Requesting SEARCH WARRANT for ${locName}.`;
                                                const input = document.querySelector('input[name="command"]') as HTMLInputElement;
                                                if (input) {
                                                    input.value = request;
                                                    // Trigger submit manually or let user press enter? 
                                                    // Let's auto-submit for smooth experience
                                                    handleSend({ preventDefault: () => { }, currentTarget: input.form } as any);
                                                }
                                            }}
                                            className="p-3 bg-slate-800 hover:bg-amber-900/30 border border-slate-700 hover:border-amber-700 text-slate-400 hover:text-amber-400 rounded transition-all flex flex-col items-center gap-2 group"
                                        >
                                            <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Search Warrant</span>
                                        </button>

                                        <button
                                            onClick={() => setDaAction('arrest')}
                                            className="p-3 bg-slate-800 hover:bg-red-900/30 border border-slate-700 hover:border-red-700 text-slate-400 hover:text-red-400 rounded transition-all flex flex-col items-center gap-2 group"
                                        >
                                            <ShieldAlert className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Arrest Warrant</span>
                                        </button>

                                        <button
                                            onClick={() => setDaAction('wiretap')}
                                            className="p-3 bg-slate-800 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-700 text-slate-400 hover:text-blue-400 rounded transition-all flex flex-col items-center gap-2 group"
                                        >
                                            <Headphones className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Wiretap</span>
                                        </button>

                                        <button
                                            onClick={() => setDaAction('financial')}
                                            className="p-3 bg-slate-800 hover:bg-green-900/30 border border-slate-700 hover:border-green-700 text-slate-400 hover:text-green-400 rounded transition-all flex flex-col items-center gap-2 group"
                                        >
                                            <DollarSign className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Financial Audit</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2 animate-in slide-in-from-right-4 duration-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                                                {daAction === 'arrest' && 'SELECT SUSPECT TO ARREST'}
                                                {daAction === 'wiretap' && 'SELECT TARGET FOR WIRETAP'}
                                                {daAction === 'financial' && 'SELECT TARGET FOR AUDIT'}
                                            </div>
                                            <button
                                                onClick={() => setDaAction(null)}
                                                className="text-[10px] text-red-400 hover:text-red-300"
                                            >
                                                CANCEL
                                            </button>
                                        </div>

                                        {knownCharacterIds.map(charId => {
                                            const char = scenario?.characters[charId];
                                            if (!char) return null;
                                            return (
                                                <button
                                                    key={charId}
                                                    onClick={() => {
                                                        let requestType = "";
                                                        if (daAction === 'arrest') requestType = "ARREST WARRANT";
                                                        if (daAction === 'wiretap') requestType = "WIRETAP AUTHORIZATION";
                                                        if (daAction === 'financial') requestType = "FINANCIAL AUDIT AUTHORIZATION";

                                                        const request = `D.A. REQUEST: Requesting ${requestType} for ${char.name}.`;
                                                        const input = document.querySelector('input[name="command"]') as HTMLInputElement;
                                                        if (input) {
                                                            input.value = request;
                                                            handleSend({ preventDefault: () => { }, currentTarget: input.form } as any);
                                                        }
                                                        setDaAction(null);
                                                    }}
                                                    className="w-full p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-left flex items-center gap-3 group"
                                                >
                                                    <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-xs font-bold text-slate-500 group-hover:text-slate-300">
                                                        {char.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="text-xs text-slate-300 font-bold group-hover:text-white">
                                                        {char.name}
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {knownCharacterIds.length === 0 && (
                                            <div className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded">
                                                No subjects identified yet.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-900">
                        <div className="text-[10px] text-slate-500 mb-1">CURRENT LOCATION</div>
                        <div className="text-sm font-bold text-blue-400 truncate">
                            {scenario?.locations[currentLocationId]?.name.toUpperCase() || 'UNKNOWN'}
                        </div>
                    </div>
                </aside>

                {/* 3. Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative mb-16 md:mb-0">
                    {/* Scene Visualization */}
                    <div className="w-full aspect-video max-h-[60vh] relative shrink-0 transition-all duration-500 ease-in-out">
                        {scenario && (
                            <SceneDisplay
                                locationId={currentLocationId}
                                locationName={scenario.locations[currentLocationId]?.name || 'UNKNOWN'}
                                imageSrc={currentImage}
                                characterImageSrc={characterImage}
                            />
                        )}
                    </div>

                    {/* Log Stream & Input Container */}
                    <div className="flex-1 min-h-0 flex flex-col relative">
                        {/* Log Stream (Takes available space) */}
                        <LogStream />

                        {/* Suggestions Area */}
                        {useGameStore.getState().suggestions.length > 0 && (
                            <div className="absolute bottom-full left-0 right-0 p-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar mask-linear-fade">
                                {useGameStore.getState().suggestions.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            const input = document.querySelector('input[name="command"]') as HTMLInputElement;
                                            if (input) {
                                                input.value = suggestion;
                                                // Optional: Auto-submit or just fill? Let's just fill for now so they can edit.
                                                // actually, usually suggestions are "quick actions". Let's auto-submit.
                                                // But we need to trigger the form submit.
                                                // A cleaner way is to just call handleSend with a synthetic event, but that's hard.
                                                // Let's just fill and focus.
                                                input.focus();
                                            }
                                        }}
                                        className="whitespace-nowrap px-3 py-1 bg-slate-800/80 hover:bg-blue-900/80 border border-slate-700 hover:border-blue-500 text-xs text-blue-200 rounded-full backdrop-blur-sm transition-all shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-300"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area (Fixed at bottom via Flexbox) */}
                        <div className="shrink-0 z-20 bg-slate-950 border-t border-slate-800 p-2 md:p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative">
                            <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
                                <div className="relative flex-1 group">
                                    <div className={clsx(
                                        "absolute -inset-0.5 rounded opacity-75 blur transition duration-200 group-hover:opacity-100",
                                        inputMode === 'action' ? "bg-blue-600" : "bg-red-600"
                                    )}></div>
                                    <input
                                        name="command"
                                        ref={inputRef}
                                        type="text"
                                        placeholder={inputMode === 'action' ? "ENTER COMMAND..." : "INTERROGATE SUSPECT..."}
                                        autoComplete="off"
                                        className="relative w-full bg-slate-900 text-slate-200 border border-slate-700 rounded px-3 py-2 md:px-4 md:py-3 pr-10 md:pr-12 focus:outline-none focus:border-slate-500 transition-colors font-mono text-xs md:text-sm placeholder:text-slate-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        className={clsx(
                                            "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all",
                                            isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                        )}
                                        title="Voice Input"
                                    >
                                        {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className={clsx(
                                        "px-4 md:px-6 py-2 rounded font-bold tracking-wider transition-all relative overflow-hidden shadow-lg text-xs md:text-base min-w-[100px]",
                                        inputMode === 'action'
                                            ? "bg-blue-700 text-white hover:bg-blue-600 shadow-blue-900/50"
                                            : "bg-red-700 text-white hover:bg-red-600 shadow-red-900/50",
                                        isProcessing && "opacity-90 cursor-wait"
                                    )}
                                >
                                    {isProcessing ? (
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Digital Waveform Animation */}
                                            <div className="flex gap-1 items-center h-3">
                                                <div className="w-0.5 h-2 bg-white/90 animate-[pulse_0.6s_ease-in-out_infinite]" />
                                                <div className="w-0.5 h-4 bg-white/90 animate-[pulse_0.6s_ease-in-out_0.15s_infinite]" />
                                                <div className="w-0.5 h-3 bg-white/90 animate-[pulse_0.6s_ease-in-out_0.3s_infinite]" />
                                                <div className="w-0.5 h-2 bg-white/90 animate-[pulse_0.6s_ease-in-out_0.45s_infinite]" />
                                            </div>
                                            <span className="text-[10px] tracking-[0.2em] animate-pulse font-mono">DATA...</span>
                                        </div>
                                    ) : (
                                        inputMode === 'action' ? 'EXECUTE' : 'SPEAK'
                                    )}
                                </button>
                            </form>
                            <div className="text-center mt-2">
                                <button
                                    onClick={() => setInputMode(prev => prev === 'action' ? 'dialogue' : 'action')}
                                    className="text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
                                >
                                    [ SWITCH TO {inputMode === 'action' ? 'INTERROGATION' : 'ACTION'} MODE ]
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div >
    );
}
