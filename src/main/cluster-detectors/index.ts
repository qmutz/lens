import { ClusterIdDetector } from "./cluster-id-detector";
import { DetectorRegistry } from "./detector-registry";
import { DistributionDetector } from "./distribution-detector";
import { LastSeenDetector } from "./last-seen-detector";
import { NodesCountDetector } from "./nodes-count-detector";
import { VersionDetector } from "./version-detector";

export function initalizeClusterDetectorRegistry() {
  DetectorRegistry.createInstance()
    .add(ClusterIdDetector)
    .add(LastSeenDetector)
    .add(VersionDetector)
    .add(DistributionDetector)
    .add(NodesCountDetector);
}
