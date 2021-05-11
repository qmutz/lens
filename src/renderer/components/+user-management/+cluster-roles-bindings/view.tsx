import "./view.scss";

import { observer } from "mobx-react";
import React from "react";
import { RouteComponentProps } from "react-router";

import { ClusterRoleBinding } from "../../../api/endpoints";
import { KubeObjectListLayout } from "../../kube-object";
import { KubeObjectStatusIcon } from "../../kube-object-status-icon";
import { RoleBindingsRouteParams } from "../user-management.route";
import { AddClusterRoleBindingDialog } from "./add-dialog";
import { clusterRoleBindingsStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  bindings = "bindings",
  age = "age",
}

interface Props extends RouteComponentProps<RoleBindingsRouteParams> {
}

@observer
export class ClusterRoleBindings extends React.Component<Props> {
  render() {
    return (
      <>
        <KubeObjectListLayout
          isConfigurable
          tableId="access_cluster_role_bindings"
          className="ClusterRoleBindings"
          store={clusterRoleBindingsStore}
          isClusterScoped
          sortingCallbacks={{
            [columnId.name]: (binding: ClusterRoleBinding) => binding.getName(),
            [columnId.bindings]: (binding: ClusterRoleBinding) => binding.getSubjectNames(),
            [columnId.age]: (binding: ClusterRoleBinding) => binding.getTimeDiffFromNow(),
          }}
          searchFilters={[
            (binding: ClusterRoleBinding) => binding.getSearchFields(),
            (binding: ClusterRoleBinding) => binding.getSubjectNames(),
          ]}
          renderHeaderTitle="Cluster Role Bindings"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Bindings", className: "bindings", sortBy: columnId.bindings, id: columnId.bindings },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(binding: ClusterRoleBinding) => [
            binding.getName(),
            <KubeObjectStatusIcon key="icon" object={binding} />,
            binding.getSubjectNames(),
            binding.getAge(),
          ]}
          addRemoveButtons={{
            onAdd: () => AddClusterRoleBindingDialog.open(),
            addTooltip: "Create new ClusterRoleBinding",
          }}
        />
        <AddClusterRoleBindingDialog/>
      </>
    );
  }
}
