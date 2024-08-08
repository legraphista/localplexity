import {autocomplete, getVQD, SafeSearchType, search as ddg_search} from './duckduckgo'

export type {SearchResults} from './duckduckgo/search/search'


export const webSearchDDG = async (query: string) => {
  return await ddg_search(query, {
    safeSearch: SafeSearchType.STRICT,
    // locale: navigator.language,
  });
}

// @ts-ignore
window.ddg_search = webSearchDDG


export const webSearchAutoCompleteDDG = async (query: string) => {
  return autocomplete(query, navigator.language)
}

// @ts-ignore
window.ddg_autocomplete = webSearchAutoCompleteDDG
