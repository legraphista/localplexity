// import {SafeSearchType, search as ddg_search} from './duckduckgo'
//
// export {SafeSearchType, SearchResults} from './duckduckgo'
//
// export const search = async (query: string) => {
//   return await ddg_search(query, {
//     safeSearch: SafeSearchType.STRICT,
//     locale: navigator.language
//   });
// }

export const bingSearch = async (query: string) => {
  //https://rapidapi.com/Glavier/api/bing23/playground/apiendpoint_77b45f51-bced-4524-a186-efd529611368
  const url = `https://bing23.p.rapidapi.com/v1/web-search?query=${encodeURIComponent(query)}&offset=0&language=en`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': '25ddb299e8msh2c3c672fc41e54ep120933jsn89a98d5bafb0',
      'x-rapidapi-host': 'bing23.p.rapidapi.com'
    }
  };

  const response = await fetch(url, options);
  const result = await response.json();
  return result as {
    results: {
      type: string
      url: string
      //...
    }[]
  }
}

// https://rapidapi.com/Glavier/api/web-search30/playground/apiendpoint_ed083185-9e22-45c6-93f8-76762bd3d0f8
export const webSearch = async (query: string) => {
  const url = `https://web-search30.p.rapidapi.com/?q=${encodeURIComponent(query)}&limit=5`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': '25ddb299e8msh2c3c672fc41e54ep120933jsn89a98d5bafb0',
      'x-rapidapi-host': 'web-search30.p.rapidapi.com'
    }
  };

  const response = await fetch(url, options);
  const result = await response.json();
  return result as {
    results: {
      position: number
      url: string
      title: string
      //...
    }[]
  }
}