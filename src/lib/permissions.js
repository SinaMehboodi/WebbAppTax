// Granular permission catalogue + role-aware checks.
//
// Hierarchy:
//   USER          — client, never has admin perms
//   EMPLOYEE      — every protected action is gated on user.permissions[]
//   ADMIN         — head of department; auto-passes everything EXCEPT
//                   SUPER_ADMIN_ONLY perms (no destructive case/user ops)
//   SUPER_ADMIN   — developer / break-glass; auto-passes everything
//
//   import { PERMS, can } from "@/lib/permissions";
//   if (!can(user, PERMS.CASE_CLOSE)) return forbidden();
import "server-only";

export const PERMS = Object.freeze({
  // Cases — workflow actions, granted to EMPLOYEE by admin
  CASE_CLOSE:           "case.close",
  CASE_ASSIGN_SELF:     "case.assign_self",
  CASE_ASSIGN_OTHERS:   "case.assign_others",
  CASE_PREPARE_CONTRACT:"case.prepare_contract",
  CASE_REQUEST_DOCS:    "case.request_docs",
  CASE_ANALYZE:         "case.analyze",
  CASE_DECIDE:          "case.decide",
  CASE_RECORD_RESULT:   "case.record_result",
  CASE_INVOICE:         "case.invoice",
  CASE_MARK_PAID:       "case.mark_paid",
  CASE_VIEW_ALL:        "case.view_all",         // see every case, not just assigned

  // Cases — destructive, SUPER_ADMIN only
  CASE_DELETE:          "case.delete",
  CASE_DELETE_FILES:    "case.delete_files",     // delete protected docs (signed/contract/invoice)

  // Presentation
  PRESENTATION_EDIT:    "presentation.edit",
  PRESENTATION_DELETE:  "presentation.delete",

  // Reports
  REPORTS_VIEW:         "reports.view",
  REPORTS_EXPORT:       "reports.export",

  // Users — non-destructive, ADMIN can grant to senior employees
  USERS_GRANT_PERMS:    "users.grant_perms",
  USERS_CREATE_CLIENT:  "users.create_client",   // register a new USER (client)

  // Users — destructive, SUPER_ADMIN only
  USERS_CREATE:         "users.create",          // create employees / admins
  USERS_MODIFY:         "users.modify",          // edit name / email
  USERS_RESET_PASSWORD: "users.reset_password",
  USERS_DELETE:         "users.delete",          // hard delete a user
  USERS_DEACTIVATE:     "users.deactivate",
});

// Permissions only SUPER_ADMIN may exercise. ADMIN cannot do these and
// granting any of them to an EMPLOYEE is rejected by the API.
export const SUPER_ADMIN_ONLY = new Set([
  PERMS.CASE_DELETE,
  PERMS.CASE_DELETE_FILES,
  PERMS.USERS_CREATE,
  PERMS.USERS_MODIFY,
  PERMS.USERS_RESET_PASSWORD,
  PERMS.USERS_DELETE,
  PERMS.USERS_DEACTIVATE,
]);

// Granted by SUPER_ADMIN or ADMIN to EMPLOYEE.
export const GRANTABLE = Object.freeze(
  Object.values(PERMS).filter((p) => !SUPER_ADMIN_ONLY.has(p))
);

// Categorised for the admin UI — each tab in the permissions screen.
export const PERM_GROUPS = [
  {
    key: "cases",
    labelFr: "Dossiers",
    labelEn: "Cases",
    icon: "📁",
    perms: [
      { key: PERMS.CASE_PREPARE_CONTRACT, labelFr: "Préparer le contrat / mandat",          labelEn: "Prepare contract / mandate" },
      { key: PERMS.CASE_REQUEST_DOCS,     labelFr: "Demander des documents additionnels",   labelEn: "Request additional documents" },
      { key: PERMS.CASE_ANALYZE,          labelFr: "Saisir l'analyse",                      labelEn: "Submit analysis" },
      { key: PERMS.CASE_DECIDE,           labelFr: "Soumettre la décision",                 labelEn: "Submit decision" },
      { key: PERMS.CASE_RECORD_RESULT,    labelFr: "Enregistrer le résultat",               labelEn: "Record result" },
      { key: PERMS.CASE_INVOICE,          labelFr: "Émettre une facture",                   labelEn: "Issue invoice" },
      { key: PERMS.CASE_MARK_PAID,        labelFr: "Marquer une facture comme payée",       labelEn: "Mark invoice paid" },
      { key: PERMS.CASE_CLOSE,            labelFr: "Clôturer / arrêter / annuler un dossier",labelEn: "Finish / stop / cancel a case" },
      { key: PERMS.CASE_ASSIGN_SELF,      labelFr: "S'affecter à un dossier",               labelEn: "Assign yourself to a case" },
      { key: PERMS.CASE_ASSIGN_OTHERS,    labelFr: "Affecter / désaffecter d'autres",       labelEn: "Assign / unassign others" },
      { key: PERMS.CASE_VIEW_ALL,         labelFr: "Voir tous les dossiers (vue manager)",  labelEn: "See every case (manager view)" },
    ],
  },
  {
    key: "presentation",
    labelFr: "Présentation",
    labelEn: "Presentation",
    icon: "🎤",
    perms: [
      { key: PERMS.PRESENTATION_EDIT,   labelFr: "Créer / modifier les slides",   labelEn: "Create / edit slides" },
      { key: PERMS.PRESENTATION_DELETE, labelFr: "Supprimer une slide",            labelEn: "Delete a slide" },
    ],
  },
  {
    key: "reports",
    labelFr: "Rapports",
    labelEn: "Reports",
    icon: "📊",
    perms: [
      { key: PERMS.REPORTS_VIEW,   labelFr: "Voir les rapports",     labelEn: "View reports" },
      { key: PERMS.REPORTS_EXPORT, labelFr: "Exporter en CSV",        labelEn: "Export to CSV" },
    ],
  },
  {
    key: "team",
    labelFr: "Équipe & clients",
    labelEn: "Team & clients",
    icon: "👥",
    perms: [
      { key: PERMS.USERS_CREATE_CLIENT, labelFr: "Inscrire un nouveau client", labelEn: "Register a new client" },
      { key: PERMS.USERS_GRANT_PERMS,   labelFr: "Modifier les permissions d'autres employés", labelEn: "Edit other employees' permissions" },
    ],
  },
];

export function can(user, perm) {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (SUPER_ADMIN_ONLY.has(perm)) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "EMPLOYEE") return Array.isArray(user.permissions) && user.permissions.includes(perm);
  return false;
}

// SUPER_ADMIN and ADMIN can both grant employee permissions. Employees may
// only if they were given USERS_GRANT_PERMS (rare).
export function canGrantPerms(user) {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return true;
  if (user.role === "EMPLOYEE" && user.permissions?.includes(PERMS.USERS_GRANT_PERMS)) return true;
  return false;
}

export function canHardDelete(user) {
  return user?.role === "SUPER_ADMIN";
}

// Strip any SUPER_ADMIN_ONLY keys the client might try to send into the
// employee permissions form.
export function filterGrantable(perms) {
  return [...new Set(perms)].filter((p) => GRANTABLE.includes(p));
}
