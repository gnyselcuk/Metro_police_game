
export interface FiboGenerationOptions {
    prompt: Record<string, any>; // The JSON structure for FIBO
    seed?: number;
    negative_prompt?: string;
}

export interface FiboResponse {
    image_url: string;
    seed: number;
    generation_id: string;
}

const FIBO_API_URL = process.env.NEXT_PUBLIC_FIBO_API_URL || 'https://api.fibo.ai/v1/generate'; // Placeholder URL
const FIBO_API_KEY = process.env.FIBO_API_KEY;

/**
 * Generates an image using the FIBO JSON-native API.
 * @param options The generation options including the JSON prompt.
 * @returns The generated image URL and metadata.
 */
export async function generateFiboImage(options: FiboGenerationOptions): Promise<FiboResponse> {
    // TODO: Remove this mock when actual API key is available
    if (!FIBO_API_KEY) {
        console.warn('FIBO_API_KEY is not set. Returning mock response.');
        return {
            image_url: 'https://placehold.co/1024x1024/png?text=FIBO+Generated+Image',
            seed: options.seed || Math.floor(Math.random() * 1000000),
            generation_id: 'mock_gen_' + Date.now()
        };
    }

    try {
        const response = await fetch(FIBO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FIBO_API_KEY}`
            },
            body: JSON.stringify(options)
        });

        if (!response.ok) {
            throw new Error(`FIBO API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to generate image with FIBO:', error);
        throw error;
    }
}

/**
 * Refines an existing image by modifying specific objects in the JSON prompt
 * while keeping the rest of the scene consistent (using the same seed).
 */
export async function refineFiboImage(
    originalPrompt: Record<string, any>,
    modifications: Record<string, any>,
    seed: number
): Promise<FiboResponse> {
    // Merge modifications into the original prompt
    // This is a shallow merge for demonstration; a deep merge might be needed depending on JSON structure
    const newPrompt = { ...originalPrompt, ...modifications };

    return generateFiboImage({
        prompt: newPrompt,
        seed: seed
    });
}
