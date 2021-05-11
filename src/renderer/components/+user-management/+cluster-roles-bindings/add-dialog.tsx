import "./add-dialog.scss";

import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";

import { serviceAccountsStore } from "../+service-accounts/store";
import { namespaceStore } from "../../+namespaces/namespace.store";
import { ClusterRoleBinding, ClusterRoleBindingSubject, ServiceAccount } from "../../../api/endpoints";
import { KubeObjectStore } from "../../../kube-object.store";
import { Dialog, DialogProps } from "../../dialog";
import { EditableList } from "../../editable-list";
import { Icon } from "../../icon";
import { showDetails } from "../../kube-object";
import { SubTitle } from "../../layout/sub-title";
import { Notifications } from "../../notifications";
import { Select, SelectOption } from "../../select";
import { Wizard, WizardStep } from "../../wizard";
import { clusterRoleBindingsStore } from "./store";

interface BindingSelectOption extends SelectOption {
  value: string; // binding name
  item?: ServiceAccount | any;
  subject?: ClusterRoleBindingSubject; // used for new user/group when users-management-api not available
}

interface Props extends Partial<DialogProps> {
}

@observer
export class AddClusterRoleBindingDialog extends React.Component<Props> {
  @observable static isOpen = false;
  @observable static data: ClusterRoleBinding = null;

  static open(roleBinding?: ClusterRoleBinding) {
    AddClusterRoleBindingDialog.isOpen = true;
    AddClusterRoleBindingDialog.data = roleBinding;
  }

  static close() {
    AddClusterRoleBindingDialog.isOpen = false;
  }

  get roleBinding(): ClusterRoleBinding {
    return AddClusterRoleBindingDialog.data;
  }

  @observable isLoading = false;
  @observable bindingName = "";
  @observable selectedRoleId = "";
  selectedAccounts = observable.array<ServiceAccount>([], { deep: false });
  selectedUsers = observable.set<string>([]);
  selectedGroups = observable.set<string>([]);

  @computed get isEditing() {
    return !!this.roleBinding;
  }

  @computed get selectedRole() {
    return clusterRoleBindingsStore.items.find(role => role.getId() === this.selectedRoleId);
  }

  @computed get selectedBindings(): ClusterRoleBindingSubject[] {
    const serviceAccounts: ClusterRoleBindingSubject[] = this.selectedAccounts.map(sa => ({
      name: sa.getName(),
      kind: "ServiceAccount",
    }));
    const users: ClusterRoleBindingSubject[] = Array.from(this.selectedUsers, user => ({
      name: user,
      kind: "User",
    }));
    const groups: ClusterRoleBindingSubject[] = Array.from(this.selectedGroups, group => ({
      name: group,
      kind: "Group",
    }));

    return [
      ...serviceAccounts,
      ...users,
      ...groups,
    ];
  }

  close = () => {
    AddClusterRoleBindingDialog.close();
  };

  async loadData() {
    const stores: KubeObjectStore[] = [
      namespaceStore,
      clusterRoleBindingsStore,
      serviceAccountsStore,
    ];

    this.isLoading = true;
    await Promise.all(stores.map(store => store.reloadAll()));
    this.isLoading = false;
  }

  onOpen = async () => {
    await this.loadData();

    if (this.roleBinding) {
      const { name, kind } = this.roleBinding.roleRef;
      const role = clusterRoleBindingsStore.items.find(role => role.kind === kind && role.getName() === name);

      if (role) {
        this.selectedRoleId = role.getId();
        this.bindingName = role.getName();
      }
    }
  };

  reset = () => {
    this.selectedRoleId = "";
    this.selectedAccounts.clear();
  };

  createBindings = async () => {
    const { selectedRole, selectedBindings, bindingName } = this;

    try {
      let roleBinding: ClusterRoleBinding;

      if (this.isEditing) {
        roleBinding = await clusterRoleBindingsStore.updateSubjects({
          roleBinding: this.roleBinding,
          addSubjects: selectedBindings,
        });
      } else {
        roleBinding = await clusterRoleBindingsStore.create({ name: bindingName }, {
          subjects: selectedBindings,
          roleRef: {
            name: selectedRole.getName(),
            kind: selectedRole.kind,
          }
        });
      }
      showDetails(roleBinding.selfLink);
      this.close();
    } catch (err) {
      Notifications.error(err);
    }
  };

  @computed get clusterRoleoptions(): BindingSelectOption[] {
    return clusterRoleBindingsStore.items.map(role => ({
      value: role.getId(),
      label: role.getName(),
    }));
  }

  @computed get serviceAccountOptions(): BindingSelectOption[] {
    return serviceAccountsStore.items.map(account => {
      const name = account.getName();
      const namespace = account.getNs();

      return {
        item: account,
        value: name,
        label: <><Icon small material="account_box" /> {name} ({namespace})</>
      };
    });
  }

  renderContents() {
    const unwrapBindings = (options: BindingSelectOption[]) => options.map(option => option.item || option.subject);

    return (
      <>
        <SubTitle title="Cluster Role"/>
        <Select
          key={this.selectedRoleId}
          themeName="light"
          placeholder="Select cluster role.."
          isDisabled={this.isEditing}
          options={this.clusterRoleoptions}
          value={this.selectedRoleId}
          onChange={({ value }) => this.selectedRoleId = value}
        />

        <SubTitle title="Binding targets"/>

        <b>Users</b>
        <EditableList
          placeholder="Bind to User Account ..."
          add={(newUser) => this.selectedUsers.add(newUser)}
          items={Array.from(this.selectedUsers)}
          remove={({ oldItem }) => this.selectedUsers.delete(oldItem)}
        />

        <b>Groups</b>
        <EditableList
          placeholder="Bind to User Group ..."
          add={(newGroup) => this.selectedGroups.add(newGroup)}
          items={Array.from(this.selectedGroups)}
          remove={({ oldItem }) => this.selectedGroups.delete(oldItem)}
        />

        <b>Service Accounts</b>
        <Select
          isMulti
          themeName="light"
          placeholder="Select service accounts"
          autoConvertOptions={false}
          options={this.serviceAccountOptions}
          onChange={(opts: BindingSelectOption[] = []) => {
            this.selectedAccounts.replace(unwrapBindings(opts));
          }}
          maxMenuHeight={200}
        />
      </>
    );
  }

  render() {
    const { ...dialogProps } = this.props;
    const { isEditing, roleBinding, selectedRole, selectedBindings } = this;
    const roleBindingName = roleBinding ? roleBinding.getName() : "";
    const header = (
      <h5>
        {roleBindingName
          ? <>Edit ClusterRoleBinding <span className="name">{roleBindingName}</span></>
          : "Add ClusterRoleBinding"
        }
      </h5>
    );
    const disableNext = this.isLoading || !selectedRole || !selectedBindings.length;
    const nextLabel = isEditing ? "Update" : "Create";

    return (
      <Dialog
        {...dialogProps}
        className="AddClusterRoleBindingDialog"
        isOpen={AddClusterRoleBindingDialog.isOpen}
        onOpen={this.onOpen}
        close={this.close}
      >
        <Wizard
          header={header}
          done={this.close}
        >
          <WizardStep
            nextLabel={nextLabel}
            next={this.createBindings}
            disabledNext={disableNext}
            loading={this.isLoading}
          >
            {this.renderContents()}
          </WizardStep>
        </Wizard>
      </Dialog>
    );
  }
}
