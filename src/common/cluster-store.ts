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

import path from "path";
import { app, ipcMain, ipcRenderer, remote, webFrame } from "electron";
import { unlink } from "fs-extra";
import { action, comparer, computed, observable, reaction, toJS } from "mobx";
import { BaseStore } from "./base-store";
import { Cluster, ClusterState } from "../main/cluster";
import migrations from "../migrations/cluster-store";
import logger from "../main/logger";
import { appEventBus } from "./event-bus";
import { dumpConfigYaml } from "./kube-helpers";
import { saveToAppFiles } from "./utils/saveToAppFiles";
import { handleRequest, requestMain, subscribeToBroadcast, unsubscribeAllFromBroadcast } from "./ipc";
import { disposer, noop } from "./utils";
import { getHostedClusterId } from "./cluster-helpers";

import type { KubeConfig } from "@kubernetes/client-node";
import type { ClusterId, ClusterModel } from "./cluster-types";
import type { ResourceType } from "../renderer/components/cluster-settings/components/cluster-metrics-setting";

export interface ClusterStoreModel {
  activeCluster?: ClusterId; // last opened cluster
  clusters?: ClusterModel[];
}

export class ClusterStore extends BaseStore<ClusterStoreModel> {
  static get storedKubeConfigFolder(): string {
    return path.resolve((app || remote.app).getPath("userData"), "kubeconfigs");
  }

  static getCustomKubeConfigPath(clusterId: ClusterId): string {
    return path.resolve(ClusterStore.storedKubeConfigFolder, clusterId);
  }

  static embedCustomKubeConfig(clusterId: ClusterId, kubeConfig: KubeConfig | string): string {
    const filePath = ClusterStore.getCustomKubeConfigPath(clusterId);
    const fileContents = typeof kubeConfig == "string" ? kubeConfig : dumpConfigYaml(kubeConfig);

    saveToAppFiles(filePath, fileContents, { mode: 0o600 });

    return filePath;
  }

  @observable activeCluster: ClusterId;
  @observable clusters = observable.map<ClusterId, Cluster>();

  private static stateRequestChannel = "cluster:states";
  protected disposer = disposer();

  constructor() {
    super({
      configName: "lens-cluster-store",
      accessPropertiesByDotNotation: false, // To make dots safe in cluster context names
      syncOptions: {
        equals: comparer.structural,
      },
      migrations,
    });

    this.pushStateToViewsAutomatically();
  }

  async load() {
    await super.load();
    type clusterStateSync = {
      id: string;
      state: ClusterState;
    };

    if (ipcRenderer) {
      logger.info("[CLUSTER-STORE] requesting initial state sync");
      const clusterStates: clusterStateSync[] = await requestMain(ClusterStore.stateRequestChannel);

      clusterStates.forEach((clusterState) => {
        const cluster = this.getById(clusterState.id);

        if (cluster) {
          cluster.setState(clusterState.state);
        }
      });
    } else if (ipcMain) {
      handleRequest(ClusterStore.stateRequestChannel, (): clusterStateSync[] => {
        const states: clusterStateSync[] = [];

        this.clustersList.forEach((cluster) => {
          states.push({
            state: cluster.getState(),
            id: cluster.id
          });
        });

        return states;
      });
    }
  }

  protected pushStateToViewsAutomatically() {
    if (ipcMain) {
      this.disposer.push(
        reaction(() => this.connectedClustersList, () => {
          this.pushState();
        }),
        () => unsubscribeAllFromBroadcast("cluster:state"),
      );
    }
  }

  registerIpcListener() {
    logger.info(`[CLUSTER-STORE] start to listen (${webFrame.routingId})`);
    subscribeToBroadcast("cluster:state", (event, clusterId: string, state: ClusterState) => {
      logger.silly(`[CLUSTER-STORE]: received push-state at ${location.host} (${webFrame.routingId})`, clusterId, state);
      this.getById(clusterId)?.setState(state);
    });
  }

  unregisterIpcListener() {
    super.unregisterIpcListener();
    this.disposer();
  }

  pushState() {
    this.clusters.forEach((c) => {
      c.pushState();
    });
  }

  get activeClusterId() {
    return this.activeCluster;
  }

  @computed get clustersList(): Cluster[] {
    return Array.from(this.clusters.values());
  }

  @computed get active(): Cluster | null {
    return this.getById(this.activeCluster);
  }

  @computed get connectedClustersList(): Cluster[] {
    return this.clustersList.filter((c) => !c.disconnected);
  }

  isActive(id: ClusterId) {
    return this.activeCluster === id;
  }

  isMetricHidden(resource: ResourceType) {
    return Boolean(this.active?.preferences.hiddenMetrics?.includes(resource));
  }

  @action
  setActive(clusterId: ClusterId) {
    this.activeCluster = this.clusters.has(clusterId)
      ? clusterId
      : null;
  }

  deactivate(id: ClusterId) {
    if (this.isActive(id)) {
      this.setActive(null);
    }
  }

  hasClusters() {
    return this.clusters.size > 0;
  }

  getById(id: ClusterId): Cluster | null {
    return this.clusters.get(id) ?? null;
  }

  @action
  addClusters(...models: ClusterModel[]): Cluster[] {
    const clusters: Cluster[] = [];

    models.forEach(model => {
      clusters.push(this.addCluster(model));
    });

    return clusters;
  }

  @action
  addCluster(clusterOrModel: ClusterModel | Cluster): Cluster {
    appEventBus.emit({ name: "cluster", action: "add" });

    const cluster = clusterOrModel instanceof Cluster
      ? clusterOrModel
      : new Cluster(clusterOrModel);

    this.clusters.set(cluster.id, cluster);

    return cluster;
  }

  async removeCluster(model: ClusterModel) {
    await this.removeById(model.id);
  }

  @action
  async removeById(clusterId: ClusterId) {
    appEventBus.emit({ name: "cluster", action: "remove" });
    const cluster = this.getById(clusterId);

    if (cluster) {
      this.clusters.delete(clusterId);

      if (this.activeCluster === clusterId) {
        this.setActive(null);
      }

      // remove only custom kubeconfigs (pasted as text)
      if (cluster.kubeConfigPath == ClusterStore.getCustomKubeConfigPath(clusterId)) {
        await unlink(cluster.kubeConfigPath).catch(noop);
      }
    }
  }

  @action
  protected fromStore({ activeCluster, clusters = [] }: ClusterStoreModel = {}) {
    const currentClusters = this.clusters.toJS();
    const newClusters = new Map<ClusterId, Cluster>();

    // update new clusters
    for (const clusterModel of clusters) {
      try {
        let cluster = currentClusters.get(clusterModel.id);

        if (cluster) {
          cluster.updateModel(clusterModel);
        } else {
          cluster = new Cluster(clusterModel);
        }
        newClusters.set(clusterModel.id, cluster);
      } catch {
        // ignore
      }
    }

    this.setActive(activeCluster);
    this.clusters.replace(newClusters);
  }

  toJSON(): ClusterStoreModel {
    return toJS({
      activeCluster: this.activeCluster,
      clusters: this.clustersList.map(cluster => cluster.toJSON()),
    }, {
      recurseEverything: true
    });
  }
}

export function getHostedCluster(): Cluster {
  return ClusterStore.getInstance().getById(getHostedClusterId());
}
