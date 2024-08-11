import React, {useEffect, useState} from 'react';
import {SearchProvider, useSearchStore} from "@src/stores/SearchStore";
import {observer} from "mobx-react-lite";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";

import css from './Search.module.scss';
import commonCss from '@src/components/common.module.scss';

import {webLLM} from "@src/util/webllm";
import classNames from "classnames";


const _Search = observer(() => {

  const search = useSearchStore();
  const error = search.error;

  const [showIntro, setShowIntro] = useState(true);
  useEffect(() => {
    if (search.fetching) {
      setShowIntro(false);
    }
  }, [search.fetching]);

  return (
    <div className={css.root}>
      <h1 className={classNames(search.fetching && commonCss.fancyTextAnimation)}>LocalPlexity</h1>

      <input
        className={css.input}
        type="text"
        placeholder="Search"
        onChange={e => search.setQuery(e.target.value)}
        value={search.query}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (search.query.trim()) {
              search.update().catch(e => console.error(e));
            }
          }
        }}
      />

      {webLLM.status.loading && webLLM.status.stepName && (
        <div className={classNames(css.status, commonCss.fancyTextAnimation)}>
          {webLLM.status.stepName} {(webLLM.status.progress * 100).toFixed(0)}%
        </div>
      )}

      {search.statusText && <div className={classNames(css.status, commonCss.fancyTextAnimation)}>{search.statusText}</div>}

      {error && <div className={css.error}>{error.message}</div>}

      <MarkdownPreview source={search.summary.text} className={css.textOutput}/>

      {!search.summaryInProgress && search.summary?.usedSources && (
        <div className={css.sourceList}>
          {search.summary.usedSources.map((source, i) => (
            <div key={source.url} className={css.sourceItem}>
              <img src={source.icon}/>
              <a href={source.url} target="_blank" rel="noreferrer">[{i + 1}] {source.title}</a>
            </div>
          ))}
        </div>
      )}

      {showIntro && (
        <div className={css.intro}>
          <h2>What is LocalPlexity?</h2>
          <p>LocalPlexity is a lite version of <a href="https://www.perplexity.ai/" target="_blank">Perplexity</a> aimed
            at 100% privacy and openness.</p>
          <p>Everything is done locally, in your browser<sup>*</sup>, from searching the web to distilling a response
            for your question. </p>
          <p>You can find the source code for this project on <a href="https://github.com/legraphista/localplexity"
                                                                 target="_blank">GitHub</a>.</p>
          <p>Enter a search query above and press Enter to search.</p>

          <hr/>
          <sub>
            * We use a <a href="https://github.com/legraphista/localplexity/blob/master/proxy.worker.js"
                          target="_blank">proxy</a> to bypass <a
            href="https://github.com/legraphista/localplexity/wiki/What-is-CORS%3F">CORS</a> and pass-through web data.
            This also makes your searches anonymous. 😉
          </sub>
        </div>
      )}
    </div>
  );
})

export function Search() {
  return (
    <SearchProvider>
      <_Search/>
    </SearchProvider>
  )
}