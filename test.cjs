(async () => {

  const DDG = require("duck-duck-scrape")
  const searchResults = await DDG.search('how to boil eggs', {
    safeSearch: DDG.SafeSearchType.STRICT
  });

// DDG.stocks('aapl')
// DDG.currency('usd', 'eur', 1)
// DDG.dictionaryDefinition('happy')

  // console.log(searchResults);

  const url = searchResults.results[0].url
  console.log(url)

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
  const result = await response.text();
  // console.log(result);

  var TurndownService = require('turndown')
  var turndownService = new TurndownService()
  var markdown = turndownService.remove(['script', 'style']).turndown(result)
  // console.log(markdown)

  var {Readability} = require('@mozilla/readability');
  var {JSDOM} = require('jsdom');
  var doc = new JSDOM(result, {url});
  parsed_article = new Readability(doc.window.document).parse();

  nhm = require('node-html-markdown')
  markdown = nhm.NodeHtmlMarkdown.translate(parsed_article.content)

  console.log(markdown)
})()