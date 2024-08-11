import {action, makeObservable, observable} from "mobx";

export type DataFrameOptions = {
  autoFetch?: boolean
}

export abstract class DataFrame<T, FetchT = any> {

  @observable
  fetching: boolean = false;
  @observable
  data: T | null = null;
  @observable.ref
  error: Error | null = null;

  keepPreviousDataWhiteFetching = true;

  private lastUpdateRequest: number = 0;
  private promise: Promise<void> | null = null;

  constructor(options: DataFrameOptions = {}) {
    makeObservable(this);

    if (options.autoFetch) {
      this.get().catch(action(e => this.error = e));
    }
  }

  protected abstract fetch(abortSignal: AbortSignal): Promise<FetchT>

  protected postProcess(fetchedData: FetchT): T {
    return fetchedData as unknown as T;
  }

  @action
  private setData(data: DataFrame<T>['data']) {
    this.data = data;
  }

  @action
  private setError(error: DataFrame<T>['error']) {
    this.error = error;
  }

  @action
  private setFetching(fetching: DataFrame<T>['fetching']) {
    this.fetching = fetching;
  }

  private internalFetch = async (abortSignal?: AbortSignal) => {
    this.setFetching(true);

    const myFetchId = ++this.lastUpdateRequest;

    abortSignal = abortSignal || new AbortController().signal;

    try {
      if (!this.keepPreviousDataWhiteFetching) {
        this.setData(null);
      }
      this.setError(null);
      const rawData = await this.fetch(abortSignal);

      if (this.lastUpdateRequest !== myFetchId) {
        return console.warn(`Preventing DataFrame ${this.constructor.name} from manifesting outdated results`);
      }

      this.setData(this.postProcess(rawData));
    } catch (e) {
      this.setError(e as Error);
      this.setData(null);
    } finally {
      this.setFetching(false);
      this.promise = null;
    }
  }

  async get(update: boolean = false, abortSignal?: AbortSignal): Promise<T> {

    if (update || (!this.data && !this.fetching)) {
      this.promise = this.internalFetch(abortSignal);
    }

    await this.promise;

    if (this.error) {
      throw this.error;
    }

    return this.data!;
  }

  read() {
    if (this.promise) {
      throw this.promise;
    }
    if (this.error) {
      throw this.error;
    }
    return this.data!;
  }

  async populate(): Promise<this> {
    await this.get();
    return this;
  }

  update = (abortSignal?: AbortSignal) => this.get(true, abortSignal);
}