import {MLCEngine} from "@mlc-ai/web-llm";
import {LLMChatPipeline} from "@mlc-ai/web-llm/lib/llm_chat";
import {ChatCompletionMessageParam} from "@mlc-ai/web-llm/lib/openai_api_protocols/chat_completion";
import {action, computed, makeObservable, observable} from "mobx";

// todo this is a temp class
//      should move everything to the mobx store
class WebLLMStatus {
  @observable
  loading: boolean = false;

  @observable
  stepName: string = '';

  @observable
  chunks: [number, number] = [0, 0];

  @computed
  get progress() {
    return this.chunks[1] > 0
      ? this.chunks[0] / this.chunks[1]
      : 0;
  }

  constructor() {
    makeObservable(this);
  }

  @action
  setLoading(loading: boolean) {
    this.loading = loading;
  }
}

export const webLLMStatus = new WebLLMStatus();
// @ts-ignore
window.webLLMStatus = webLLMStatus;

const selectedModel = "gemma-2-2b-it-q4f16_1-MLC";
// const selectedModel = "Llama-3.1-8B-Instruct-q4f16_1-MLC";

const engine = new MLCEngine({
  initProgressCallback: action((initProgress) => {
    const {text, progress} = initProgress;

    if (text.toLowerCase().indexOf('loading model') !== -1) {
      webLLMStatus.stepName = 'Loading LLM';
    } else if (text.toLowerCase().indexOf('fetching param') !== -1) {
      webLLMStatus.stepName = 'Downloading Model';
    } else if (text.toLowerCase().indexOf('shader modules') !== -1) {
      webLLMStatus.stepName = 'Compiling Shader Modules';
    } else {
      webLLMStatus.stepName = '';
    }

    webLLMStatus.chunks = (/\[(\d+)\/(\d+)\]/.exec(text)?.slice(1) || [0, 0]).map(Number) as [number, number];

    console.log(initProgress);
  })
});
// @ts-ignore
window.engine = engine;

let __loaded = false;
const load = async () => {
  if (__loaded) return;
  __loaded = true;
  webLLMStatus.setLoading(true);
  await engine.reload(selectedModel, {
    temperature: 0.0,
    top_p: 0.9,
    // context_window_size: 8192,
    context_window_size: -1,
    sliding_window_size: 4096,
    // sliding window with glued start
    attention_sink_size: 256,
  });
  webLLMStatus.setLoading(false);
}

const loadPromise = load();

export async function makeSummaryWebLLM(query: string, markdowns: string[], progressCallback: (text: string) => void) {
  await loadPromise;

  await engine.resetChat(false);

  // @ts-ignore
  const pipeline = engine.getPipeline() as LLMChatPipeline;

  // @ts-ignore
  const config = pipeline.config;

  // @ts-ignore
  const tokenizer = pipeline.tokenizer;

  const markdownTokens = markdowns.map(x => tokenizer.encode(x));
  for(let i = 0; i < markdownTokens.length; i++) {
    const token = markdownTokens[i];
    console.log(`source ${i + 1}: ${token.length} tokens`);
  }

  const truncatedMarkdownTokens = markdownTokens.map(x => x.slice(0, 1024));
  const truncatedMarkdowns = truncatedMarkdownTokens.map(x => tokenizer.decode(x));

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `
You are an agent that answers user queries based on a given context. You will answer the question and not write anything else before or after.

Write a short answer to "${query.trim()}" based on the context I will give you. Use only the context, not any previous knowledge.

Write citations in brackets of the source referenced in the answer, example: "[source 1]", "[source 1] [source 2]". Citations must be next to the information they reference.

The answer must be informative and well structured. Use all sources from the context to create a coherent answer. Remember to write the citations.

`.trim(),
    },
//     {
//       role: 'assistant',
//       content: `
// I will provide a short answer to "${query.trim()}" based on the context you provide and using only that context. I'll use citations where needed.
//
// Please give me the context.
//       `.trim()
//     },
    {
      role: 'user',
      content: `
${truncatedMarkdowns.map((x, i) => `\
[source ${i + 1}]
${x.trim()}

`).join('\n\n')}
`.trim()
    }
  ]

    console.log(messages);


  const asyncChunkGenerator = await engine.chat.completions.create({
    stream: true,
    stream_options: {include_usage: true},
    messages,
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