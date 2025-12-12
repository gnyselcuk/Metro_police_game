import { create } from 'zustand';
import { GameState, Scenario, LogEntry, Item, BoardItem, BoardConnection, Character, PlayerProfile, SolvedCase } from '@/types/game';

// Visual history entry for consistency tracking
interface VisualHistoryEntry {
    id: string;
    locationId: string;
    action: string;
    visuals: Record<string, any>;
    imageUrl: string | null;
    seed: number | null;
    timestamp: number;
}

interface GameStore extends GameState {
    setProcessing: (isProcessing: boolean) => void;
    addLabReport: (report: { id: string, itemName: string, content: string, timestamp: number }) => void;

    // Visual History for consistency
    visualHistory: VisualHistoryEntry[];
    addVisualToHistory: (entry: Omit<VisualHistoryEntry, 'id' | 'timestamp'>) => void;

    // Settings
    settings: {
        volume: number;
        fontSize: 'small' | 'medium' | 'large';
    };
    updateSettings: (settings: Partial<{ volume: number; fontSize: 'small' | 'medium' | 'large' }>) => void;

    // Notifications
    notifications: {
        evidence: boolean;
        lab: boolean;
        dossiers: boolean;
        da: boolean;
    };
    setNotification: (key: keyof GameStore['notifications'], value: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    history: [],
    inventory: [],
    currentLocationId: '',
    scenario: null,
    isProcessing: false,
    activeCharacterId: null,

    // Character State
    knownCharacterIds: [],
    suspectIds: [],

    // Board State
    boardItems: [],
    boardConnections: [],
    suggestions: [],

    // Lab State
    labReports: [],

    // Visual History
    visualHistory: [],

    // Settings
    settings: {
        volume: 0.3,
        fontSize: 'medium'
    },

    addVisualToHistory: (entry) => set((state) => ({
        visualHistory: [
            ...state.visualHistory.slice(-9), // Keep last 10 entries
            {
                ...entry,
                id: `visual_${Date.now()}`,
                timestamp: Date.now()
            }
        ]
    })),

    updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
    })),

    loadScenario: (scenario: Scenario) => set({
        scenario,
        currentLocationId: Object.keys(scenario.locations)[0],
        suggestions: [], // Reset suggestions on load
        knownCharacterIds: [],
        suspectIds: [],
        history: [{
            id: 'init',
            role: 'system',
            content: `CASE FILE LOADED: ${scenario.title}\n${scenario.description}`,
            timestamp: Date.now()
        }]
    }),

    addLog: (entry: LogEntry) => set((state) => ({
        history: [...state.history, entry]
    })),

    addToInventory: (itemOrId: Item | string) => set((state) => {
        let item: Item;

        if (typeof itemOrId === 'string') {
            // Try to find item in scenario locations
            let foundItem: Item | undefined;
            if (state.scenario) {
                for (const loc of Object.values(state.scenario.locations)) {
                    const match = loc.interactables.find(i => i.id === itemOrId);
                    if (match) {
                        foundItem = match as Item;
                        break;
                    }
                }
            }

            if (foundItem) {
                item = foundItem;
            } else {
                // Fallback for improvised items
                const name = itemOrId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                item = {
                    id: itemOrId,
                    name: name,
                    description: "An item collected during the investigation."
                };
            }
        } else {
            item = itemOrId;
        }

        // Check if item already exists to prevent duplicates
        if (state.inventory.some(i => i.id === item.id)) return state;

        // Auto-add to board when found
        const newBoardItem: BoardItem = {
            id: `ev_${item.id}`,
            type: 'evidence',
            title: item.name,
            description: item.description,
            x: Math.random() * 300 + 50,
            y: Math.random() * 300 + 50,
            rotation: Math.random() * 10 - 5
        };

        return {
            inventory: [...state.inventory, item],
            boardItems: [...state.boardItems, newBoardItem],
            notifications: { ...state.notifications, evidence: true }
        };
    }),

    setCurrentLocation: (locationId: string) => set({ currentLocationId: locationId }),

    setActiveCharacter: (characterId: string | null) => {
        const state = get();
        // If setting a character, ensure they are "met"
        if (characterId && !state.knownCharacterIds.includes(characterId)) {
            state.meetCharacter(characterId);
        }
        set({ activeCharacterId: characterId });
    },

    setProcessing: (isProcessing: boolean) => set({ isProcessing }),

    // Character Actions
    meetCharacter: (characterId: string) => set((state) => {
        if (state.knownCharacterIds.includes(characterId)) return state;

        // Auto-add character to board when met
        let newItems = [...state.boardItems];
        if (state.scenario) {
            const char = state.scenario.characters[characterId];
            const boardId = `char_${characterId}`;
            // Check if already on board
            if (char && !state.boardItems.find(i => i.id === boardId)) {
                newItems.push({
                    id: boardId,
                    type: 'character',
                    title: char.name,
                    description: char.description,
                    x: Math.random() * 300 + 400, // Place characters on the right side
                    y: Math.random() * 300 + 50,
                    rotation: Math.random() * 6 - 3
                });
            }
        }

        return {
            knownCharacterIds: Array.from(new Set([...state.knownCharacterIds, characterId])),
            boardItems: newItems,
            notifications: { ...state.notifications, dossiers: true }
        };
    }),

    addCharacter: (character: Character) => set((state) => {
        if (!state.scenario) return state;

        // Prevent duplicates
        if (state.scenario.characters[character.id]) return state;

        return {
            scenario: {
                ...state.scenario,
                characters: {
                    ...state.scenario.characters,
                    [character.id]: character
                },
                notifications: { ...state.notifications, dossiers: true }
            }
        };
    }),

    markSuspect: (characterId: string) => set((state) => ({
        suspectIds: state.suspectIds.includes(characterId)
            ? state.suspectIds
            : [...state.suspectIds, characterId]
    })),

    unmarkSuspect: (characterId: string) => set((state) => ({
        suspectIds: state.suspectIds.filter(id => id !== characterId)
    })),

    // Board Actions
    addBoardItem: (item: BoardItem) => set((state) => ({
        boardItems: [...state.boardItems, item]
    })),

    updateBoardItem: (id: string, updates: Partial<BoardItem>) => set((state) => ({
        boardItems: state.boardItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
        )
    })),

    addBoardConnection: (fromId: string, toId: string) => set((state) => {
        if (state.boardConnections.some(c =>
            (c.fromId === fromId && c.toId === toId) ||
            (c.fromId === toId && c.toId === fromId)
        )) return state;

        return {
            boardConnections: [...state.boardConnections, {
                id: `${fromId}-${toId}`,
                fromId,
                toId
            }]
        };
    }),

    removeBoardConnection: (id: string) => set((state) => ({
        boardConnections: state.boardConnections.filter(c => c.id !== id)
    })),

    setSuggestions: (suggestions: string[]) => set({ suggestions }),

    addLabReport: (report: { id: string, itemName: string, content: string, timestamp: number }) => set((state) => ({
        labReports: [report, ...state.labReports],
        notifications: { ...state.notifications, lab: true }
    })),

    // Profile & Game Flow
    userProfile: null,

    login: (name: string) => {
        // In a real app, this would fetch from DB. For now, we mock or load from localStorage if we had it.
        // We'll just create a fresh profile or a mock one.
        const mockProfile: PlayerProfile = {
            name,
            level: 1,
            solvedCases: []
        };
        set({ userProfile: mockProfile });
    },

    logout: () => set({ userProfile: null, scenario: null }),

    completeCase: (caseId: string, newspaper: SolvedCase) => set((state) => {
        if (!state.userProfile) return state;

        // Check if already solved to avoid duplicates
        if (state.userProfile.solvedCases.some(c => c.caseId === caseId)) return state;

        return {
            userProfile: {
                ...state.userProfile,
                solvedCases: [newspaper, ...state.userProfile.solvedCases],
                level: state.userProfile.level + 1
            }
        };
    }),

    // Notifications
    notifications: {
        evidence: false,
        lab: false,
        dossiers: false,
        da: false
    },
    setNotification: (key: keyof GameStore['notifications'], value: boolean) => set((state) => ({
        notifications: { ...state.notifications, [key]: value }
    })),

    exitCase: () => set({
        scenario: null,
        history: [],
        inventory: [],
        currentLocationId: '',
        activeCharacterId: null,
        knownCharacterIds: [],
        suspectIds: [],
        boardItems: [],
        boardConnections: [],
        labReports: [],
        visualHistory: [],
        notifications: {
            evidence: false,
            lab: false,
            dossiers: false,
            da: false
        }
    })
}));
