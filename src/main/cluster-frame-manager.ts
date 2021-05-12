import { computed, observable } from "mobx";

import { iter, Singleton } from "../common/utils";

import type { ClusterId } from "../common/cluster-types";

export type ClusterFrameInfo = {
  frameId: number;
  processId: number
};

export class ClusterFrameManager extends Singleton {
  protected clusterFrameMap = observable.map<string, ClusterFrameInfo>();

  /**
   * Is a computed mapping between `frameId`'s and their associated `ClusterFrameInfo`
   */
  @computed get frameMapById(): Map<number, number> {
    return new Map(iter.map(this.clusterFrameMap.values(), info => [info.frameId, info.processId]));
  }

  setFrameInfo(clusterId: ClusterId, info: ClusterFrameInfo) {
    this.clusterFrameMap.set(clusterId, info);
  }

  getFrameInfoByClusterId(clusterId: ClusterId): ClusterFrameInfo {
    return this.clusterFrameMap.get(clusterId);
  }

  getFrameProcessIdById(frameId: number): number {
    return this.frameMapById.get(frameId);
  }

  getAllFrameInfo(): ClusterFrameInfo[] {
    return Array.from(this.clusterFrameMap.values());
  }
}
