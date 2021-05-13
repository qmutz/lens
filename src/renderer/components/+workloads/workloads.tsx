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

import "./workloads.scss";

import React from "react";
import { observer } from "mobx-react";
import { TabLayout, TabLayoutRoute } from "../layout/tab-layout";
import { WorkloadsOverview } from "../workloads-overview/overview";
import * as workloads from "../../../common/routes/workloads";
import { namespaceUrlParam } from "../+namespaces/namespace.store";
import { Pods } from "../+workloads-pods";
import { Deployments } from "../+workloads-deployments";
import { DaemonSets } from "../+workloads-daemonsets";
import { StatefulSets } from "../+workloads-statefulsets";
import { Jobs } from "../+workloads-jobs";
import { CronJobs } from "../+workloads-cronjobs";
import { ReplicaSets } from "../+workloads-replicasets";
import type { Cluster } from "../../../main/cluster";
import { getHostedCluster } from "../../../common/cluster-store";

@observer
export class Workloads extends React.Component {
  static tabRoutes(cluster: Cluster): TabLayoutRoute[] {
    const query = namespaceUrlParam.toObjectParam();
    const routes: TabLayoutRoute[] = [
      {
        title: "Overview",
        component: WorkloadsOverview,
        url: workloads.overviewURL({ query }),
        routePath: workloads.overviewRoute.path.toString()
      }
    ];

    if (cluster.isAllAllowedResource("pods")) {
      routes.push({
        title: "Pods",
        component: Pods,
        url: workloads.podsURL({ query }),
        routePath: workloads.podsRoute.path.toString()
      });
    }

    if (cluster.isAllAllowedResource("deployments")) {
      routes.push({
        title: "Deployments",
        component: Deployments,
        url: workloads.deploymentsURL({ query }),
        routePath: workloads.deploymentsRoute.path.toString(),
      });
    }

    if (cluster.isAllAllowedResource("daemonsets")) {
      routes.push({
        title: "DaemonSets",
        component: DaemonSets,
        url: workloads.daemonSetsURL({ query }),
        routePath: workloads.daemonSetsRoute.path.toString(),
      });
    }

    if (cluster.isAllAllowedResource("statefulsets")) {
      routes.push({
        title: "StatefulSets",
        component: StatefulSets,
        url: workloads.statefulSetsURL({ query }),
        routePath: workloads.statefulSetsRoute.path.toString(),
      });
    }

    if (cluster.isAllAllowedResource("replicasets")) {
      routes.push({
        title: "ReplicaSets",
        component: ReplicaSets,
        url: workloads.replicaSetsURL({ query }),
        routePath: workloads.replicaSetsRoute.path.toString(),
      });
    }

    if (cluster.isAllAllowedResource("jobs")) {
      routes.push({
        title: "Jobs",
        component: Jobs,
        url: workloads.jobsURL({ query }),
        routePath: workloads.jobsRoute.path.toString(),
      });
    }

    if (cluster.isAllAllowedResource("cronjobs")) {
      routes.push({
        title: "CronJobs",
        component: CronJobs,
        url: workloads.cronJobsURL({ query }),
        routePath: workloads.cronJobsRoute.path.toString(),
      });
    }

    return routes;
  }

  render() {
    return (
      <TabLayout className="Workloads" tabs={Workloads.tabRoutes(getHostedCluster())}/>
    );
  }
}
