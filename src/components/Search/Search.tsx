import React, {useCallback, useEffect, useState} from 'react';
import {SearchProvider, useSearchStore} from "@src/stores/SearchStore";
import {observer} from "mobx-react-lite";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";

import css from './Search.module.scss';
import commonCss from '@src/components/common.module.scss';

import {webLLM} from "@src/util/webllm";
import classNames from "classnames";
import {ModelSwitch} from "@src/components/Search/ModelSwitch/ModelSwitch";


const SearchInput = observer(() => {
  const search = useSearchStore();

  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);

  useEffect(() => {
    setAutocompleteIndex(-1);
  }, [search.query]);

  return (
    <div
      className={css.searchContainer}
      onKeyDown={e => {
        if(e.code === 'ArrowDown') {
          setAutocompleteIndex((a) => Math.min(a + 1, search.autocompleteResults.length - 1));
        }
        if(e.code === 'ArrowUp') {
          setAutocompleteIndex((a) => Math.max(a - 1, -1));
        }
        if(e.code === 'ArrowRight') {
          if (autocompleteIndex >= 0) {
            search.setQuery(search.autocompleteResults[autocompleteIndex]);
          }
        }
        if(e.code === 'Enter') {
          if (autocompleteIndex >= 0) {
            search.setQuery(search.autocompleteResults[autocompleteIndex]);
            search.update().catch(e => console.error(e));
          }
        }
      }}
    >
      <div className={css.inputContainer}>
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

        <div className={css.autocompleteContainer}>
          {search.autocompleteResults.map((result, i) => {
            return (
              <div
                key={result}
                className={classNames(css.item, i === autocompleteIndex && css.active)}
                onClick={() => {
                  search.setQuery(result);
                  search.update().catch(e => console.error(e));
                }}
              >
                {result}
              </div>
            )
          })}
        </div>
      </div>


      <div className={css.controls}>
        <ModelSwitch
          value={!webLLM.isSmallModel}
          onChange={webLLM.toggleModel}
          disabled={webLLM.status.loading || search.fetching}
          label="Inteligence"
        />

        {(webLLM.status.loading && webLLM.status.stepName)
          ? (
            <div className={classNames(commonCss.fancyTextAnimation)}>
              {webLLM.status.stepName} {(webLLM.status.progress * 100).toFixed(0)}%
            </div>
          )
          : search.statusText
            ? <div className={classNames(commonCss.fancyTextAnimation)}>{search.statusText}</div>
            : null}
      </div>
    </div>
  )

});


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

      <SearchInput/>

      {/*{search.statusText &&*/}
      {/*  <div className={classNames(css.status, commonCss.fancyTextAnimation)}>{search.statusText}</div>}*/}

      {error && <div className={css.error}>{error.message}</div>}

      {search.summary.text && (<>
        <MarkdownPreview source={search.summary.text} className={css.textOutput}/>

        {!search.summaryInProgress && search.summary?.usedSources && (
          <div className={css.sourceList}>
            {search.summary.usedSources.map((source, i) => (
              <div key={source.url} className={css.sourceItem}>
                <img
                  src={source.icon}
                  alt={source.origin}
                />
                <div className={css.info}>
                  <a
                    href={source.url}
                    target="_blank"
                    className={css.title}
                  >
                    {source.title}
                  </a>
                  <div className={css.subtitle}>
                    [{i + 1}] | {source.origin}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </>)}

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