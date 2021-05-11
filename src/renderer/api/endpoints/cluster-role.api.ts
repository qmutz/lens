import { KubeApi } from "../kube-api";
import { KubeObject } from "../kube-object";

export class ClusterRole extends KubeObject {
  static kind = "ClusterRole";
  static namespaced = false;
  static apiBase = "/apis/rbac.authorization.k8s.io/v1/clusterroles";

  rules: {
    verbs: string[];
    apiGroups: string[];
    resources: string[];
    resourceNames?: string[];
  }[];

  getRules() {
    return this.rules || [];
  }
}

export const clusterRoleApi = new KubeApi({
  objectConstructor: ClusterRole,
});
