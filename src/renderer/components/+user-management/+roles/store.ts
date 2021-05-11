import { apiManager } from "../../../api/api-manager";
import { Role, roleApi } from "../../../api/endpoints";
import { KubeObjectStore } from "../../../kube-object.store";
import { autobind } from "../../../utils";

@autobind()
export class RolesStore extends KubeObjectStore<Role> {
  api = roleApi;

  protected sortItems(items: Role[]) {
    return super.sortItems(items, [
      role => role.kind,
      role => role.getName(),
    ]);
  }

  protected async createItem(params: { name: string; namespace?: string }, data?: Partial<Role>) {
    return roleApi.create(params, data);
  }
}

export const rolesStore = new RolesStore();

apiManager.registerStore(rolesStore);
