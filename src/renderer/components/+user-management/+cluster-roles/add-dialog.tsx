import "./add-dialog.scss";

import { observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";

import { Dialog, DialogProps } from "../../dialog";
import { Input } from "../../input";
import { showDetails } from "../../kube-object";
import { SubTitle } from "../../layout/sub-title";
import { Notifications } from "../../notifications";
import { Wizard, WizardStep } from "../../wizard";
import { clusterRolesStore } from "./store";

interface Props extends Partial<DialogProps> {
}

@observer
export class AddClusterRoleDialog extends React.Component<Props> {
  @observable static isOpen = false;

  @observable clusterRoleName = "";

  static open() {
    AddClusterRoleDialog.isOpen = true;
  }

  static close() {
    AddClusterRoleDialog.isOpen = false;
  }

  close = () => {
    AddClusterRoleDialog.close();
  };

  reset = () => {
    this.clusterRoleName = "";
  };

  createRole = async () => {
    try {
      const role = await clusterRolesStore.create({ name: this.clusterRoleName });

      showDetails(role.selfLink);
      this.reset();
      this.close();
    } catch (err) {
      Notifications.error(err.toString());
    }
  };

  render() {
    const { ...dialogProps } = this.props;
    const header = <h5>Create ClusterRole</h5>;

    return (
      <Dialog
        {...dialogProps}
        className="AddRoleDialog"
        isOpen={AddClusterRoleDialog.isOpen}
        close={this.close}
      >
        <Wizard header={header} done={this.close}>
          <WizardStep
            contentClass="flex gaps column"
            nextLabel="Create"
            next={this.createRole}
          >
            <SubTitle title="ClusterRole Name" />
            <Input
              required autoFocus
              placeholder="Name"
              iconLeft="supervisor_account"
              value={this.clusterRoleName}
              onChange={v => this.clusterRoleName = v}
            />
          </WizardStep>
        </Wizard>
      </Dialog>
    );
  }
}
