import difference from "lodash/difference";
import uniqBy from "lodash/uniqBy";

import { apiManager } from "../../../api/api-manager";
import { ClusterRoleBinding, clusterRoleBindingApi, ClusterRoleBindingSubject } from "../../../api/endpoints";
import { KubeObjectStore } from "../../../kube-object.store";
import { autobind } from "../../../utils";

@autobind()
export class ClusterRoleBindingsStore extends KubeObjectStore<ClusterRoleBinding> {
  api = clusterRoleBindingApi;

  protected sortItems(items: ClusterRoleBinding[]) {
    return super.sortItems(items, [
      roleBinding => roleBinding.kind,
      roleBinding => roleBinding.getName()
    ]);
  }

  async updateSubjects(params: {
    roleBinding: ClusterRoleBinding;
    addSubjects?: ClusterRoleBindingSubject[];
    removeSubjects?: ClusterRoleBindingSubject[];
  }) {
    const { roleBinding, addSubjects, removeSubjects } = params;
    const currentSubjects = roleBinding.getSubjects();
    let newSubjects = currentSubjects;

    if (addSubjects) {
      newSubjects = uniqBy(currentSubjects.concat(addSubjects), ({ kind, name }) => {
        return [kind, name].join("-");
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

export const clusterRoleBindingsStore = new ClusterRoleBindingsStore();

apiManager.registerStore(clusterRoleBindingsStore);
