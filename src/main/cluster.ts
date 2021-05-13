/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { AuthorizationV1Api, CoreV1Api, HttpError, KubeConfig, V1ResourceAttributes } from "@kubernetes/client-node";
import { createHash } from "crypto";
import { ipcMain } from "electron";
import { action, comparer, computed, observable, reaction, toJS, when } from "mobx";
import plimit from "p-limit";

import { broadcastMessage, ClusterListNamespaceForbiddenChannel } from "../common/ipc";
import { loadConfig, validateKubeConfig } from "../common/kube-helpers";
import { apiResourceRecord, apiResources } from "../common/rbac";
import { DetectorRegistry } from "./cluster-detectors/detector-registry";
import { VersionDetector } from "./cluster-detectors/version-detector";
import { ContextHandler } from "./context-handler";
import { KubeconfigManager } from "./kubeconfig-manager";
import { Kubectl } from "./kubectl";
import logger from "./logger";
import { ClusterStatus } from "../common/cluster-types";

import type { KubeApiResource, KubeResource } from "../common/rbac";
import type { ClusterId, ClusterMetadata, ClusterModel, ClusterPreferences, ClusterPrometheusPreferences, ClusterRefreshOptions, ClusterState, UpdateClusterModel } from "../common/cluster-types";

/**
 * Cluster
 *
 * @beta
 */
export class Cluster implements ClusterModel, ClusterState {
  public static getDeteministicId(model: UpdateClusterModel): ClusterId {
    return createHash("md5").update(`${model.kubeConfigPath}:${model.contextName}`).digest("hex");
  }

  /** Unique id for a cluster */
  public readonly id: ClusterId;
  /**
   * Kubectl
   *
   * @internal
   */
  public kubeCtl: Kubectl;
  /**
   * Context handler
   *
   * @internal
   */
  public contextHandler: ContextHandler;
  protected kubeconfigManager: KubeconfigManager;
  protected eventDisposers: Function[] = [];
  protected activated = false;
  private resourceAccessStatuses: Map<KubeApiResource, boolean> = new Map();

  whenReady = when(() => this.ready);

  /**
   * Kubeconfig context name
   *
   * @observable
   */
  @observable contextName: string;
  /**
   * Path to kubeconfig
   *
   * @observable
   */
  @observable kubeConfigPath: string;
  /**
   * @deprecated
   */
  @observable workspace: string;
  /**
   * Kubernetes API server URL
   *
   * @observable
   */
  @observable apiUrl: string; // cluster server url
  /**
   * Is cluster online
   *
   * @observable
   */
  @observable online = false; // describes if we can detect that cluster is online
  /**
   * Can user access cluster resources
   *
   * @observable
   */
  @observable accessible = false; // if user is able to access cluster resources
  /**
   * Is cluster instance in usable state
   *
   * @observable
   */
  @observable ready = false; // cluster is in usable state
  /**
   * Is cluster currently reconnecting
   *
   * @observable
   */
  @observable reconnecting = false;
  /**
   * Is cluster disconnected. False if user has selected to connect.
   *
   * @observable
   */
  @observable disconnected = true;
  /**
   * Connection failure reason
   *
   * @observable
   */
  @observable failureReason: string;
  /**
   * Does user have admin like access
   *
   * @observable
   */
  @observable isAdmin = false;

  /**
   * Global watch-api accessibility , e.g. "/api/v1/services?watch=1"
   *
   * @observable
   */
  @observable isGlobalWatchEnabled = false;
  /**
   * Preferences
   *
   * @observable
   */
  @observable preferences: ClusterPreferences = {};
  /**
   * Metadata
   *
   * @observable
   */
  @observable metadata: ClusterMetadata = {};
  /**
   * List of allowed namespaces verified via K8S::SelfSubjectAccessReview api
   *
   * @observable
   */
  @observable allowedNamespaces: string[] = [];
  /**
   * List of allowed resources
   *
   * @observable
   * @internal
   */
  @observable allowedResources: string[] = [];
  /**
   * List of accessible namespaces provided by user in the Cluster Settings
   *
   * @observable
   */
  @observable accessibleNamespaces: string[] = [];

  /**
   * Is cluster available
   *
   * @computed
   */
  @computed get available() {
    return this.accessible && !this.disconnected;
  }

  /**
   * Cluster name
   *
   * @computed
   */
  @computed get name() {
    return this.preferences.clusterName || this.contextName;
  }

  @computed get distribution(): string {
    return this.metadata.distribution?.toString() || "unknown";
  }

  /**
   * Prometheus preferences
   *
   * @computed
   * @internal
   */
  @computed get prometheusPreferences(): ClusterPrometheusPreferences {
    const { prometheus, prometheusProvider } = this.preferences;

    return toJS({ prometheus, prometheusProvider }, {
      recurseEverything: true,
    });
  }

  /**
   * Kubernetes version
   */
  get version(): string {
    return String(this.metadata?.version ?? "");
  }

  constructor(model: ClusterModel) {
    this.id = model.id;
    this.updateModel(model);

    const kubeconfig = this.getKubeconfig();
    const error = validateKubeConfig(kubeconfig, this.contextName, { validateCluster: true, validateUser: false, validateExec: false});

    if (error) {
      throw error;
    }

    this.apiUrl = kubeconfig.getCluster(kubeconfig.getContextObject(this.contextName).cluster).server;

    if (ipcMain) {
      // for the time being, until renderer gets its own cluster type
      this.contextHandler = new ContextHandler(this);
      this.kubeconfigManager = new KubeconfigManager(this, this.contextHandler);

      logger.debug(`[CLUSTER]: Cluster init success`, {
        id: this.id,
        context: this.contextName,
        apiUrl: this.apiUrl
      });
    }
  }

  /**
   * Update cluster data model
   *
   * @param model
   */
  @action updateModel(model: UpdateClusterModel) {
    // Note: do not assign ID as that should never be updated

    this.kubeConfigPath = model.kubeConfigPath;

    if (model.workspace) {
      this.workspace = model.workspace;
    }

    if (model.contextName) {
      this.contextName = model.contextName;
    }

    if (model.preferences) {
      this.preferences = model.preferences;
    }

    if (model.metadata) {
      this.metadata = model.metadata;
    }

    if (model.accessibleNamespaces) {
      this.accessibleNamespaces = model.accessibleNamespaces;
    }
  }

  /**
   * @internal
   */
  protected bindEvents() {
    logger.info(`[CLUSTER]: bind events`, this.getMeta());
    const refreshTimer = setInterval(() => !this.disconnected && this.refresh(), 30000); // every 30s
    const refreshMetadataTimer = setInterval(() => !this.disconnected && this.refreshMetadata(), 900000); // every 15 minutes

    if (ipcMain) {
      this.eventDisposers.push(
        reaction(() => this.getState(), () => this.pushState()),
        reaction(() => this.prometheusPreferences, (prefs) => this.contextHandler.setupPrometheus(prefs), { equals: comparer.structural, }),
        () => {
          clearInterval(refreshTimer);
          clearInterval(refreshMetadataTimer);
        },
      );
    }
  }

  /**
   * internal
   */
  protected unbindEvents() {
    logger.info(`[CLUSTER]: unbind events`, this.getMeta());
    this.eventDisposers.forEach(dispose => dispose());
    this.eventDisposers.length = 0;
  }

  /**
   * @param force force activation
   * @internal
   */
  @action
  async activate(force = false) {
    if (this.activated && !force) {
      return this.pushState();
    }

    logger.info(`[CLUSTER]: activate`, this.getMeta());

    if (!this.eventDisposers.length) {
      this.bindEvents();
    }

    if (this.disconnected || !this.accessible) {
      await this.reconnect();
    }
    await this.refreshConnectionStatus();

    if (this.accessible) {
      await this.refreshAccessibility();
      this.ensureKubectl();
    }
    this.activated = true;

    this.pushState();
  }

  /**
   * @internal
   */
  protected async ensureKubectl() {
    this.kubeCtl = new Kubectl(this.version);

    return this.kubeCtl.ensureKubectl(); // download kubectl in background, so it's not blocking dashboard
  }

  /**
   * @internal
   */
  @action
  async reconnect() {
    logger.info(`[CLUSTER]: reconnect`, this.getMeta());
    this.contextHandler?.stopServer();
    await this.contextHandler?.ensureServer();
    this.disconnected = false;
  }

  /**
   * @internal
   */
  @action disconnect() {
    logger.info(`[CLUSTER]: disconnect`, this.getMeta());
    this.unbindEvents();
    this.contextHandler?.stopServer();
    this.disconnected = true;
    this.online = false;
    this.accessible = false;
    this.ready = false;
    this.activated = false;
    this.allowedNamespaces = [];
    this.resourceAccessStatuses.clear();
    this.pushState();
  }

  /**
   * @internal
   * @param opts refresh options
   */
  @action
  async refresh(opts: ClusterRefreshOptions = {}) {
    logger.info(`[CLUSTER]: refresh`, this.getMeta());
    await this.refreshConnectionStatus();

    if (this.accessible) {
      await this.refreshAccessibility();

      if (opts.refreshMetadata) {
        this.refreshMetadata();
      }
    }
    this.pushState();
  }

  /**
   * @internal
   */
  @action
  async refreshMetadata() {
    logger.info(`[CLUSTER]: refreshMetadata`, this.getMeta());
    const metadata = await DetectorRegistry.getInstance().detectForCluster(this);
    const existingMetadata = this.metadata;

    this.metadata = Object.assign(existingMetadata, metadata);
  }

  /**
   * @internal
   */
  private async refreshAccessibility(): Promise<void> {
    this.isAdmin = await this.isClusterAdmin();
    this.isGlobalWatchEnabled = await this.canUseWatchApi({ resource: "*" });

    await this.refreshAllowedResources();

    this.ready = true;
  }

  /**
   * @internal
   */
  @action
  async refreshConnectionStatus() {
    const connectionStatus = await this.getConnectionStatus();

    this.online = connectionStatus > ClusterStatus.Offline;
    this.accessible = connectionStatus == ClusterStatus.AccessGranted;
  }

  /**
   * @internal
   */
  @action
  async refreshAllowedResources() {
    this.allowedNamespaces = await this.getAllowedNamespaces();
    this.allowedResources = await this.getAllowedResources();
  }

  protected getKubeconfig(): KubeConfig {
    return loadConfig(this.kubeConfigPath);
  }

  /**
   * @internal
   */
  async getProxyKubeconfig(): Promise<KubeConfig> {
    const kubeconfigPath = await this.getProxyKubeconfigPath();

    return loadConfig(kubeconfigPath);
  }

  /**
   * @internal
   */
  async getProxyKubeconfigPath(): Promise<string> {
    return this.kubeconfigManager.getPath();
  }

  protected async getConnectionStatus(): Promise<ClusterStatus> {
    try {
      const versionDetector = new VersionDetector(this);
      const versionData = await versionDetector.detect();

      this.metadata.version = versionData.value;

      this.failureReason = null;

      return ClusterStatus.AccessGranted;
    } catch (error) {
      logger.error(`Failed to connect cluster "${this.contextName}": ${error}`);

      if (error.statusCode) {
        if (error.statusCode >= 400 && error.statusCode < 500) {
          this.failureReason = "Invalid credentials";

          return ClusterStatus.AccessDenied;
        } else {
          this.failureReason = error.error || error.message;

          return ClusterStatus.Offline;
        }
      } else if (error.failed === true) {
        if (error.timedOut === true) {
          this.failureReason = "Connection timed out";

          return ClusterStatus.Offline;
        } else {
          this.failureReason = "Failed to fetch credentials";

          return ClusterStatus.AccessDenied;
        }
      }
      this.failureReason = error.message;

      return ClusterStatus.Offline;
    }
  }

  /**
   * @internal
   * @param resourceAttributes resource attributes
   */
  async canI(resourceAttributes: V1ResourceAttributes): Promise<boolean> {
    const authApi = (await this.getProxyKubeconfig()).makeApiClient(AuthorizationV1Api);

    try {
      const accessReview = await authApi.createSelfSubjectAccessReview({
        apiVersion: "authorization.k8s.io/v1",
        kind: "SelfSubjectAccessReview",
        spec: { resourceAttributes }
      });

      return accessReview.body.status.allowed;
    } catch (error) {
      logger.error(`failed to request selfSubjectAccessReview: ${error}`);

      return false;
    }
  }

  /**
   * @internal
   */
  async isClusterAdmin(): Promise<boolean> {
    return this.canI({
      namespace: "kube-system",
      resource: "*",
      verb: "create",
    });
  }

  /**
   * @internal
   */
  async canUseWatchApi(customizeResource: V1ResourceAttributes = {}): Promise<boolean> {
    return this.canI({
      verb: "watch",
      resource: "*",
      ...customizeResource,
    });
  }

  toJSON(): ClusterModel {
    const model: ClusterModel = {
      id: this.id,
      contextName: this.contextName,
      kubeConfigPath: this.kubeConfigPath,
      workspace: this.workspace,
      preferences: this.preferences,
      metadata: this.metadata,
      accessibleNamespaces: this.accessibleNamespaces,
    };

    return toJS(model, {
      recurseEverything: true
    });
  }

  /**
   * Serializable cluster-state used for sync btw main <-> renderer
   */
  getState(): ClusterState {
    const state: ClusterState = {
      apiUrl: this.apiUrl,
      online: this.online,
      ready: this.ready,
      disconnected: this.disconnected,
      accessible: this.accessible,
      failureReason: this.failureReason,
      isAdmin: this.isAdmin,
      allowedNamespaces: this.allowedNamespaces,
      allowedResources: this.allowedResources,
      isGlobalWatchEnabled: this.isGlobalWatchEnabled,
    };

    return toJS(state, {
      recurseEverything: true
    });
  }

  /**
   * @internal
   * @param state cluster state
   */
  @action setState(state: ClusterState) {
    Object.assign(this, state);
  }

  /**
   * @internal
   * @param state cluster state
   */
  pushState(state = this.getState()) {
    logger.silly(`[CLUSTER]: push-state`, state);
    broadcastMessage("cluster:state", this.id, state);
  }

  // get cluster system meta, e.g. use in "logger"
  getMeta() {
    return {
      id: this.id,
      name: this.contextName,
      ready: this.ready,
      online: this.online,
      accessible: this.accessible,
      disconnected: this.disconnected,
    };
  }

  protected getAllowedNamespacesErrorCount = 0;

  protected async getAllowedNamespaces() {
    if (this.accessibleNamespaces.length) {
      return this.accessibleNamespaces;
    }

    const api = (await this.getProxyKubeconfig()).makeApiClient(CoreV1Api);

    try {
      const { body: { items }} = await api.listNamespace();
      const namespaces = items.map(ns => ns.metadata.name);

      this.getAllowedNamespacesErrorCount = 0; // reset on success

      return namespaces;
    } catch (error) {
      const ctx = (await this.getProxyKubeconfig()).getContextObject(this.contextName);
      const namespaceList = [ctx.namespace].filter(Boolean);

      if (namespaceList.length === 0 && error instanceof HttpError && error.statusCode === 403) {
        this.getAllowedNamespacesErrorCount += 1;

        if (this.getAllowedNamespacesErrorCount > 3) {
          // reset on send
          this.getAllowedNamespacesErrorCount = 0;

          // then broadcast, make sure it is 3 successive attempts
          logger.info("[CLUSTER]: listing namespaces is forbidden, broadcasting", { clusterId: this.id, error });
          broadcastMessage(ClusterListNamespaceForbiddenChannel, this.id);
        }
      }

      return namespaceList;
    }
  }

  protected async getAllowedResources() {
    try {
      if (!this.allowedNamespaces.length) {
        return [];
      }
      const resources = apiResources.filter((resource) => this.resourceAccessStatuses.get(resource) === undefined);
      const apiLimit = plimit(5); // 5 concurrent api requests
      const requests = [];

      for (const apiResource of resources) {
        requests.push(apiLimit(async () => {
          for (const namespace of this.allowedNamespaces.slice(0, 10)) {
            if (!this.resourceAccessStatuses.get(apiResource)) {
              const result = await this.canI({
                resource: apiResource.apiName,
                group: apiResource.group,
                verb: "list",
                namespace
              });

              this.resourceAccessStatuses.set(apiResource, result);
            }
          }
        }));
      }
      await Promise.all(requests);

      return apiResources
        .filter((resource) => this.resourceAccessStatuses.get(resource))
        .map(apiResource => apiResource.apiName);
    } catch (error) {
      return [];
    }
  }

  private isAllowedResource(kind: string | KubeResource): boolean {
    if (kind in apiResourceRecord) {
      return this.allowedResources.includes(kind);
    }

    const apiResource = apiResources.find(resource => resource.kind === kind);

    if (apiResource) {
      return this.allowedResources.includes(apiResource.apiName);
    }

    return true; // allowed by default for other resources
  }

  /**
   * Checks if all of the asked about kinds are in the set of allowed resources
   * @param kinds A list of kinds of resources
   * @returns true if ALL kinds are allowed
   */
  isAllAllowedResource(...kinds: string[]): boolean {
    return kinds.every(kind => this.isAllowedResource(kind));
  }

  /**
   * Checks if any of the asked about kinds are in the set of allowed resources
   * @param kinds A list of kinds of resources
   * @returns true if ALL kinds are allowed, returns true if non provided
   */
  isAnyAllowedResource(...kinds: string[]): boolean {
    return kinds.some(kind => this.isAllowedResource(kind)) || kinds.length === 0;
  }
}
