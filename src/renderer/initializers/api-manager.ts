import { clusterOverviewStore } from "../components/+cluster/cluster-overview.store";
import { hpaStore } from "../components/+config-autoscalers/hpa.store";
import { limitRangeStore } from "../components/+config-limit-ranges/limit-ranges.store";
import { configMapsStore } from "../components/+config-maps/config-maps.store";
import { podDisruptionBudgetsStore } from "../components/+config-pod-disruption-budgets/pod-disruption-budgets.store";
import { resourceQuotaStore } from "../components/+config-resource-quotas/resource-quotas.store";
import { secretsStore } from "../components/+config-secrets/secrets.store";
import { crdStore } from "../components/+custom-resources/crd.store";
import { eventStore } from "../components/+events/event.store";
import { namespaceStore } from "../components/+namespaces/namespace.store";
import { endpointStore } from "../components/+network-endpoints/endpoints.store";
import { ingressStore } from "../components/+network-ingresses/ingress.store";
import { networkPolicyStore } from "../components/+network-policies/network-policy.store";
import { serviceStore } from "../components/+network-services/services.store";
import { nodesStore } from "../components/+nodes/nodes.store";
import { podSecurityPoliciesStore } from "../components/+pod-security-policies/pod-security-policies.store";
import { storageClassStore } from "../components/+storage-classes/storage-class.store";
import { volumeClaimStore } from "../components/+storage-volume-claims/volume-claim.store";
import { volumesStore } from "../components/+storage-volumes/volumes.store";
import { roleBindingsStore } from "../components/+user-management-roles-bindings/role-bindings.store";
import { rolesStore } from "../components/+user-management-roles/roles.store";
import { serviceAccountsStore } from "../components/+user-management-service-accounts/service-accounts.store";
import { cronJobStore } from "../components/+workloads-cronjobs/cronjob.store";
import { daemonSetStore } from "../components/+workloads-daemonsets/daemonsets.store";
import { deploymentStore } from "../components/+workloads-deployments/deployments.store";
import { jobStore } from "../components/+workloads-jobs/job.store";
import { podsStore } from "../components/+workloads-pods/pods.store";
import { replicaSetStore } from "../components/+workloads-replicasets/replicasets.store";
import { statefulSetStore } from "../components/+workloads-statefulsets/statefulset.store";
import { ApiManager } from "../api/api-manager";
import { roleApi, clusterRoleApi, roleBindingApi, clusterRoleBindingApi } from "../api/endpoints";

export function initApiManager() {
  ApiManager.createInstance()
    .registerStore(clusterOverviewStore)
    .registerStore(hpaStore)
    .registerStore(limitRangeStore)
    .registerStore(podDisruptionBudgetsStore)
    .registerStore(resourceQuotaStore)
    .registerStore(secretsStore)
    .registerStore(crdStore)
    .registerStore(eventStore)
    .registerStore(namespaceStore)
    .registerStore(endpointStore)
    .registerStore(ingressStore)
    .registerStore(networkPolicyStore)
    .registerStore(serviceStore)
    .registerStore(nodesStore)
    .registerStore(podSecurityPoliciesStore)
    .registerStore(storageClassStore)
    .registerStore(volumeClaimStore)
    .registerStore(volumesStore)
    .registerStore(rolesStore, [ roleApi, clusterRoleApi ])
    .registerStore(roleBindingsStore, [ roleBindingApi, clusterRoleBindingApi ])
    .registerStore(serviceAccountsStore)
    .registerStore(cronJobStore)
    .registerStore(daemonSetStore)
    .registerStore(deploymentStore)
    .registerStore(jobStore)
    .registerStore(podsStore)
    .registerStore(replicaSetStore)
    .registerStore(statefulSetStore)
    .registerStore(configMapsStore);
}
