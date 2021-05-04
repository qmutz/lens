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

import "./catalog.scss";
import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import { ItemListLayout } from "../item-object-list";
import { action, observable, reaction } from "mobx";
import { CatalogEntityItem, CatalogEntityStore } from "./catalog-entity.store";
import { kebabCase } from "lodash";
import { PageLayout } from "../layout/page-layout";
import { MenuItem, MenuActions } from "../menu";
import { Icon } from "../icon";
import { catalogEntityRunContext } from "../../api/catalog-entity";
import { Badge } from "../badge";
import { HotbarStore } from "../../../common/hotbar-store";
import { autobind } from "../../utils";
import { ConfirmDialog } from "../confirm-dialog";
import { Tab, Tabs } from "../tabs";
import { CatalogCategoryRegistry, CatalogCategorySpec, ContextMenu } from "../../../common/catalog";
import { CatalogAddButton } from "./catalog-add-button";
import { navigate } from "../../navigation";

enum sortBy {
  name = "name",
  source = "source",
  status = "status"
}

function getId({ spec }: CatalogCategorySpec): string {
  return `${spec.group}/${spec.names.kind}`;
}

@observer
export class Catalog extends React.Component {
  @observable private catalogEntityStore?: CatalogEntityStore;
  @observable private menuItems: ContextMenu[] = [];
  @observable activeTab?: string;

  async componentDidMount() {
    this.catalogEntityStore = new CatalogEntityStore();
    disposeOnUnmount(this, [
      this.catalogEntityStore.watch(),
      reaction(() => CatalogCategoryRegistry.getInstance().items, (items) => {
        if (!this.activeTab && items.length > 0) {
          this.activeTab = getId(items[0]);
          this.catalogEntityStore.activeCategory = items[0];
        }
      }, { fireImmediately: true })
    ]);
  }

  addToHotbar(item: CatalogEntityItem): void {
    HotbarStore.getInstance().addToHotbar(item);
  }

  onDetails(item: CatalogEntityItem) {
    item.onRun(catalogEntityRunContext);
  }

  onMenuItemClick(menuItem: ContextMenu) {
    if (menuItem.confirm) {
      ConfirmDialog.open({
        okButtonProps: {
          primary: false,
          accent: true,
        },
        ok: () => {
          menuItem.onClick();
        },
        message: menuItem.confirm.message
      });
    } else {
      menuItem.onClick();
    }
  }

  @action
  onTabChange = (tabId: string | null) => {
    const activeCategory = CatalogCategoryRegistry.getInstance().getById(tabId);

    this.catalogEntityStore.activeCategory = activeCategory;

    if (activeCategory) {
      this.activeTab = `${activeCategory.spec.group}/${activeCategory.spec.names.kind}`;
    }
  };

  renderNavigation() {
    return (
      <Tabs className="flex column" scrollable={false} onChange={this.onTabChange} value={this.activeTab}>
        <div className="sidebarHeader">Catalog</div>
        <div className="sidebarTabs">
          <Tab
            value={undefined}
            key="*"
            label="Browse"
            data-testid="*-tab"
          />
          {
            CatalogCategoryRegistry.getInstance()
              .items
              .map(category => (
                <Tab
                  value={getId(category)}
                  key={getId(category)}
                  label={category.metadata.name}
                  data-testid={`${getId(category)}-tab`}
                />
              ))
          }
        </div>
      </Tabs>
    );
  }

  @autobind()
  renderItemMenu(item: CatalogEntityItem) {
    const menuItems = this.menuItems.filter((menuItem) => !menuItem.onlyVisibleForSource || menuItem.onlyVisibleForSource === item.entity.metadata.source);

    return (
      <MenuActions onOpen={() => this.menuItems = item.onContextMenuOpen({ navigate })} onClose={() => this.menuItems = []}>
        <MenuItem key="add-to-hotbar" onClick={() => this.addToHotbar(item) }>
          <Icon material="add" small interactive={true} title="Add to hotbar"/> Add to Hotbar
        </MenuItem>
        {
          menuItems.map((menuItem, index) => (
            <MenuItem key={index} onClick={() => this.onMenuItemClick(menuItem)}>
              <Icon material={menuItem.icon} small interactive={true} title={menuItem.title} /> {menuItem.title}
            </MenuItem>
          ))
        }
      </MenuActions>
    );
  }

  render() {
    if (!this.catalogEntityStore) {
      return null;
    }

    return (
      <PageLayout
        className="CatalogPage"
        navigation={this.renderNavigation()}
        provideBackButtonNavigation={false}
        contentGaps={false}>
        <ItemListLayout
          renderHeaderTitle={this.catalogEntityStore.activeCategory?.metadata.name ?? "Browse All"}
          isClusterScoped
          isSearchable={true}
          isSelectable={false}
          className="CatalogItemList"
          store={this.catalogEntityStore}
          tableId="catalog-items"
          sortingCallbacks={{
            [sortBy.name]: (item: CatalogEntityItem) => item.name,
            [sortBy.source]: (item: CatalogEntityItem) => item.source,
            [sortBy.status]: (item: CatalogEntityItem) => item.phase,
          }}
          searchFilters={[
            (entity: CatalogEntityItem) => entity.searchFields,
          ]}
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: sortBy.name },
            { title: "Source", className: "source", sortBy: sortBy.source },
            { title: "Labels", className: "labels" },
            { title: "Status", className: "status", sortBy: sortBy.status },
          ]}
          renderTableContents={(item: CatalogEntityItem) => [
            item.name,
            item.source,
            item.labels.map((label) => <Badge key={label} label={label} title={label} />),
            { title: item.phase, className: kebabCase(item.phase) }
          ]}
          onDetails={(item: CatalogEntityItem) => this.onDetails(item) }
          renderItemMenu={this.renderItemMenu}
        />
        <CatalogAddButton category={this.catalogEntityStore.activeCategory} />
      </PageLayout>
    );
  }
}
