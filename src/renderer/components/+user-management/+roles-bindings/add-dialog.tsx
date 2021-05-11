import "./add-dialog.scss";

import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";

import { rolesStore } from "../+roles/store";
import { serviceAccountsStore } from "../+service-accounts/store";
import { NamespaceSelect } from "../../+namespaces/namespace-select";
import { namespaceStore } from "../../+namespaces/namespace.store";
import { RoleBinding, RoleBindingSubject, ServiceAccount } from "../../../api/endpoints";
import { KubeObject } from "../../../api/kube-object";
import { KubeObjectStore } from "../../../kube-object.store";
import { Dialog, DialogProps } from "../../dialog";
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
  @observable selectedAccounts = observable.array<ServiceAccount>([], { deep: false });

  @computed get isEditing() {
    return !!this.roleBinding;
  }

  @computed get selectedRole() {
    return rolesStore.items.find(role => role.getId() === this.selectedRoleId);
  }

  @computed get selectedBindings() {
    return [
      ...this.selectedAccounts,
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

    const subjects = selectedBindings.map((item: KubeObject | RoleBindingSubject) => {
      if (item instanceof KubeObject) {
        return {
          name: item.getName(),
          kind: item.kind,
          namespace: item.getNs(),
        };
      }

      return item;
    });

    try {
      const roleBinding = await (
        this.isEditing
          ? roleBindingsStore.updateSubjects({
            roleBinding: this.roleBinding,
            addSubjects: subjects,
          })
          : roleBindingsStore.create({ name: selectedRole.getName(), namespace }, {
            subjects,
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
        label: `${role.getName()} (${role.getNs()})`,
      }));
  }

  @computed get serviceAccountOptions(): BindingSelectOption[] {
    return serviceAccountsStore.items.map(account => {
      const name = account.getName();
      const namespace = account.getNs();

      return {
        item: account,
        value: name,
        label: <><Icon small material="account_box"/> {name} ({namespace})</>
      };
    });
  }

  renderContents() {
    const unwrapBindings = (options: BindingSelectOption[]) => options.map(option => option.item || option.subject);

    return (
      <>
        <SubTitle title="Context"/>
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
          isDisabled={this.isEditing}
          options={this.roleOptions}
          value={this.selectedRoleId}
          onChange={({ value }) => this.selectedRoleId = value}
        />
        {/* {
          !this.isEditing && (
            <>
              <Checkbox
                theme="light"
                label="Use same name for RoleBinding"
                value={this.useRoleForBindingName}
                onChange={v => this.useRoleForBindingName = v}
              />
              {
                !this.useRoleForBindingName && (
                  <Input
                    autoFocus
                    placeholder="Name"
                    disabled={this.isEditing}
                    value={this.bindingName}
                    onChange={v => this.bindingName = v}
                  />
                )
              }
            </>
          )
        } */}

        <SubTitle title="Binding targets"/>
        <Select
          isMulti
          themeName="light"
          placeholder="Select service accounts"
          autoConvertOptions={false}
          options={this.serviceAccountOptions}
          onChange={(opts: BindingSelectOption[]) => {
            if (!opts) opts = [];
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
        <Wizard header={header} done={this.close}>
          <WizardStep
            nextLabel={nextLabel} next={this.createBindings}
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
