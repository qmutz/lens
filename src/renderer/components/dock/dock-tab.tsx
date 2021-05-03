import "./dock-tab.scss";

import React from "react";
import { observer } from "mobx-react";
import { autobind, cssNames, prevDefault } from "../../utils";
import { dockStore, IDockTab } from "./dock.store";
import { Tab, TabProps } from "../tabs";
import { Icon } from "../icon";
import { Menu, MenuItem } from "../menu";
import { makeObservable, observable } from "mobx";

export interface DockTabProps extends TabProps<IDockTab> {
  moreActions?: React.ReactNode;
}

@observer
export class DockTab extends React.Component<DockTabProps> {
  @observable menuVisible = false;

  constructor(props: DockTabProps) {
    super(props);
    makeObservable(this);
  }

  get tabId() {
    return this.props.value.id;
  }

  @autobind()
  close() {
    dockStore.closeTab(this.tabId);
  }

  renderMenu() {
    const { closeAllTabs, closeOtherTabs, closeTabsToTheRight, tabs, getTabIndex } = dockStore;
    const closeAllDisabled = tabs.length === 1;
    const closeOtherDisabled = tabs.length === 1;
    const closeRightDisabled = getTabIndex(this.tabId) === tabs.length - 1;

    return (
      <Menu
        usePortal
        htmlFor={`tab-${this.tabId}`}
        className="DockTabMenu"
        isOpen={this.menuVisible}
        open={() => this.menuVisible = true}
        close={() => this.menuVisible = false}
        toggleEvent="contextmenu"
      >
        <MenuItem onClick={() => dockStore.closeTab(this.tabId)}>
          Close
        </MenuItem>
        <MenuItem onClick={() => closeAllTabs()} disabled={closeAllDisabled}>
          Close all tabs
        </MenuItem>
        <MenuItem onClick={() => closeOtherTabs(this.tabId)} disabled={closeOtherDisabled}>
          Close other tabs
        </MenuItem>
        <MenuItem onClick={() => closeTabsToTheRight(this.tabId)} disabled={closeRightDisabled}>
          Close tabs to the right
        </MenuItem>
      </Menu>
    );
  }

  render() {
    const { className, moreActions, ...tabProps } = this.props;
    const { title, pinned } = tabProps.value;
    const label = (
      <div className="flex gaps align-center">
        <span className="title" title={title}>{title}</span>
        {moreActions}
        {!pinned && (
          <Icon
            small material="close"
            title="Close (Ctrl+W)"
            onClick={prevDefault(this.close)}
          />
        )}
      </div>
    );

    return (
      <>
        <Tab
          {...tabProps}
          id={`tab-${this.tabId}`}
          className={cssNames("DockTab", className, { pinned })}
          onContextMenu={() => this.menuVisible = true}
          label={label}
        />
        {this.renderMenu()}
      </>
    );
  }
}
