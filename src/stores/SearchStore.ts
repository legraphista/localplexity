import {action, computed, makeObservable, observable, reaction, runInAction, toJS} from "mobx";
import {DataFrame} from "@src/stores/DataFrame";
import {createContext} from "@src/util/react-context-builder";
import {webSearchAutoCompleteDDG, webSearchDDG} from "@src/util/web-search";
import {distillWebpage, html2markdown, scrape} from "@src/util/scrape";
import {Readability} from "@mozilla/readability";
import {webLLM} from "@src/util/webllm";
import {throttle} from "throttle-debounce";

class SearchStore extends DataFrame<{
  searchResultsUrls: string[],
  markdowns: string[],
  summaryRaw: string
}> {

  @observable
  // query = "what happened to the market on monday?";
  query = "";

  @observable
  searchResultsUrls: string[] = [];

  @observable
  scrapedSites: { url: string, html: string, parsed: ReturnType<Readability['parse']> | null }[] = [];

  @observable
  markdowns: string[] = [];

  @observable
  summaryRaw: string = '';

  @observable
  statusText: string | null = null;

  @observable
  summaryInProgress = false;

  @observable
  autocompleteResults: string[] = [
    // 'why is the sky blue',
    // 'how to boil an egg',
    // 'how to make a cake',
    // 'how to make a website',
    // 'how to make a resume',
  ];

  @computed
  get summary() {
    let summary = this.summaryRaw.trim();

    const usedSources: {url: string, title: string, icon: string, origin: string}[] = [];

    for(let i = 0; i < this.markdowns.length; i++) {
      if (summary.indexOf(`[source ${i + 1}]`) === -1) {
        continue;
      }
      const sourceURL = this.searchResultsUrls[i];
      const website = this.scrapedSites.find(x => x.url === sourceURL);
      if(!website) {
        console.warn('Failed to find website for source', sourceURL);
        continue;
      }
      const origin = new URL(sourceURL).host;
      usedSources.push({
        url: sourceURL,
        title: website.parsed.title,
        icon: `https://www.google.com/s2/favicons?domain=${origin}&sz=128`,
        origin
      });

      summary = summary.replace(
        new RegExp(`(?:\\[|\\<)source\\s?${i + 1}(?:\\]|\\>)`, 'gi'),
        `[\\[${usedSources.length}\\]](${sourceURL})`
      );
    }

    return {text: summary, usedSources};
  }

  private disposables: (() => void)[] = [];

  constructor() {
    super();
    makeObservable(this);

    this.disposables.push(reaction(
      () => this.query,
      throttle(1000, this.refreshAutoComplete, {noLeading: true, noTrailing: false})
    ))

    // @ts-ignore
    window.search = this;
  }

  uninit = () => {
    for (const disposer of this.disposables) {
      disposer();
    }
  }

  @action
  setQuery(query: string) {
    this.query = query
  }

  refreshAutoComplete = async () => {
    if (!this.query.trim()) {
      runInAction(() => {
        this.autocompleteResults = [];
      });
      return;
    }

    // don't update auto-complete results if already searching
    if (this.fetching) {
      return;
    }

    const results = await webSearchAutoCompleteDDG(this.query);

    // don't update auto-complete results if already searching
    if (this.fetching) {
      return;
    }
    runInAction(() => {
      this.autocompleteResults = results.slice(0, 5);
    });
  }

  protected async fetch(abortSignal: AbortSignal) {

    try {
      console.log('fetching', this.query);

      runInAction(() => {
        this.summaryRaw = '';
        this.searchResultsUrls = [];
        this.markdowns = [];
        this.scrapedSites = [];
        this.autocompleteResults = [];

        this.statusText = 'Searching ...';
      });

      await new Promise(_ => setTimeout(_, 1000));

      const searchResults = await webSearchDDG(this.query);
      if (abortSignal.aborted) return;

      const candidateUrls = searchResults.results
        .map(result => result.url)
        // filter out video urls
        .filter(url => !(
          url.indexOf('youtube.com') !== -1 ||
          url.indexOf('youtu.be') !== -1 ||
          url.indexOf('vimeo.com') !== -1 ||
          url.indexOf('dailymotion.com') !== -1 ||
          url.indexOf('v.redd.it') !== -1 ||
          url.indexOf('tiktok.com') !== -1
        ))
        .slice(0, 5);

      runInAction(() => {
        this.searchResultsUrls = candidateUrls;
        this.statusText = 'Fetching websites ...';
      });

      console.log('scraping', candidateUrls);

      const scrapedSites = (await Promise.all(candidateUrls.map(scrape)))
        .map(((x, i) => [candidateUrls[i], x] as const))
        .filter(([_, x]) => x.trim())
        .map(([url, html]) => {
          try {
            return {url, html, parsed: distillWebpage(html)};
          } catch (e) {
            console.error(e);
            return {url, html, parsed: null};
          }
        })
        .filter(({parsed}) => !!parsed)
        .slice(0, 3);

      if (abortSignal.aborted) return;

      if (scrapedSites.length === 0) {
        throw new Error('No content found');
      }

      runInAction(() => {
        this.scrapedSites = scrapedSites;
      })

      const markdowns = scrapedSites.map(x => x.parsed).map(x => html2markdown(`<title>${x.title}</title>\n${x.content}`));

      runInAction(() => {
        this.markdowns = markdowns;
        this.summaryRaw = '';
      });

      console.log('making summary', markdowns);
      runInAction(() => {
        this.statusText = 'Reading pages ...';
        this.summaryInProgress = true;
      });

      const summaryRaw = await webLLM.summarize(this.query, markdowns, action((text) => {
        this.statusText = null;
        this.summaryRaw += text;
      }), abortSignal);

      if (abortSignal.aborted) {
        runInAction(() => {
          this.summaryRaw = '';
        })
        return;
      }

      console.log('summary', summaryRaw);
      runInAction(() => {
        this.summaryInProgress = false;
        this.statusText = null;
      });
      return {
        searchResults,
        markdowns,
        summaryRaw
      }
    } catch (e) {
      // cleanup
      runInAction(() => {
        this.scrapedSites = [];
        this.markdowns = [];
        this.summaryRaw = '';
        this.searchResultsUrls = [];
        this.statusText = null;

        this.summaryInProgress = false
      });

      // rethrow
      throw e;
    }
  }

  private abortController: AbortController | null = null;
  doSearch = async () => {
    this.abortController?.abort();

    this.abortController = new AbortController();
    return this.update(this.abortController.signal);
  }
}

export const {
  useStore: useSearchStore,
  Provider: SearchProvider
} = createContext(SearchStore, {
  dispose: s => s.uninit()
})

// @ts-ignore
window.toJS = toJS;