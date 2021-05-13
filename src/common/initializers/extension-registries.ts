import * as registries from "../../extensions/registries";

export function initExtensionRegistries() {
  registries.AppPreferenceRegistry.createInstance();
  registries.ClusterPageMenuRegistry.createInstance();
  registries.ClusterPageRegistry.createInstance();
  registries.CommandRegistry.createInstance();
  registries.EntitySettingRegistry.createInstance();
  registries.GlobalPageRegistry.createInstance();
  registries.KubeObjectDetailRegistry.createInstance();
  registries.KubeObjectMenuRegistry.createInstance();
  registries.KubeObjectStatusRegistry.createInstance();
  registries.MenuRegistry.createInstance();
  registries.PageMenuRegistry.createInstance();
  registries.StatusBarRegistry.createInstance();
  registries.WelcomeMenuRegistry.createInstance();
}
