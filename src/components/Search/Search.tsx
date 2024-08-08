import React from 'react';
import {SearchProvider, useSearchStore} from "@src/stores/SearchStore";
import {observer} from "mobx-react-lite";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";

import css from './Search.module.scss';


const _Search = observer(() => {

  const search = useSearchStore();
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

      {search.statusText && <div className={css.status}>{search.statusText}</div>}

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