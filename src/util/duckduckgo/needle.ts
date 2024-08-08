import type {NeedleOptions, NeedleResponse} from "needle";
import {proxy} from "@src/util/proxy";

export {NeedleOptions};

class NeedleAgent {

  async get(url: string, options: NeedleOptions = {}) {
    const response = await this.makeRequest(url, 'GET', null, options);
    return this.processResponse(response);
  }

  async post(url: string, data: any = null, options: NeedleOptions = {}) {
    const response = await this.makeRequest(url, 'POST', data, options);
    return this.processResponse(response);
  }

  async put(url: string, data: any = null, options: NeedleOptions = {}) {
    const response = await this.makeRequest(url, 'PUT', data, options);
    return this.processResponse(response);
  }

  async delete(url: string, data: any = null, options: NeedleOptions = {}) {
    const response = await this.makeRequest(url, 'DELETE', data, options);
    return this.processResponse(response);
  }

  makeRequest = async (url: string, method: string, data: any, options: NeedleOptions | null = null) => {
    const fetchOptions: RequestInit = {
      method,
      // @ts-ignore
      headers: options?.headers || {},
    };

    if (data) {
      if (Array.isArray(fetchOptions.headers)) {
        fetchOptions.headers.push(['Content-Type', 'application/json']);
      } else if (fetchOptions.headers instanceof Headers) {
        fetchOptions.headers.set('Content-Type', 'application/json');
      } else {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    console.log('url', url);
    console.log('fetchOptions', fetchOptions);

    return proxy(url, {
      body: data,
      headers: fetchOptions.headers,
      method: fetchOptions.method,
    });

    // const response = await fetch('https://cors-proxy1.p.rapidapi.com/v1', {
    //   method: 'POST',
    //   headers: {
    //     'x-rapidapi-key': '25ddb299e8msh2c3c672fc41e54ep120933jsn89a98d5bafb0',
    //     'x-rapidapi-host': 'cors-proxy1.p.rapidapi.com',
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     url: url,
    //     method,
    //     // params: {},
    //     // data: {},
    //     json_data: data,
    //     headers: fetchOptions.headers,
    //     cookies: {}
    //   })
    // });
    // return response
  }

  async processResponse(response: Response): Promise<NeedleResponse> {
    const {body, ...rest} = response;

    const text = await response.text();
    return {
      ...rest,
      body: text,
      bytes: parseInt(rest.headers?.get('content-length') || `${text.length}`),
      // @ts-ignore
      cookies: this.parseCookies(response.headers.get('set-cookie')),
    };
  }

  parseCookies(setCookieHeader: string | null) {
    // Add proper cookie parsing code here
    return setCookieHeader;
  }
}

const agent = new NeedleAgent();
export default async function needle(method: string, url: string, dataOrOptions: any | NeedleOptions = null, options?: NeedleOptions) {
  const resp = await agent.makeRequest(url, method, options ? dataOrOptions : null, options || dataOrOptions);
  return await agent.processResponse(resp);
}
