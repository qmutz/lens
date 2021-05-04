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

import "./hotbar-icon.scss";

import { Avatar } from "@material-ui/core";
import GraphemeSplitter from "grapheme-splitter";
import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import randomColor from "randomcolor";
import React, { DOMAttributes } from "react";

import { CatalogEntity, ContextMenu } from "../../../common/catalog";
import { HotbarStore } from "../../../common/hotbar-store";
import { CatalogCategoryRegistry } from "../../api/catalog-category-registry";
import { cssNames, IClassName, iter } from "../../utils";
import { ConfirmDialog } from "../confirm-dialog";
import { Icon } from "../icon";
import { Menu, MenuItem } from "../menu";
import { Tooltip } from "../tooltip";

interface Props extends DOMAttributes<HTMLElement> {
  entity: CatalogEntity;
  index: number;
  className?: IClassName;
  errorClass?: IClassName;
  isActive?: boolean;
}

function getNameParts(name: string): string[] {
  const byWhitespace = name.split(/\s+/);

  if (byWhitespace.length > 1) {
    return byWhitespace;
  }

  const byDashes = name.split(/[-_]+/);

  if (byDashes.length > 1) {
    return byDashes;
  }

  return name.split(/@+/);
}

@observer
export class HotbarIcon extends React.Component<Props> {
  @observable menuItems?: ContextMenu[];
  @observable menuOpen = false;

  @computed get iconString() {
    const [rawFirst, rawSecond, rawThird] = getNameParts(this.props.entity.metadata.name);
    const splitter = new GraphemeSplitter();
    const first = splitter.iterateGraphemes(rawFirst);
    const second = rawSecond ? splitter.iterateGraphemes(rawSecond): first;
    const third = rawThird ? splitter.iterateGraphemes(rawThird) : iter.newEmpty();

    return [
      ...iter.take(first, 1),
      ...iter.take(second, 1),
      ...iter.take(third, 1),
    ].filter(Boolean).join("");
  }

  get kindIcon() {
    const category = CatalogCategoryRegistry.getInstance().getCategoryForEntity(this.props.entity);

    if (!category) {
      return <Icon material="bug_report" className="badge" />;
    }

    if (category.metadata.icon.includes("<svg")) {
      return <Icon svg={category.metadata.icon} className="badge" />;
    }

    return <Icon material={category.metadata.icon} className="badge" />;
  }

  get ledIcon() {
    const className = cssNames("led", { online: this.props.entity.status.phase == "connected"}); // TODO: make it more generic

    return <div className={className} />;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  remove(item: CatalogEntity) {
    HotbarStore.getInstance().removeFromHotbar(item.getId());
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

  generateAvatarStyle(entity: CatalogEntity): React.CSSProperties {
    return {
      "backgroundColor": randomColor({ seed: `${entity.metadata.name}-${entity.metadata.source}`, luminosity: "dark" })
    };
  }

  render() {
    const {
      entity, errorClass, isActive,
      children, ...elemProps
    } = this.props;
    const entityIconId = `hotbar-icon-${this.props.index}`;
    const className = cssNames("HotbarIcon flex inline", this.props.className, {
      interactive: true,
      active: isActive,
    });
    const onOpen = async () => {
      this.menuItems = CatalogCategoryRegistry.getInstance().runEntityHandlersFor(entity, "onContextMenuOpen");
      this.toggleMenu();
    };

    return (
      <div className={className}>
        <Tooltip targetId={entityIconId}>{entity.metadata.name} ({entity.metadata.source || "local"})</Tooltip>
        <Avatar
          {...elemProps}
          id={entityIconId}
          variant="square"
          className={isActive ? "active" : "default"}
          style={this.generateAvatarStyle(entity)}
        >
          {this.iconString}
        </Avatar>
        { this.ledIcon }
        { this.kindIcon }
        <Menu
          usePortal
          htmlFor={entityIconId}
          className="HotbarIconMenu"
          isOpen={this.menuOpen}
          toggleEvent="contextmenu"
          position={{right: true, bottom: true }} // FIXME: position does not work
          open={() => onOpen()}
          close={() => this.toggleMenu()}>
          <MenuItem key="remove-from-hotbar" onClick={() => this.remove(entity) }>
            <Icon material="clear" small interactive={true} title="Remove from hotbar"/> Remove from Hotbar
          </MenuItem>
          {this.menuItems?.map((menuItem) => (
            <MenuItem key={menuItem.title} onClick={() => this.onMenuItemClick(menuItem)}>
              <Icon material={menuItem.icon} small interactive={true} title={menuItem.title} /> {menuItem.title}
            </MenuItem>
          ))}
        </Menu>
        {children}
      </div>
    );
  }
}
