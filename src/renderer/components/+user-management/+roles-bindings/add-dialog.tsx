import "./add-dialog.scss";

import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";

import { rolesStore } from "../+roles/store";
import { serviceAccountsStore } from "../+service-accounts/store";
import { NamespaceSelect } from "../../+namespaces/namespace-select";
import { namespaceStore } from "../../+namespaces/namespace.store";
import { RoleBinding, RoleBindingSubject, ServiceAccount } from "../../../api/endpoints";
import { KubeObjectStore } from "../../../kube-object.store";
import { Dialog, DialogProps } from "../../dialog";
import { EditableList } from "../../editable-list";
import { Icon } from "../../icon";
import { showDetails } from "../../kube-object";
import { SubTitle } from "../../layout/sub-title";
import { Notifications } from "../../notifications";
import { Select, SelectOption } from "../../select";
import { Wizard, WizardStep } from "../../wizard";
import { roleBindingsStore } from "./store";

interface BindingSelectOption extends SelectOption {
  value: string; // binding name
  item?: ServiceAccount | any;
  subject?: RoleBindingSubject; // used for new user/group when users-management-api not available
}

interface Props extends Partial<DialogProps> {
}

@observer
export class AddRoleBindingDialog extends React.Component<Props> {
  @observable static isOpen = false;
  @observable static data: RoleBinding = null;

  static open(roleBinding?: RoleBinding) {
    AddRoleBindingDialog.isOpen = true;
    AddRoleBindingDialog.data = roleBinding;
  }

  static close() {
    AddRoleBindingDialog.isOpen = false;
  }

  get roleBinding(): RoleBinding {
    return AddRoleBindingDialog.data;
  }

  @observable isLoading = false;
  @observable selectedRoleId = "";
  @observable bindingName = ""; // new role-binding name
  @observable bindToNamespace = "";
  selectedAccounts = observable.array<ServiceAccount>([], { deep: false });
  selectedUsers = observable.set<string>([]);
  selectedGroups = observable.set<string>([]);

  @computed get isEditing() {
    return !!this.roleBinding;
  }

  @computed get selectedRole() {
    return rolesStore.items.find(role => role.getId() === this.selectedRoleId);
  }

  @computed get selectedBindings(): RoleBindingSubject[] {
    const serviceAccounts: RoleBindingSubject[] = this.selectedAccounts.map(sa => ({
      name: sa.getName(),
      kind: "ServiceAccount",
      namespace: this.bindToNamespace,
    }));
    const users: RoleBindingSubject[] = Array.from(this.selectedUsers, user => ({
      name: user,
      kind: "User",
      namespace: this.bindToNamespace,
    }));
    const groups: RoleBindingSubject[] = Array.from(this.selectedGroups, group => ({
      name: group,
      kind: "Group",
      namespace: this.bindToNamespace,
    }));

    return [
      ...serviceAccounts,
      ...users,
      ...groups,
    ];
  }

  close = () => {
    AddRoleBindingDialog.close();
  };

  async loadData() {
    const stores: KubeObjectStore[] = [
      namespaceStore,
      rolesStore,
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
      const role = rolesStore.items.find(role => role.kind === kind && role.getName() === name);

      if (role) {
        this.selectedRoleId = role.getId();
        this.bindToNamespace = role.getNs();
      }
    }
  };

  reset = () => {
    this.selectedRoleId = "";
    this.bindToNamespace = "";
    this.selectedAccounts.clear();
  };

  onBindContextChange = (namespace: string) => {
    this.bindToNamespace = namespace;
    const roleContext = this.selectedRole && this.selectedRole.getNs() || "";

    if (this.bindToNamespace && this.bindToNamespace !== roleContext) {
      this.selectedRoleId = ""; // reset previously selected role for specific context
    }
  };

  createBindings = async () => {
    const { selectedRole, bindToNamespace: namespace, selectedBindings } = this;

    try {
      const roleBinding = await (
        this.isEditing
          ? roleBindingsStore.updateSubjects({
            roleBinding: this.roleBinding,
            addSubjects: selectedBindings,
          })
          : roleBindingsStore.create({ name: selectedRole.getName(), namespace }, {
            subjects: selectedBindings,
            roleRef: {
              name: selectedRole.getName(),
              kind: selectedRole.kind,
            }
          })
      );

      showDetails(roleBinding.selfLink);
      this.close();
    } catch (err) {
      Notifications.error(err);
    }
  };

  @computed get roleOptions(): BindingSelectOption[] {
    return rolesStore.items
      .filter(role => role.getNs() === this.bindToNamespace)
      .map(role => ({
        value: role.getId(),
        label: role.getName(),
      }));
  }

  @computed get serviceAccountOptions(): BindingSelectOption[] {
    return serviceAccountsStore.items
      .filter(role => role.getNs() === this.bindToNamespace)
      .map(account => {
        const name = account.getName();

        return {
          item: account,
          value: name,
          label: <><Icon small material="account_box"/> {name}</>
        };
      });
  }

  renderContents() {
    const unwrapBindings = (options: BindingSelectOption[]) => options.map(option => option.item || option.subject);

    return (
      <>
        <SubTitle title="Namespace"/>
        <NamespaceSelect
          themeName="light"
          isDisabled={this.isEditing}
          value={this.bindToNamespace}
          onChange={({ value }) => this.onBindContextChange(value)}
        />

        <SubTitle title="Role"/>
        <Select
          key={this.selectedRoleId}
          themeName="light"
          placeholder="Select role.."
          isDisabled={this.isEditing || !this.bindToNamespace}
          options={this.roleOptions}
          value={this.selectedRoleId}
          onChange={({ value }) => this.selectedRoleId = value}
        />

        <SubTitle title="Binding targets" />

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
          isDisabled={!this.bindToNamespace}
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
          ? <>Edit RoleBinding <span className="name">{roleBindingName}</span></>
          : "Add RoleBinding"
        }
      </h5>
    );
    const disableNext = this.isLoading || !selectedRole || !selectedBindings.length;
    const nextLabel = isEditing ? "Update" : "Create";

    return (
      <Dialog
        {...dialogProps}
        className="AddRoleBindingDialog"
        isOpen={AddRoleBindingDialog.isOpen}
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
