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
import { CatalogEntity, CatalogEntityMetadata, CatalogEntityStatus } from "../catalog";
import type { ActionContext, ContextMenu, MenuContext } from "../catalog/catalog-entity";
import { disconnect } from "../cluster-ipc";
import { ClusterStore } from "../cluster-store";
import { requestMain } from "../ipc";
import { productName } from "../vars";


export type KubernetesClusterSpec = {
  kubeconfigPath: string;
  kubeconfigContext: string;
};

export interface KubernetesClusterStatus extends CatalogEntityStatus {
  phase?: "connected" | "disconnected";
}

export class KubernetesCluster extends CatalogEntity<CatalogEntityMetadata, KubernetesClusterStatus, KubernetesClusterSpec> {
  public readonly apiVersion = "entity.k8slens.dev/v1alpha1";
  public readonly kind = "KubernetesCluster";

  onRun = (context: ActionContext) => {
    context.navigate(`/cluster/${this.metadata.uid}`);
  };

  onContextMenuOpen = (context: MenuContext) => {
    const res: ContextMenu[] = [];

    if (this.status.phase == "connected") {
      res.push({
        icon: "link_off",
        title: "Disconnect",
        onClick: async () => {
          ClusterStore.getInstance().deactivate(this.metadata.uid);
          requestMain(disconnect, this.metadata.uid);
        }
      });
    }

    res.push({
      icon: "settings",
      title: "Settings",
      onlyVisibleForSource: "local",
      onClick: async () => context.navigate(`/entity/${this.metadata.uid}/settings`)
    });

    if (this.metadata.labels["file"]?.startsWith(ClusterStore.storedKubeConfigFolder)) {
      res.push({
        icon: "delete",
        title: "Delete",
        onlyVisibleForSource: "local",
        onClick: async () => ClusterStore.getInstance().removeById(this.metadata.uid),
        confirm: {
          message: `Remove Kubernetes Cluster "${this.metadata.name} from ${productName}?`
        }
      });
    }

    return res;
  };
}
