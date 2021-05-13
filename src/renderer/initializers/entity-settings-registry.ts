import { EntitySettingRegistry } from "../../extensions/registries";
import { GeneralSettings, ProxySettings, TerminalSettings, NamespacesSettings, MetricsSettings } from "../components/cluster-settings";

export function initEntitySettingsRegistry() {
  EntitySettingRegistry.getInstance()
    .add(
      {
        apiVersions: ["entity.k8slens.dev/v1alpha1"],
        kind: "KubernetesCluster",
        source: "local",
        title: "General",
        components: {
          View: GeneralSettings,
        },
      },
      {
        apiVersions: ["entity.k8slens.dev/v1alpha1"],
        kind: "KubernetesCluster",
        title: "Proxy",
        components: {
          View: ProxySettings,
        },
      },
      {
        apiVersions: ["entity.k8slens.dev/v1alpha1"],
        kind: "KubernetesCluster",
        title: "Terminal",
        components: {
          View: TerminalSettings,
        }
      },
      {
        apiVersions: ["entity.k8slens.dev/v1alpha1"],
        kind: "KubernetesCluster",
        title: "Namespaces",
        components: {
          View: NamespacesSettings,
        },
      },
      {
        apiVersions: ["entity.k8slens.dev/v1alpha1"],
        kind: "KubernetesCluster",
        title: "Metrics",
        components: {
          View: MetricsSettings,
        }
      },
    );
}
