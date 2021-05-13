// Move embedded kubeconfig into separate file and add reference to it to cluster settings
// convert file path cluster icons to their base64 encoded versions

import path from "path";
import { app, remote } from "electron";
import { migration } from "../migration-wrapper";
import fse from "fs-extra";
import { loadConfig } from "../../common/kube-helpers";
import type { ClusterModel } from "../../common/cluster-types";
import { writeFileSync } from "fs";

export default migration({
  version: "3.6.0-beta.1",
  run(store, printLog) {
    const userDataPath = (app || remote.app).getPath("userData");
    const kubeConfigBase = path.resolve((app || remote.app).getPath("userData"), "kubeconfigs");
    const storedClusters: ClusterModel[] = store.get("clusters") || [];

    if (!storedClusters.length) return;
    fse.ensureDirSync(kubeConfigBase);

    printLog("Number of clusters to migrate: ", storedClusters.length);
    const migratedClusters = storedClusters
      .map(cluster => {
        /**
         * migrate kubeconfig
         */
        try {
          // take the embedded kubeconfig and dump it into a file
          cluster.kubeConfigPath = path.resolve(kubeConfigBase, cluster.id);
          writeFileSync(cluster.kubeConfigPath, cluster.kubeConfig);
          cluster.contextName = loadConfig(cluster.kubeConfigPath).getCurrentContext();
          delete cluster.kubeConfig;

        } catch (error) {
          printLog(`Failed to migrate Kubeconfig for cluster "${cluster.id}", removing cluster...`, error);

          return undefined;
        }

        /**
         * migrate cluster icon
         */
        try {
          if (cluster.preferences?.icon) {
            printLog(`migrating ${cluster.preferences.icon} for ${cluster.preferences.clusterName}`);
            const iconPath = cluster.preferences.icon.replace("store://", "");
            const fileData = fse.readFileSync(path.join(userDataPath, iconPath));

            cluster.preferences.icon = `data:;base64,${fileData.toString("base64")}`;
          } else {
            delete cluster.preferences?.icon;
          }
        } catch (error) {
          printLog(`Failed to migrate cluster icon for cluster "${cluster.id}"`, error);
          delete cluster.preferences.icon;
        }

        return cluster;
      })
      .filter(c => c);

    // "overwrite" the cluster configs
    if (migratedClusters.length > 0) {
      store.set("clusters", migratedClusters);
    }
  }
});
