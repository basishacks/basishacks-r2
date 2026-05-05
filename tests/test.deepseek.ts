import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function testDeepSeek() {
    
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are running a test. Respond Hello World, and after saying that you can make up some random jargon" }],
        model: "deepseek-v4-pro",
        reasoning_effort: "high",
    } as any);

    console.log(completion.choices[0].message.content);

    return true

}