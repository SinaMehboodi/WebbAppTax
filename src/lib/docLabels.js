// Build the labels object passed to <DocumentTile>. Centralizing this keeps
// the prop wiring identical everywhere the tile is used (admin + client).
export function buildDocLabels(t) {
  return {
    view: t("common.view"),
    download: t("common.download"),
    delete: t("common.delete"),
    confirm: t("common.confirm"),
    cancel: t("common.cancel"),
    deleteError: t("common.deleteError"),
  };
}
