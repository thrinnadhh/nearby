import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const CODING_SYSTEM_PROMPT = `You are an expert software engineer. When you encounter a problem you're uncertain about, use the advisor tool to get guidance before proceeding. Always write clean, well-commented code.`;

export async function askAdvisor(userMessage) {
    const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: CODING_SYSTEM_PROMPT,
        tools: [
            {
                type: "advisor_20260301",
                name: "advisor",
                model: "claude-opus-4-6",
                max_uses: 3,
            },
        ],
        messages: [
            {
                role: "user",
                content: userMessage,
            },
        ],
        headers: {
            "anthropic-beta": "advisor-tool-2026-03-01",
        },
    });

    for (const block of response.content) {
        if (block.type === "text") {
            return block.text;  // return the code/answer
        }
    }
}