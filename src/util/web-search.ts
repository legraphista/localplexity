import {autocomplete, SafeSearchType, search as ddg_search} from './duckduckgo'

export type {SearchResults} from './duckduckgo/search/search'


export const webSearchDDG = async (query: string) => {
  let error;

  // try 3 times
  for (let i = 0; i < 3; i++) {
    try {
      return await ddg_search(query, {
        safeSearch: SafeSearchType.STRICT,
        // locale: navigator.language,
      });
    } catch (e) {
      console.error('webSearchDDG failed at try', i + 1, e);
      // add a space to the query to avoid anomaly detection
      query += ' ';
      // save the error
      error = e;
    }
  }

  // if all attempts failed, throw the last error
  throw error;
}

// @ts-ignore
window.ddg_search = webSearchDDG


const autocompleteCache = new Map<string, string[]>();
export const webSearchAutoCompleteDDG = async (query: string) => {
  if (autocompleteCache.has(query)) {
    return autocompleteCache.get(query);
  }

  const data = await autocomplete(query, navigator.language);
  const results = data.map(x => x.phrase);
  autocompleteCache.set(query, results);

  return results;
}

// @ts-ignore
window.ddg_autocomplete = webSearchAutoCompleteDDG
