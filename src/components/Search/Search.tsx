import React from 'react';
import {SearchProvider, useSearchStore} from "@src/stores/SearchStore";
import {observer} from "mobx-react-lite";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";

import css from './Search.module.scss';
import {types} from "sass";
import String = types.String;
import {webLLMStatus} from "@src/util/webllm";


const _Search = observer(() => {


  const search = useSearchStore();
  const error = search.error;

  return (
    <div className={css.root}>
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
            search.update().catch(e => console.error(e));
          }
        }}
      />

      {webLLMStatus.loading && webLLMStatus.stepName && (
        <div className={css.status}>
          {webLLMStatus.stepName} {(webLLMStatus.progress * 100).toFixed(0)}%
        </div>
      )}

      {search.statusText && <div className={css.status}>{search.statusText}</div>}

      {error && <div className={css.error}>{error.message}</div>}

      <MarkdownPreview source={search.summary.text} className={css.textOutput}/>

      {!search.summaryInProgress && search.summary?.usedSources && (
        <div className={css.sourceList}>
          {search.summary.usedSources.map((source, i) => (
            <div key={source.url} className={css.sourceItem}>
              <img src={source.icon}/>
              <a href={source.url} target="_blank" rel="noreferrer">[{i+1}] {source.title}</a>
            </div>
          ))}
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