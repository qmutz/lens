// Manage observable param from document's location.search
import type { ObservableHistory } from "mobx-observable-history";
import { action, computed } from "mobx";

export interface PageParamInit<V = any> {
  name: string;
  defaultValue?: V;
  prefix?: string; // name prefix, for extensions it's `${extension.id}:`
  parse?(value: string | string[]): V; // from URL
  stringify?(value: V): string | string[]; // to URL
}

// TODO: write tests
export class PageParam<V = any> {
  readonly name: string;
  readonly isMulti: boolean;

  constructor(private init: PageParamInit<V>, private history: ObservableHistory) {
    const { prefix, name, defaultValue } = init;

    this.name = `${prefix ?? ""}${name}`; // actual prefixed URL-name
    this.isMulti = Array.isArray(defaultValue); // multi-values param
  }

  // should be a getter since `init.defaultValue` could be a getter too
  get defaultValue(): V | undefined {
    return this.init.defaultValue;
  }

  parse(values: string | string[]): V {
    const { parse } = this.init;

    if (parse) {
      return parse(values);
    }

    // return as-is ("string"-value based params)
    return values as any as V;
  }

  stringify(value: V = this.get()): string[] {
    const { stringify } = this.init;

    if (stringify) {
      return [stringify(value)].flat();
    }

    return [value].flat().map(String);
  }

  get(): V {
    return this.parse(this.getRaw()) ?? this.defaultValue;
  }

  @action
  set(value: V, { mergeGlobals = true, replaceHistory = false } = {}): void {
    const search = this.toString({ mergeGlobals, value });

    this.history.merge({ search }, replaceHistory);
  }

  /**
   * Set stringified raw value(s) and update `document.location.search`
   * @param {string | string[]} value
   */
  @action
  setRaw(value: string | string[]): void {
    const values: string[] = [value].flat();

    if (this.isMulti) {
      this.clear();
      values.forEach(value => {
        this.history.searchParams.append(this.name, value);
      });
    } else {
      this.history.searchParams.set(this.name, values[0]);
    }
  }

  /**
   * Get stringified raw value(s) from `document.location.search`
   */
  @computed getRaw(): string | string[] {
    const values: string[] = this.history.searchParams.getAll(this.name);

    return this.isMulti ? values : values[0];
  }

  @action
  clear() {
    this.history.searchParams.delete(this.name);
  }

  toString({ withPrefix = true, mergeGlobals = true, value = this.get() } = {}): string {
    let searchParams = new URLSearchParams();

    if (mergeGlobals) {
      searchParams = new URLSearchParams(this.history.searchParams);
      searchParams.delete(this.name);
    }

    this.stringify(value).forEach(value => {
      searchParams.append(this.name, value);
    });
    return `${withPrefix ? "?" : ""}${searchParams}`;
  }

  toObjectParam(): Record<string, V> {
    return {
      [this.name]: this.get(),
    };
  }
}
