import "./details.scss";

import { observer } from "mobx-react";
import React from "react";

import { KubeEventDetails } from "../../+events/kube-event-details";
import { Role } from "../../../api/endpoints";
import { kubeObjectDetailRegistry } from "../../../api/kube-object-detail-registry";
import { DrawerTitle } from "../../drawer";
import { KubeObjectDetailsProps } from "../../kube-object";
import { KubeObjectMeta } from "../../kube-object/kube-object-meta";

interface Props extends KubeObjectDetailsProps<Role> {
}

@observer
export class ClusterRoleDetails extends React.Component<Props> {
  render() {
    const { object: clusterRole } = this.props;

    if (!clusterRole) return;
    const rules = clusterRole.getRules();

    return (
      <div className="ClusterRoleDetails">
        <KubeObjectMeta object={clusterRole}/>

        <DrawerTitle title="Rules"/>
        {rules.map(({ resourceNames, apiGroups, resources, verbs }, index) => {
          return (
            <div className="rule" key={index}>
              {resources && (
                <>
                  <div className="name">Resources</div>
                  <div className="value">{resources.join(", ")}</div>
                </>
              )}
              {verbs && (
                <>
                  <div className="name">Verbs</div>
                  <div className="value">{verbs.join(", ")}</div>
                </>
              )}
              {apiGroups && (
                <>
                  <div className="name">Api Groups</div>
                  <div className="value">
                    {apiGroups
                      .map(apiGroup => apiGroup === "" ? `'${apiGroup}'` : apiGroup)
                      .join(", ")
                    }
                  </div>
                </>
              )}
              {resourceNames && (
                <>
                  <div className="name">Resource Names</div>
                  <div className="value">{resourceNames.join(", ")}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}

kubeObjectDetailRegistry.add({
  kind: "ClusterRole",
  apiVersions: ["rbac.authorization.k8s.io/v1"],
  components: {
    Details: (props) => <ClusterRoleDetails {...props}/>
  }
});
kubeObjectDetailRegistry.add({
  kind: "ClusterRole",
  apiVersions: ["rbac.authorization.k8s.io/v1"],
  priority: 5,
  components: {
    Details: (props) => <KubeEventDetails {...props}/>
  }
});
