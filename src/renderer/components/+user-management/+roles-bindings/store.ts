import difference from "lodash/difference";
import uniqBy from "lodash/uniqBy";

import { apiManager } from "../../../api/api-manager";
import { RoleBinding, roleBindingApi, RoleBindingSubject } from "../../../api/endpoints";
import { KubeObjectStore } from "../../../kube-object.store";
import { autobind } from "../../../utils";

@autobind()
export class RoleBindingsStore extends KubeObjectStore<RoleBinding> {
  api = roleBindingApi;

  protected sortItems(items: RoleBinding[]) {
    return super.sortItems(items, [
      roleBinding => roleBinding.kind,
      roleBinding => roleBinding.getName()
    ]);
  }

  protected async createItem(params: { name: string; namespace: string }, data?: Partial<RoleBinding>) {
    return roleBindingApi.create(params, data);
  }

  async updateSubjects(params: {
    roleBinding: RoleBinding;
    addSubjects?: RoleBindingSubject[];
    removeSubjects?: RoleBindingSubject[];
  }) {
    const { roleBinding, addSubjects, removeSubjects } = params;
    const currentSubjects = roleBinding.getSubjects();
    let newSubjects = currentSubjects;

    if (addSubjects) {
      newSubjects = uniqBy(currentSubjects.concat(addSubjects), ({ kind, name, namespace }) => {
        return [kind, name, namespace].join("-");
      });
    } else if (removeSubjects) {
      newSubjects = difference(currentSubjects, removeSubjects);
    }

    return this.update(roleBinding, {
      roleRef: roleBinding.roleRef,
      subjects: newSubjects
    });
  }
}

export const roleBindingsStore = new RoleBindingsStore();

apiManager.registerStore(roleBindingsStore);
