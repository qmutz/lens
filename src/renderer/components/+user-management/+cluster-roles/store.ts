import { apiManager } from "../../../api/api-manager";
import { ClusterRole, clusterRoleApi } from "../../../api/endpoints";
import { KubeObjectStore } from "../../../kube-object.store";
import { autobind } from "../../../utils";

@autobind()
export class ClusterRolesStore extends KubeObjectStore<ClusterRole> {
  api = clusterRoleApi;

  protected sortItems(items: ClusterRole[]) {
    return super.sortItems(items, [
      role => role.kind,
      role => role.getName(),
    ]);
  }
}

export const clusterRolesStore = new ClusterRolesStore();

apiManager.registerStore(clusterRolesStore);
