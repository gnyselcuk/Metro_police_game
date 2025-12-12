export interface Item {
    id: string;
    name: string;
    description: string;
}

export interface Character {
    id: string;
    name: string;
    description: string;
    locationId: string;
    bio: string;
    visuals?: Record<string, any>; // FIBO JSON structure for visual generation
}

export interface Interactable {
    id: string;
    name: string;
    description: string;
    type: 'item' | 'scenery' | 'character';
    visuals?: Record<string, any>; // FIBO JSON structure for visual generation
}

export interface Location {
    id: string;
    name: string;
    description: string;
    image?: string;
    interactables: Interactable[];
    connections: string[];
    coordinates?: { x: number; y: number };
    mapId?: string; // The ID of the map layer this location belongs to
    visuals?: Record<string, any>; // FIBO JSON structure for visual generation
}

export interface MapLayer {
    id: string;
    name: string;
    image: string;
    parentId?: string; // If this is a sub-map (e.g. building floor), parent is the city map
    nodes?: { // Nodes that are not locations but navigation points (e.g. entrance to building)
        id: string;
        name: string;
        x: number;
        y: number;
        targetMapId: string;
    }[];
}

export interface Scenario {
    id: string;
    title: string;
    description: string;
    introText?: string;
    introImage?: string;
    startingLocationId: string;
    locations: Record<string, Location>;
    characters: Record<string, Character>;
    globalClues: string[];
    maps?: Record<string, MapLayer>; // Multiple map layers
    truth?: {
        killer: string;
        motive: string;
        method: string;
        details: string;
    };
    systemInstructions?: string;
}

export interface LogEntry {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

// Investigation Board Types
export interface BoardItem {
    id: string;
    type: 'evidence' | 'character' | 'note';
    title: string;
    description?: string;
    imageSrc?: string | null;
    x: number;
    y: number;
    rotation?: number;
}

export interface BoardConnection {
    id: string;
    fromId: string;
    toId: string;
    color?: string;
}

export interface GameState {
    history: LogEntry[];
    inventory: Item[];
    currentLocationId: string;
    scenario: Scenario | null;
    activeCharacterId: string | null;
    isProcessing: boolean;

    // Character Management
    knownCharacterIds: string[];
    suspectIds: string[];

    // Board State
    boardItems: BoardItem[];
    boardConnections: BoardConnection[];

    // Suggestions
    suggestions: string[];

    // Lab Reports
    labReports: { id: string, itemName: string, content: string, timestamp: number }[];

    loadScenario: (scenario: Scenario) => void;
    addLog: (entry: LogEntry) => void;
    addToInventory: (item: Item | string) => void;
    setCurrentLocation: (locationId: string) => void;
    setActiveCharacter: (characterId: string | null) => void;
    setSuggestions: (suggestions: string[]) => void;
    setProcessing: (isProcessing: boolean) => void;

    // Character Actions
    markSuspect: (characterId: string) => void;
    unmarkSuspect: (characterId: string) => void;
    meetCharacter: (characterId: string) => void;
    addCharacter: (character: Character) => void;

    // Board Actions
    addBoardItem: (item: BoardItem) => void;
    updateBoardItem: (id: string, updates: Partial<BoardItem>) => void;
    addBoardConnection: (fromId: string, toId: string) => void;
    removeBoardConnection: (id: string) => void;

    // Profile & Game Flow
    userProfile: PlayerProfile | null;
    login: (name: string) => void;
    logout: () => void;
    completeCase: (caseId: string, newspaper: SolvedCase) => void;
    exitCase: () => void;
}

export interface SolvedCase {
    caseId: string;
    caseTitle: string;
    date: number;
    headline: string;
    story: string;
}

export interface PlayerProfile {
    name: string;
    solvedCases: SolvedCase[];
    level: number; // Detective rank
}
