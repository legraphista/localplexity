# <img src="https://raw.githubusercontent.com/legraphista/localplexity/master/assets/images/logo.png" alt="LocalPlexity Logo" width="32" height="32"/> [LocalPlexity](https://localplexity.pages.dev/)

[LocalPlexity](https://localplexity.pages.dev/) is a lite version of [Perplexity](https://www.perplexity.ai/) aimed at 100% privacy and openness. Everything is done locally, in your browser, from searching the web to distilling a response for your question.

You can visit the website at [localplexity.pages.dev](https://localplexity.pages.dev/).

![LocalPlexity Screenshot](https://raw.githubusercontent.com/legraphista/localplexity/master/assets/images/screenshot.png)

## Features

- Local search and response generation
- 100% privacy and openness
- Anonymous searches using a proxy
- Open source
- No ads / No tracking 

## How It Works

LocalPlexity operates entirely within your browser to ensure complete privacy and openness. Here's a brief overview of how it works:

1. **Local Search and Response Generation**: When you enter a search query, LocalPlexity scrapes DuckDuckGo search results to find relevant information. 

2. **Data Processing**: The websites are fetched, then `@mozilla/readability` extracts the essential content and `node-html-markdown` is converting HTML to Markdown.

3. **Response Generation**: The data is then passed to a small LLM to generate a response to your query.

All operations are performed locally in your browser, with no personal data being sent to external servers. All communication is anonymized using a proxy to ensure that your searches are not tracked.

___

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/legraphista/localplexity.git
    cd localplexity
    ```

2. Install dependencies:
    ```sh
    yarn install
    ```

## Usage

1. Start the development server:
    ```sh
    yarn start
    ```

2. Open your browser and navigate to `http://localhost:3000`.

## License
This project is licensed under the AGPL-3.0 License. See the LICENSE file for details.
