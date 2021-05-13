import { createPageParam, navigation } from "../../navigation";

/**
 * Used to store `object.selfLink` to show more info about resource in the details panel.
 */
export const kubeDetailsUrlParam = createPageParam({
  name: "kube-details",
  isSystem: true,
});

/**
 * Used to highlight last active/selected table row with the resource.
 *
 * @example
 * If we go to "Nodes (page) -> Node (details) -> Pod (details)",
 * last clicked Node should be "active" while Pod details are shown).
 */
export const kubeSelectedUrlParam = createPageParam({
  name: "kube-selected",
  isSystem: true,
  get defaultValue() {
    return kubeDetailsUrlParam.get();
  }
});

export function toggleDetails(selfLink = "", resetSelected = true) {
  navigation.merge({ search: getDetailsUrl(selfLink, resetSelected) });
}

export function getDetailsUrl(selfLink: string, resetSelected = false, mergeGlobals = true) {
  const params = new URLSearchParams(mergeGlobals ? navigation.searchParams : "");

  params.set(kubeDetailsUrlParam.urlName, selfLink);

  if (resetSelected) {
    params.delete(kubeSelectedUrlParam.urlName);
  } else {
    params.set(kubeSelectedUrlParam.urlName, kubeSelectedUrlParam.get());
  }

  return `?${params}`;
}
