import {Readability} from "@mozilla/readability";
import {NodeHtmlMarkdown} from "node-html-markdown";
import {proxy} from "@src/util/proxy";

export async function scrapeWithTimeout(url: string, timeout: number = 2500): Promise<string> {
  const abortController = new AbortController();

  return Promise.race<string>([
    proxy(url, {signal: abortController.signal}).then(r => r.text()),
    new Promise((_, reject) => setTimeout(() => {
      abortController.abort();
      reject(new Error(`${url} timeout`));
    }, timeout))
  ]);
}

export async function scrape(url: string) {
  try {
    return await scrapeWithTimeout(url);
  } catch (e) {
    console.error(e);
    return '';
  }
}

export function distillWebpage(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  const htmlContent = html;
  const body = iframeDoc.body;

  while (body.firstChild) {
    body.removeChild(body.firstChild);
  }

  const container = iframeDoc.createElement('div');
  container.innerHTML = htmlContent;

  body.appendChild(container);

  const response = new Readability(iframeDoc).parse();

  document.body.removeChild(iframe);
  return response;
}

export function html2markdown(html: string) {
  return NodeHtmlMarkdown.translate(html, {
    keepDataImages: false,
    maxConsecutiveNewlines: 2,
    ignore: ['a', 'img', 'script', 'style', 'svg', 'header', 'footer', 'nav', 'aside', 'form', 'input', 'button', 'iframe',
      'object', 'embed', 'video', 'audio', 'canvas', 'map', 'area', 'base', 'link', 'meta', 'title', 'head', 'col', 'colgroup']
  });
}