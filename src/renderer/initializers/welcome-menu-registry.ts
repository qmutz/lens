import { catalogURL, preferencesURL } from "../../common/routes";
import { WelcomeMenuRegistry } from "../../extensions/registries";
import { navigate } from "../navigation";

export function initWelcomeMenuRegistry() {
  WelcomeMenuRegistry.getInstance()
    .add(
      {
        title: "Browse Your Catalog",
        icon: "view_list",
        click: () => navigate(catalogURL())
      },
      {
        title: "Configure Preferences",
        icon: "settings",
        click: () => navigate(preferencesURL())
      },
    );
}
