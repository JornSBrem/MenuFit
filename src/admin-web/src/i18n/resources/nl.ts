export const nlAdminResources = {
  "admin.tab.data": "Data",
  "admin.tab.settings": "Instellingen",
  "admin.tab.extract": "Extract",
  "admin.tab.operations": "Operations",
  "admin.status.completed": "Voltooid",
  "admin.status.dry_run": "Dry-run",
  "admin.operation.ingest": "Ingest",
  "admin.operation.recompute": "Recompute",
  "admin.operation.config_update": "Configuratie-update",
  "admin.operation.cleanup": "Opschonen",
  "admin.operation.cutover_checklist": "Cutover-checklist",
  "admin.pending.true": "Bezig...",
  "admin.pending.false": "Klaar",
  "admin.error.with_hint": "{code}: {message} ({hint})",
  "admin.error.without_hint": "{code}: {message}",
} as const;

export type AdminI18nKey = keyof typeof nlAdminResources;
