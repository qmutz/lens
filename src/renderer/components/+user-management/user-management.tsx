import "./user-management.scss";

import { observer } from "mobx-react";
import React from "react";

import { namespaceUrlParam } from "../+namespaces/namespace.store";
import { PodSecurityPolicies } from "../+pod-security-policies";
import { isAllowedResource } from "../../../common/rbac";
import { TabLayout, TabLayoutRoute } from "../layout/tab-layout";
import { ClusterRoles } from "./+cluster-roles";
import { ClusterRoleBindings } from "./+cluster-roles-bindings";
import { Roles } from "./+roles";
import { RoleBindings } from "./+roles-bindings";
import { ServiceAccounts } from "./+service-accounts";
import {
  clusterRoleBindingsRoute,
  clusterRoleBindingsURL,
  clusterRolesRoute,
  clusterRolesURL,
  podSecurityPoliciesRoute,
  podSecurityPoliciesURL,
  roleBindingsRoute,
  roleBindingsURL,
  rolesRoute,
  rolesURL,
  serviceAccountsRoute,
  serviceAccountsURL,
} from "./user-management.route";

@observer
export class UserManagement extends React.Component {
  static get tabRoutes() {
    const tabRoutes: TabLayoutRoute[] = [];
    const query = namespaceUrlParam.toObjectParam();

    if (isAllowedResource("podsecuritypolicies")) {
      tabRoutes.push({
        title: "Pod Security Policies",
        component: PodSecurityPolicies,
        url: podSecurityPoliciesURL(),
        routePath: podSecurityPoliciesRoute.path.toString(),
      });
    }

    tabRoutes.push(
      {
        title: "Service Accounts",
        component: ServiceAccounts,
        url: serviceAccountsURL({ query }),
        routePath: serviceAccountsRoute.path.toString(),
      },
      {
        title: "Roles",
        component: Roles,
        url: rolesURL({ query }),
        routePath: rolesRoute.path.toString(),
      },
      {
        title: "Role Bindings",
        component: RoleBindings,
        url: roleBindingsURL({ query }),
        routePath: roleBindingsRoute.path.toString(),
      },
      {
        title: "Cluster Roles",
        component: ClusterRoles,
        url: clusterRolesURL({ query }),
        routePath: clusterRolesRoute.path.toString(),
      },
      {
        title: "Cluster Role Bindings",
        component: ClusterRoleBindings,
        url: clusterRoleBindingsURL({ query }),
        routePath: clusterRoleBindingsRoute.path.toString(),
      },
    );

    return tabRoutes;
  }

  render() {
    return (
      <TabLayout className="UserManagement" tabs={UserManagement.tabRoutes}/>
    );
  }
}
