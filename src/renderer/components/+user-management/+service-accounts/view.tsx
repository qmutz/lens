import "./view.scss";

import { observer } from "mobx-react";
import React from "react";
import { RouteComponentProps } from "react-router";

import { ServiceAccountsRouteParams } from "..";
import { kubeObjectMenuRegistry } from "../../../../extensions/registries/kube-object-menu-registry";
import { ServiceAccount } from "../../../api/endpoints/service-accounts.api";
import { Icon } from "../../icon";
import { KubeObjectListLayout } from "../../kube-object";
import { KubeObjectStatusIcon } from "../../kube-object-status-icon";
import { KubeObjectMenuProps } from "../../kube-object/kube-object-menu";
import { openServiceAccountKubeConfig } from "../../kubeconfig-dialog";
import { MenuItem } from "../../menu";
import { CreateServiceAccountDialog } from "./create-dialog";
import { serviceAccountsStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  age = "age",
}

interface Props extends RouteComponentProps<ServiceAccountsRouteParams> {
}

@observer
export class ServiceAccounts extends React.Component<Props> {
  render() {
    return (
      <>
        <KubeObjectListLayout
          isConfigurable
          tableId="access_service_accounts"
          className="ServiceAccounts" store={serviceAccountsStore}
          sortingCallbacks={{
            [columnId.name]: (account: ServiceAccount) => account.getName(),
            [columnId.namespace]: (account: ServiceAccount) => account.getNs(),
            [columnId.age]: (account: ServiceAccount) => account.getTimeDiffFromNow(),
          }}
          searchFilters={[
            (account: ServiceAccount) => account.getSearchFields(),
          ]}
          renderHeaderTitle="Service Accounts"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(account: ServiceAccount) => [
            account.getName(),
            <KubeObjectStatusIcon key="icon" object={account} />,
            account.getNs(),
            account.getAge(),
          ]}
          renderItemMenu={(item: ServiceAccount) => {
            return <ServiceAccountMenu object={item}/>;
          }}
          addRemoveButtons={{
            onAdd: () => CreateServiceAccountDialog.open(),
            addTooltip: "Create new Service Account",
          }}
        />
        <CreateServiceAccountDialog/>
      </>
    );
  }
}

function ServiceAccountMenu(props: KubeObjectMenuProps<ServiceAccount>) {
  const { object, toolbar } = props;

  return (
    <MenuItem onClick={() => openServiceAccountKubeConfig(object)}>
      <Icon material="insert_drive_file" title="Kubeconfig File" interactive={toolbar}/>
      <span className="title">Kubeconfig</span>
    </MenuItem>
  );
}

kubeObjectMenuRegistry.add({
  kind: "ServiceAccount",
  apiVersions: ["v1"],
  components: {
    MenuItem: ServiceAccountMenu
  }
});
