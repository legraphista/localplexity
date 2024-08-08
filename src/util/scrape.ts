import {Readability} from "@mozilla/readability";
import {NodeHtmlMarkdown} from "node-html-markdown";

export async function scrape(url: string) {
  const options = {
    method: 'POST',
    headers: {
      'x-rapidapi-key': '25ddb299e8msh2c3c672fc41e54ep120933jsn89a98d5bafb0',
      'x-rapidapi-host': 'markdown1.p.rapidapi.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url
    })
  };

  const response = await fetch('https://markdown1.p.rapidapi.com/html', options);
  return await response.text();
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