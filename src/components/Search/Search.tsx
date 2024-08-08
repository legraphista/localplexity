import React from 'react';
import {SearchProvider, useSearchStore} from "@src/stores/SearchStore";
import {observer} from "mobx-react-lite";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";

import css from './Search.module.scss';

const _Search = observer(() => {
  const search = useSearchStore();
  const data = search.data;
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

      <MarkdownPreview source={search.summary} className={css.textOutput}/>
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