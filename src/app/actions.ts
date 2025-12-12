'use server';

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { Scenario, GameState } from '@/types/game';

const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

const model = openrouter('tngtech/deepseek-r1t2-chimera:free');

// --- Types for Bria API ---
interface BriaPrompt {
    prompt: string; // The "short_description" equivalent usually, or full prompt
    num_results?: number;
    steps?: number;
    aspect_ratio?: string;
    // Add other fields if strictly typed, but Bria v2 often uses structured prompt
}

// --- Actions ---

export async function processAction(input: string, gameState: GameState, scenario: Scenario) {
    // Get recent visual history for consistency
    const recentVisuals = (gameState as any).visualHistory?.slice(-3) || [];

    const systemPrompt = `
    You are the Game Master for a realistic detective mystery game.
    Current Location: ${gameState.currentLocationId}
    Inventory: ${gameState.inventory.map(i => i.name).join(', ')}
    
    Scenario Context:
    ${JSON.stringify(scenario.locations[gameState.currentLocationId])}

    CORE TRUTH (The absolute facts of the case - adhere to these for the main mystery):
    ${JSON.stringify(scenario.truth)}

    SYSTEM INSTRUCTIONS (How to handle improvisation):
    ${scenario.systemInstructions || "Adhere to the scenario logic."}

    Recent History:
    ${gameState.history.slice(-10).map(h => `${h.role}: ${h.content}`).join('\n')}

    ${recentVisuals.length > 0 ? `
    RECENT VISUAL CONTEXT (For consistency - maintain style, lighting, color scheme):
    ${JSON.stringify(recentVisuals, null, 2)}
    ` : ''}

    Your task:
    1. Analyze the player's action: "${input}"
    2. Determine the outcome based on the scenario and realistic logic.
    3. Provide a narrative description.
    4. If the player moves, takes an item, or MEETS a character, update the state.
    5. If the player wants to ANALYZE/SEND TO LAB an item (even if not in inventory), set 'analyzeItem' in newState.
    6. If you introduce a NEW character not in the list below, you MUST provide their details in 'newCharacters'.
    
    **CRITICAL - DYNAMIC LOCATION GENERATION:**
    When the player moves to a location that is NOT in the scenario (like "restroom", "hallway", "roof", etc.):
    - You MUST set newState.currentLocationId to the new location ID (e.g., "restroom")
    - You MUST provide newLocationVisuals with full visuals for that new location
    - This generates a dynamic image for the improvised location
    - Example: Player says "go to the restroom" → newState.currentLocationId: "restroom" + newLocationVisuals with complete visuals
    
    **IMPORTANT:** Do NOT send newLocationVisuals when returning to a previously visited location!
    - If player says "go back to restroom" and restroom was already visited, just set newState.currentLocationId - no newLocationVisuals needed.
    - The system caches images, so returning to a location uses the cached image.
    
    7. **VISUAL GENERATION (BRIA v2 API - Complete Schema)**:
    You are generating visuals using the BRIA FIBO model. Follow this COMPLETE JSON schema:
    
    **Full Schema for 'visuals' object:**
    {
      "short_description": "string (Main subject. Use 'Cinematic wide angle panoramic view' for locations, 'Extreme close-up macro shot' for inspections)",
      "context": "string (Scene context and narrative purpose)",
      "objects": [
        {
          "name": "string (REQUIRED: Short label)",
          "description": "string (REQUIRED: Detailed description)",
          "relationship": "string (REQUIRED: Relation to scene/other objects)",
          "location": "string (Position in frame)",
          "relative_size": "string (Size relative to frame)",
          "shape_and_color": "string (Visual attributes)",
          "texture": "string (Surface quality)",
          "appearance_details": "string (Fine details)",
          "pose": "string (For characters/figures)",
          "expression": "string (For characters)",
          "action": "string (What it's doing)",
          "orientation": "string (Facing direction)"
        }
      ],
      "background_setting": "string (Environment description)",
      "lighting": {
        "conditions": "string (Light type: 'Dim fluorescent', 'Harsh spotlight', 'Soft ambient')",
        "direction": "string (Light source direction)",
        "shadows": "string (Shadow characteristics)"
      },
      "aesthetics": {
        "composition": "string (Framing and camera work)",
        "color_scheme": "string (REQUIRED: Color palette)",
        "mood_atmosphere": "string (Emotional tone)"
      },
      "photographic_characteristics": {
        "depth_of_field": "string ('Shallow - subject sharp, background blurred' or 'Deep - everything sharp')",
        "focus": "string (What is in focus)",
        "camera_angle": "string ('Eye level', 'Low angle', 'High angle', 'Dutch angle', 'Bird's eye')",
        "lens_focal_length": "string ('Wide angle 24mm', 'Standard 50mm', 'Telephoto 85mm', 'Macro 100mm')"
      },
      "style_medium": "string ('photograph', 'film still', 'noir photograph')",
      "artistic_style": "string ('Film noir', 'Neo-noir', 'Cinematic realism')"
    }

    **ACTION-AWARE CAMERA LOGIC:**
    - "examine X", "inspect X", "look at X closely" → Use CLOSE-UP/MACRO:
      * photographic_characteristics.lens_focal_length: "Macro 100mm"
      * photographic_characteristics.depth_of_field: "Very shallow, object razor-sharp"
      * short_description: "Extreme close-up macro shot of [object]..."
      
    - "look around", "enter room", "go to X" → Use STANDARD LENS:
      * photographic_characteristics.lens_focal_length: "Standard 50mm"
      * photographic_characteristics.depth_of_field: "Medium depth of field"
      * short_description: "Cinematic view of..."
      
    - "look under X", "check behind X" → Use LOW/UNUSUAL ANGLE:
      * photographic_characteristics.camera_angle: "Low angle" or "Dutch angle"
      * Add tension through shadows and lighting

    8. ACT AS THE DISTRICT ATTORNEY (D.A.): If the player breaks protocol, add cynical feedback.
    9. SUGGESTIONS: Provide 3-4 short, dynamic follow-up actions.
    10. LANGUAGE: All output MUST BE IN ENGLISH.
    11. VISUAL CONSISTENCY: Maintain the same artistic_style, lighting.conditions, and aesthetics.color_scheme across related scenes.

    Output MUST be valid JSON matching this schema:
    {
      "narrative": "string",
      "daFeedback": "string (optional)",
      "visualRefinement": {
          "targetObject": "string (Name of the object being examined)",
          "visuals": { ...full visuals schema above... }
      },
      "suggestions": ["string", "string", "string"],
      "newCharacters": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "bio": "string",
          "locationId": "string",
          "visuals": { ...full visuals schema above... }
        }
      ],
      "newLocationVisuals": {
        "locationId": "string",
        "visuals": { ...full visuals schema above... }
      },
      "newState": {
        "currentLocationId": "string",
        "addToInventory": "string",
        "activeCharacterId": "string",
        "metCharacters": ["string"],
        "analyzeItem": "string"
      },
      "caseSolved": {
          "isSolved": boolean,
          "headline": "string",
          "story": "string"
      }
    }
  `;

    const result = await generateText({
        model: model,
        system: systemPrompt,
        prompt: input,
    });

    const text = result.text;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);

    try {
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
        const data = JSON.parse(jsonStr);
        return { data };
    } catch (e) {
        console.error("JSON Parse Error", e);
        return {
            data: {
                narrative: result.text,
                visualPrompt: "A glitch in the matrix.",
                suggestions: ["Look around", "Check inventory"]
            }
        };
    }
}

export async function processDialogue(input: string, characterId: string, gameState: GameState, scenario: Scenario) {
    const character = scenario.characters[characterId];
    // Fallback if character not found
    const charName = character ? character.name : "Unknown";
    const charDesc = character ? character.description : "A shadowy figure.";
    const charBio = character ? character.bio : "Unknown.";

    const systemPrompt = `
      You are roleplaying as ${charName}.
      Description: ${charDesc}
      Bio (Hidden): ${charBio}
      
      CORE TRUTH (What actually happened):
      ${JSON.stringify(scenario.truth)}

      The detective (player) asks: "${input}"
      
      Respond in character. Be atmospheric.
      Also provide 3 short suggested responses for the player.
      IMPORTANT: Respond in ENGLISH language.

      Output JSON: { 
        "message": "string", 
        "mood": "neutral",
        "suggestions": ["string", "string", "string"]
      }
    `;

    const result = await generateText({
        model: model,
        system: systemPrompt,
        prompt: input,
    });

    const text = result.text;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);

    try {
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
        return JSON.parse(jsonStr);
    } catch (e) {
        return { message: result.text, suggestions: ["Ask more", "Leave"] };
    }
}

export async function analyzeEvidence(itemId: string, itemName: string, scenario: Scenario) {
    const systemPrompt = `
        You are the Chief Forensic Analyst at Metro PD.
        Analyze the item: "${itemName}" (ID: ${itemId}).
        
        Scenario Context: ${JSON.stringify(scenario.globalClues)}
        CORE TRUTH (The facts - your analysis must align with this):
        ${JSON.stringify(scenario.truth)}
        
        Generate a "Lab Report". It should be scientific but hint at the truth.
        IMPORTANT: The report MUST be in ENGLISH language.
        Output JSON: { "report": "string" }
    `;

    const result = await generateText({
        model: model,
        system: systemPrompt,
        prompt: "Analyze this.",
    });

    const text = result.text;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);

    try {
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
        return JSON.parse(jsonStr);
    } catch (e) {
        return { report: "Analysis inconclusive. Sample contaminated." };
    }
}

/**
 * Unified image generation using Bria v2.
 * Handles both scenes and characters using the same robust endpoint.
 */
export async function generateFiboImage(
    visuals: Record<string, any>,
    seed?: number,
    aspect_ratio: string = "16:9"
) {
    const FIBO_API_URL = 'https://engine.prod.bria-api.com/v2/image/generate';
    const FIBO_API_KEY = process.env.FIBO_API_KEY;

    console.log('FIBO_API_KEY exists:', !!FIBO_API_KEY);
    // console.log('Visuals being sent:', JSON.stringify(visuals, null, 2));

    // Mock response if no key (for development)
    if (!FIBO_API_KEY) {
        console.warn('FIBO_API_KEY is not set. Returning mock response.');
        return {
            image: 'https://placehold.co/1024x1024/png?text=Bria+API+Mock',
            seed: seed || Math.floor(Math.random() * 1000000)
        };
    }
    try {
        // Sanitize visuals to meet Bria strict requirements
        const sanitizedVisuals = { ...visuals };

        // 1. Ensure 'context' is present
        if (!sanitizedVisuals.context) {
            sanitizedVisuals.context = sanitizedVisuals.short_description || "A cinematic noir detective scene.";
        }

        // 2. Ensure 'background_setting' is present
        if (!sanitizedVisuals.background_setting) {
            sanitizedVisuals.background_setting = "A dimly lit noir scene with atmospheric shadows.";
        }

        // 3. Ensure 'lighting' object is present with required fields
        if (!sanitizedVisuals.lighting) {
            sanitizedVisuals.lighting = {
                conditions: "Dramatic noir lighting",
                direction: "From above and side",
                shadows: "Strong, dramatic shadows"
            };
        } else {
            sanitizedVisuals.lighting = {
                conditions: sanitizedVisuals.lighting.conditions || "Ambient lighting",
                direction: sanitizedVisuals.lighting.direction || "From above",
                shadows: sanitizedVisuals.lighting.shadows || "Soft shadows"
            };
        }

        // 4. Ensure 'aesthetics' object is present with ALL required fields including color_scheme
        if (!sanitizedVisuals.aesthetics) {
            sanitizedVisuals.aesthetics = {
                composition: "Wide angle shot, cinematic framing",
                visual_style: "Film noir, high contrast",
                mood_atmosphere: "Tense, mysterious",
                color_scheme: "Dark tones, muted colors with dramatic highlights"
            };
        } else {
            sanitizedVisuals.aesthetics = {
                composition: sanitizedVisuals.aesthetics.composition || "Balanced composition",
                visual_style: sanitizedVisuals.aesthetics.visual_style || "Cinematic",
                mood_atmosphere: sanitizedVisuals.aesthetics.mood_atmosphere || "Atmospheric",
                color_scheme: sanitizedVisuals.aesthetics.color_scheme || "Natural colors with dramatic contrast"
            };
        }

        // 5. Ensure 'objects' is present, is an array, and each item has required fields
        if (!sanitizedVisuals.objects || !Array.isArray(sanitizedVisuals.objects)) {
            sanitizedVisuals.objects = [];
        } else {
            // Ensure each object has required fields: name, description, relationship
            sanitizedVisuals.objects = sanitizedVisuals.objects.map((obj: any, idx: number) => {
                const newObj = { ...obj };
                if (!newObj.name) {
                    newObj.name = newObj.description?.split(' ').slice(0, 3).join(' ') || `Object ${idx + 1}`;
                }
                if (!newObj.description) {
                    newObj.description = newObj.name || `Object ${idx + 1} in scene`;
                }
                if (!newObj.relationship) {
                    newObj.relationship = `Part of the scene, located at ${newObj.location || 'center'}`;
                }
                return newObj;
            });
        }

        console.log('Sending sanitized visuals to Bria:', JSON.stringify(sanitizedVisuals, null, 2));

        const requestBody: any = {
            structured_prompt: JSON.stringify(sanitizedVisuals),
            aspect_ratio: aspect_ratio,
            steps_num: 50, // Maximum quality (range: 20-50)
            text_guidance_scale: 7.5 // How closely to follow prompt (range: 1-10)
        };

        if (seed) {
            requestBody.seed = seed;
        }

        const response = await fetch(FIBO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api_token': FIBO_API_KEY
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Bria API Error Response:', errorText);
            throw new Error(`Bria API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Bria API Response:', data);

        // POLL for result
        if (data.status_url) {
            // Poll the status URL
            const maxAttempts = 45; // 45 seconds max
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                const statusResponse = await fetch(data.status_url, {
                    headers: { 'api_token': FIBO_API_KEY }
                });

                if (!statusResponse.ok) continue;

                const statusData = await statusResponse.json();

                if (statusData.status === 'COMPLETED') {
                    if (statusData.result && statusData.result.image_url) {
                        return {
                            image: statusData.result.image_url,
                            seed: statusData.result.seed || seed || null
                        };
                    }
                } else if (statusData.status === 'FAILED') {
                    console.error('Bria Generation Failed:', statusData);
                    return { image: null, seed: null };
                }
            }
        }

        return {
            image: data.result_url || data.image_url || null,
            seed: data.seed || seed || null
        };
    } catch (error) {
        console.error('Failed to generate image with Bria:', error);
        return { image: null, seed: null };
    }
}

// Alias for backward compatibility
export const generateFiboScene = generateFiboImage;
