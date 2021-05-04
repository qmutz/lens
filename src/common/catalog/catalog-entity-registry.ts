/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { action, computed, observable, IComputedValue, IObservableArray } from "mobx";
import { CatalogEntity, CatalogEntityData, CatalogEntityKindData } from "./catalog-entity";
import { cloneJsonObject, iter, Singleton } from "../utils";

export class CatalogEntityRegistry extends Singleton {
  protected sources = observable.map<string, IComputedValue<CatalogEntity[]>>([], { deep: true });

  @action addObservableSource(id: string, source: IObservableArray<CatalogEntity>) {
    this.sources.set(id, computed(() => source));
  }

  @action addComputedSource(id: string, source: IComputedValue<CatalogEntity[]>) {
    this.sources.set(id, source);
  }

  @action removeSource(id: string) {
    this.sources.delete(id);
  }

  @computed get items(): (CatalogEntityData & CatalogEntityKindData)[] {
    // This is done to filter out non-serializable items, namely functions
    return Array.from(
      iter.flatMap(
        this.sources.values(),
        source => (
          iter.map(
            source.get(),
            ({ apiVersion, kind, metadata, spec, status }) => ({
              apiVersion,
              kind,
              metadata: cloneJsonObject(metadata),
              spec: cloneJsonObject(spec),
              status: cloneJsonObject(status),
            }),
          )
        ),
      ),
    );
  }

  getItemsForApiKind<T extends CatalogEntity>(apiVersion: string, kind: string): T[] {
    const items = this.items.filter((item) => item.apiVersion === apiVersion && item.kind === kind);

    return items as T[];
  }
}
