import { KubeApi } from "../kube-api";
import { KubeObject } from "../kube-object";

export interface ClusterRoleBindingSubject {
  kind: string;
  name: string;
  apiGroup?: string;
}

export class ClusterRoleBinding extends KubeObject {
  static kind = "ClusterRoleBinding";
  static namespaced = false;
  static apiBase = "/apis/rbac.authorization.k8s.io/v1/clusterrolebindings";

  subjects?: ClusterRoleBindingSubject[];
  roleRef: {
    kind: string;
    name: string;
    apiGroup?: string;
  };

  getSubjects() {
    return this.subjects || [];
  }

  getSubjectNames(): string {
    return this.getSubjects().map(subject => subject.name).join(", ");
  }
}

export const clusterRoleBindingApi = new KubeApi({
  objectConstructor: ClusterRoleBinding,
});
