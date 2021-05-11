import "./editable-list.scss";

import { observer } from "mobx-react";
import React from "react";

import { autobind } from "../../utils";
import { Icon } from "../icon";
import { Input } from "../input";

export interface Props<T> {
  items: T[],
  add: (newItem: string) => void,
  remove: (info: { oldItem: T, index: number }) => void,
  placeholder?: string,

  // An optional prop used to convert T to a displayable string
  // defaults to `String`
  renderItem?: (item: T, index: number) => React.ReactNode,
}

const defaultProps: Partial<Props<any>> = {
  placeholder: "Add new item...",
  renderItem: (item: any, index: number) => <React.Fragment key={index}>{item}</React.Fragment>
};

@observer
export class EditableList<T> extends React.Component<Props<T>> {
  static defaultProps = defaultProps as Props<any>;

  @autobind()
  onSubmit(val: string, evt: React.KeyboardEvent) {
    const { add } = this.props;

    if (val) {
      console.log("here", val);
      evt.preventDefault();
      add(val);
    }
  }

  render() {
    const { items, remove, renderItem, placeholder } = this.props;

    return (
      <div className="EditableList">
        <div className="el-header">
          <Input
            theme="round"
            onSubmit={this.onSubmit}
            placeholder={placeholder}
          />
        </div>
        <div className="el-contents">
          {
            items.map((item, index) => (
              <div key={`${item}${index}`} className="el-item">
                <div>{renderItem(item, index)}</div>
                <div className="el-value-remove">
                  <Icon material="delete_outline" onClick={() => remove(({ index, oldItem: item }))} />
                </div>
              </div>
            ))
          }
        </div>
      </div>
    );
  }
}
