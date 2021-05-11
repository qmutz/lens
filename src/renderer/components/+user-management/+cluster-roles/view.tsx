import "./view.scss";

import { observer } from "mobx-react";
import React from "react";
import { RouteComponentProps } from "react-router";

import { ClusterRole } from "../../../api/endpoints";
import { KubeObjectListLayout } from "../../kube-object";
import { KubeObjectStatusIcon } from "../../kube-object-status-icon";
import { RolesRouteParams } from "../user-management.route";
import { AddClusterRoleDialog } from "./add-dialog";
import { clusterRolesStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  age = "age",
}

interface Props extends RouteComponentProps<RolesRouteParams> {
}

@observer
export class ClusterRoles extends React.Component<Props> {
  render() {
    return (
      <>
        <KubeObjectListLayout
          isConfigurable
          tableId="access_cluster_roles"
          className="ClusterRoles"
          store={clusterRolesStore}
          isClusterScoped
          sortingCallbacks={{
            [columnId.name]: (role: ClusterRole) => role.getName(),
            [columnId.age]: (role: ClusterRole) => role.getTimeDiffFromNow(),
          }}
          searchFilters={[
            (role: ClusterRole) => role.getSearchFields(),
          ]}
          renderHeaderTitle="Cluster Roles"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(role: ClusterRole) => [
            role.getName(),
            <KubeObjectStatusIcon key="icon" object={role} />,
            role.getAge(),
          ]}
          addRemoveButtons={{
            onAdd: () => AddClusterRoleDialog.open(),
            addTooltip: "Create new ClusterRole",
          }}
        />
        <AddClusterRoleDialog/>
      </>
    );
  }
}
