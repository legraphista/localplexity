import {MLCEngine} from "@mlc-ai/web-llm";

// const selectedModel = "gemma-2-2b-it-q4f16_1-MLC";
const selectedModel = "Llama-3.1-8B-Instruct-q4f16_1-MLC";

const engine = new MLCEngine({
  initProgressCallback: (initProgress) => {
    console.log(initProgress);
  }
});
// @ts-ignore
window.engine = engine;

let __loaded = false;
const load = async () => {
  if (__loaded) return;
  __loaded = true;
  await engine.reload(selectedModel, {
    temperature: 0.2,
    top_p: 0.9,
    // context_window_size: 8192,
    context_window_size: -1,
    sliding_window_size: 4096,
    // sliding window with glued start
    attention_sink_size: 128,
  });
}

const loadPromise = load();

export async function makeSummaryWebLLM(query: string, markdowns: string[], progressCallback: (text: string) => void) {
  await loadPromise;

  const userMessage = `
  
Answer the following query "${query.trim()}" using the context provided below. Ignore irrelevant information.
Do not address the user directly.
Answer must be concise, informative, and relevant to the query.
Always write one or more sources (format: <source{number}> ) for each fact, claim, section or paragraph you write. Examples: "Water is wet. <source1>", "Fire is hot. <source1><source2>"

Context:

${markdowns.map((x, i) => `\
<source${i + 1}>
${x.trim()}
</source${i + 1}>\
`).join('\n\n')}

        `.trim()

  console.log(userMessage);

  const asyncChunkGenerator = await engine.chat.completions.create({
    stream: true,
    stream_options: {include_usage: true},
    messages: [
      {
        role: "user",
        content: userMessage
      }
    ],
    // temperature: 0.6,
    // top_p: 0.9,
    max_tokens: 512,
  });

  let message = "";
  for await (const chunk of asyncChunkGenerator) {
    // console.log(chunk);
    const textChunk = chunk.choices[0]?.delta?.content || "";
    message += textChunk;

    progressCallback(textChunk);

    if (chunk.usage) {
      console.log(chunk.usage); // only last chunk has usage
    }
    // engine.interruptGenerate();  // works with interrupt as well
  }

  return message;
}