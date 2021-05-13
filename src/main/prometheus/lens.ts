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

import type { PrometheusProvider, PrometheusQueryOpts, PrometheusQuery, PrometheusService } from "./provider-registry";
import type { CoreV1Api } from "@kubernetes/client-node";
import logger from "../logger";

export class PrometheusLens implements PrometheusProvider {
  id = "lens";
  name = "Lens";
  rateAccuracy = "1m";

  public async getPrometheusService(client: CoreV1Api): Promise<PrometheusService | null> {
    try {
      const resp = await client.readNamespacedService("prometheus", "lens-metrics");
      const service = resp.body;

      return {
        id: this.id,
        namespace: service.metadata.namespace,
        service: service.metadata.name,
        port: service.spec.ports[0].port
      };
    } catch(error) {
      logger.warn(`PrometheusLens: failed to list services: ${error.response.body.message}`);

      return null;
    }
  }

  public getQueries(opts: PrometheusQueryOpts): PrometheusQuery | undefined {
    switch(opts.category) {
      case "cluster":
        return {
          memoryUsage: `
          sum(
            node_memory_MemTotal_bytes - (node_memory_MemFree_bytes + node_memory_Buffers_bytes + node_memory_Cached_bytes)
          ) by (kubernetes_name)
        `.replace(/_bytes/g, `_bytes{kubernetes_node=~"${opts.nodes}"}`),
          memoryRequests: `sum(kube_pod_container_resource_requests{node=~"${opts.nodes}", resource="memory"}) by (component)`,
          memoryLimits: `sum(kube_pod_container_resource_limits{node=~"${opts.nodes}", resource="memory"}) by (component)`,
          memoryCapacity: `sum(kube_node_status_capacity{node=~"${opts.nodes}", resource="memory"}) by (component)`,
          cpuUsage: `sum(rate(node_cpu_seconds_total{kubernetes_node=~"${opts.nodes}", mode=~"user|system"}[${this.rateAccuracy}]))`,
          cpuRequests:`sum(kube_pod_container_resource_requests{node=~"${opts.nodes}", resource="cpu"}) by (component)`,
          cpuLimits: `sum(kube_pod_container_resource_limits{node=~"${opts.nodes}", resource="cpu"}) by (component)`,
          cpuCapacity: `sum(kube_node_status_capacity{node=~"${opts.nodes}", resource="cpu"}) by (component)`,
          podUsage: `sum({__name__=~"kubelet_running_pod_count|kubelet_running_pods", instance=~"${opts.nodes}"})`,
          podCapacity: `sum(kube_node_status_capacity{node=~"${opts.nodes}", resource="pods"}) by (component)`,
          fsSize: `sum(node_filesystem_size_bytes{kubernetes_node=~"${opts.nodes}", mountpoint="/"}) by (kubernetes_node)`,
          fsUsage: `sum(node_filesystem_size_bytes{kubernetes_node=~"${opts.nodes}", mountpoint="/"} - node_filesystem_avail_bytes{kubernetes_node=~"${opts.nodes}", mountpoint="/"}) by (kubernetes_node)`
        };
      case "nodes":
        return {
          memoryUsage: `sum (node_memory_MemTotal_bytes - (node_memory_MemFree_bytes + node_memory_Buffers_bytes + node_memory_Cached_bytes)) by (kubernetes_node)`,
          memoryCapacity: `sum(kube_node_status_capacity{resource="memory"}) by (node)`,
          cpuUsage: `sum(rate(node_cpu_seconds_total{mode=~"user|system"}[${this.rateAccuracy}])) by(kubernetes_node)`,
          cpuCapacity: `sum(kube_node_status_allocatable{resource="cpu"}) by (node)`,
          fsSize: `sum(node_filesystem_size_bytes{mountpoint="/"}) by (kubernetes_node)`,
          fsUsage: `sum(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) by (kubernetes_node)`
        };
      case "pods":
        return {
          cpuUsage: `sum(rate(container_cpu_usage_seconds_total{container!="POD",container!="",pod=~"${opts.pods}",namespace="${opts.namespace}"}[${this.rateAccuracy}])) by (${opts.selector})`,
          cpuRequests: `sum(kube_pod_container_resource_requests{pod=~"${opts.pods}",resource="cpu",namespace="${opts.namespace}"}) by (${opts.selector})`,
          cpuLimits: `sum(kube_pod_container_resource_limits{pod=~"${opts.pods}",resource="cpu",namespace="${opts.namespace}"}) by (${opts.selector})`,
          memoryUsage: `sum(container_memory_working_set_bytes{container!="POD",container!="",pod=~"${opts.pods}",namespace="${opts.namespace}"}) by (${opts.selector})`,
          memoryRequests: `sum(kube_pod_container_resource_requests{pod=~"${opts.pods}",resource="memory",namespace="${opts.namespace}"}) by (${opts.selector})`,
          memoryLimits: `sum(kube_pod_container_resource_limits{pod=~"${opts.pods}",resource="memory",namespace="${opts.namespace}"}) by (${opts.selector})`,
          fsUsage: `sum(container_fs_usage_bytes{container!="POD",container!="",pod=~"${opts.pods}",namespace="${opts.namespace}"}) by (${opts.selector})`,
          networkReceive: `sum(rate(container_network_receive_bytes_total{pod=~"${opts.pods}",namespace="${opts.namespace}"}[${this.rateAccuracy}])) by (${opts.selector})`,
          networkTransmit: `sum(rate(container_network_transmit_bytes_total{pod=~"${opts.pods}",namespace="${opts.namespace}"}[${this.rateAccuracy}])) by (${opts.selector})`
        };
      case "pvc":
        return {
          diskUsage: `sum(kubelet_volume_stats_used_bytes{persistentvolumeclaim="${opts.pvc}"}) by (persistentvolumeclaim, namespace)`,
          diskCapacity: `sum(kubelet_volume_stats_capacity_bytes{persistentvolumeclaim="${opts.pvc}"}) by (persistentvolumeclaim, namespace)`
        };
      case "ingress":
        const bytesSent = (ingress: string, statuses: string) =>
          `sum(rate(nginx_ingress_controller_bytes_sent_sum{ingress="${ingress}", status=~"${statuses}"}[${this.rateAccuracy}])) by (ingress)`;

        return {
          bytesSentSuccess: bytesSent(opts.ingress, "^2\\\\d*"),
          bytesSentFailure: bytesSent(opts.ingress, "^5\\\\d*"),
          requestDurationSeconds: `sum(rate(nginx_ingress_controller_request_duration_seconds_sum{ingress="${opts.ingress}"}[${this.rateAccuracy}])) by (ingress)`,
          responseDurationSeconds: `sum(rate(nginx_ingress_controller_response_duration_seconds_sum{ingress="${opts.ingress}"}[${this.rateAccuracy}])) by (ingress)`
        };
    }

    return undefined;
  }
}
