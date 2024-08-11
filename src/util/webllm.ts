import {action, computed, makeObservable, observable, reaction, runInAction} from "mobx";
import {Lock} from "async-await-mutex-lock";
import type {LLMChatPipeline} from "@mlc-ai/web-llm/lib/llm_chat";
import type {ChatCompletionMessageParam} from "@mlc-ai/web-llm/lib/openai_api_protocols/chat_completion";
import type {MLCEngine} from "@mlc-ai/web-llm";

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

const SMALL_MODEL = "gemma-2-2b-it-q4f16_1-MLC";
const LARGE_MODEL = "Llama-3.1-8B-Instruct-q4f16_1-MLC";

class WebLLM {
  status = new WebLLMStatus();

  @observable
  model: string = "";

  @computed
  get isSmallModel() {
    return this.model === SMALL_MODEL;
  }

  private engine: MLCEngine | null = null;
  private tokenizer: {
    encode: (text: string) => Int32Array[];
    decode: (ids: Int32Array[]) => string;
  } | null = null;

  private __LLM_LOCK = new Lock();
  private __loaded = false;
  private load = async () => {
    if (this.__loaded) return;

    await this.__LLM_LOCK.acquire();

    try {
      this.status.setLoading(true);

      if (!this.engine) {
        const {MLCEngine} = await import("@mlc-ai/web-llm");

        this.engine = new MLCEngine({
          initProgressCallback: action((initProgress) => {
            const {text, progress} = initProgress;

            if (text.toLowerCase().indexOf('loading model') !== -1) {
              this.status.stepName = 'Loading LLM';
            } else if (text.toLowerCase().indexOf('fetching param') !== -1) {
              this.status.stepName = 'Downloading Model';
            } else if (text.toLowerCase().indexOf('shader modules') !== -1) {
              this.status.stepName = 'Compiling Shader Modules';
            } else {
              this.status.stepName = '';
            }

            this.status.chunks = (/\[(\d+)\/(\d+)\]/.exec(text)?.slice(1) || [0, 0]).map(Number) as [number, number];
          })
        });
      }

      await this.engine.reload(this.model, {
        temperature: 0.0,
        top_p: 0.9,
        // context_window_size: 8192,
        context_window_size: -1,
        sliding_window_size: 4096,
        // sliding window with glued start
        attention_sink_size: 256,
      });

      // @ts-ignore
      const pipeline = this.engine.getPipeline() as LLMChatPipeline;

      // @ts-ignore
      this.tokenizer = pipeline.tokenizer;

      // save the model name after we successfully loaded it
      this.savePreferredModelName();

      this.status.setLoading(false);
    } finally {
      this.__LLM_LOCK.release();
    }
  }

  protected disposers: (() => void)[] = [];

  constructor() {
    makeObservable(this);
    this.loadPreferredModelName();
  }

  async init() {
    this.disposers.push(
      reaction(() => this.model, () => {
        // add a small delay for the animation to show
        // loading the model (like it is right now on the main thread) is stuttering the animation
        setTimeout(this.load, 100);
      })
    );
    await this.load();
  }

  async deinit() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  @action
  loadPreferredModelName() {
    this.model = localStorage.getItem('webllm:model') || SMALL_MODEL;
  }
  savePreferredModelName() {
    localStorage.setItem('webllm:model', this.model);
  }

  @action
  setModel(model: string) {
    this.model = model;
  }

  switchToSmallModel = () => this.setModel(SMALL_MODEL);
  switchToLargeModel = () => this.setModel(LARGE_MODEL);
  toggleModel = () => this.setModel(this.isSmallModel ? LARGE_MODEL : SMALL_MODEL);

  async summarize(query: string, markdowns: string[], chunkCb: (text: string) => void) {
    // this waits for the engine to be loaded
    // and prevents multiple calls to the engine
    await this.__LLM_LOCK.acquire();
    try {
      const engine = this.engine;
      if (!engine) {
        throw new Error('Engine not loaded');
      }

      await engine.resetChat(false);

      // encode markdowns to count tokens
      const markdownTokens = markdowns.map(x => this.tokenizer.encode(x));
      for(let i = 0; i < markdownTokens.length; i++) {
        const token = markdownTokens[i];
        console.log(`source ${i + 1}: ${token.length} tokens`);
      }

      const truncatedMarkdownTokens = markdownTokens.map(x => x.slice(0, 1024));
      const truncatedMarkdowns = truncatedMarkdownTokens.map(x => this.tokenizer.decode(x));

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

        chunkCb(textChunk);

        if (chunk.usage) {
          // only last chunk has usage
          console.log(chunk.usage);
        }
        // engine.interruptGenerate();
      }

      return message;

    } finally {
      this.__LLM_LOCK.release();
    }
  }
}

// singleton
export const webLLM = new WebLLM();
// @ts-ignore
window.webLLM = webLLM;

webLLM.init().catch(e => console.error(e));
