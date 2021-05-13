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

import "./user-management.scss";
import React from "react";
import { observer } from "mobx-react";
import { TabLayout, TabLayoutRoute } from "../layout/tab-layout";
import { Roles } from "../+user-management-roles";
import { RoleBindings } from "../+user-management-roles-bindings";
import { ServiceAccounts } from "../+user-management-service-accounts";
import * as userManagement from "../../../common/routes/user-management";
import { namespaceUrlParam } from "../+namespaces/namespace.store";
import { PodSecurityPolicies } from "../+pod-security-policies";
import type { Cluster } from "../../../main/cluster";
import { getHostedCluster } from "../../../common/cluster-store";

@observer
export class UserManagement extends React.Component {
  static tabRoutes(cluster: Cluster): TabLayoutRoute[] {
    const query = namespaceUrlParam.toObjectParam();
    const tabs: TabLayoutRoute[] = [];

    if (cluster.isAllAllowedResource("serviceaccounts")) {
      tabs.push({
        title: "Service Accounts",
        component: ServiceAccounts,
        url: userManagement.serviceAccountsURL({ query }),
        routePath: userManagement.serviceAccountsRoute.path.toString(),
      });
    }

    if (cluster.isAnyAllowedResource("rolebindings", "clusterrolebindings")) {
      // TODO: seperate out these two pages
      tabs.push({
        title: "Role Bindings",
        component: RoleBindings,
        url: userManagement.roleBindingsURL({ query }),
        routePath: userManagement.roleBindingsRoute.path.toString(),
      });
    }

    if (cluster.isAnyAllowedResource("roles", "clusterroles")) {
      // TODO: seperate out these two pages
      tabs.push({
        title: "Roles",
        component: Roles,
        url: userManagement.rolesURL({ query }),
        routePath: userManagement.rolesRoute.path.toString(),
      });
    }

    if (cluster.isAllAllowedResource("podsecuritypolicies")) {
      tabs.push({
        title: "Pod Security Policies",
        component: PodSecurityPolicies,
        url: userManagement.podSecurityPoliciesURL(),
        routePath: userManagement.podSecurityPoliciesRoute.path.toString(),
      });
    }

    return tabs;
  }

  render() {
    return (
      <TabLayout className="UserManagement" tabs={UserManagement.tabRoutes(getHostedCluster())}/>
    );
  }
}
