/**
 * Maximus Optimus — shared domain types.
 *
 * These types describe real records: every state change in the product is expressed as a
 * reducer action over this model and produces an audit event. Nothing in the UI is allowed to
 * display a status that is not present in this state.
 */

export type ISODate = string;

export type UserRole = "technician" | "employee" | "manager" | "administrator";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
  tenantId: string;
  tenantName: string;
  location: string;
  email: string;
  managerId: string | null;
  initials: string;
}

/* ------------------------------------------------------------------ missions */

export type MissionPriority = "P1" | "P2" | "P3" | "P4";

export type MissionStatus =
  | "available"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "pending"
  | "escalated"
  | "resolved"
  | "completed"
  | "closed";

export type CheckpointState =
  | "not_started"
  | "in_progress"
  | "pending_authorization"
  | "waiting_on_person"
  | "pending_verification"
  | "blocked"
  | "completed"
  | "unsuccessful"
  | "skipped"
  | "escalation_required";

export type MissionPendingReason =
  | "awaiting_requester"
  | "awaiting_provider"
  | "awaiting_action"
  | "awaiting_approval"
  | "scheduled"
  | "other";

export interface EvidenceRef {
  id: string;
  label: string;
  kind: "note" | "file" | "log" | "screenshot";
  documentId: string | null;
  addedAt: ISODate;
}

export interface Checkpoint {
  id: string;
  order: number;
  title: string;
  why: string;
  expectedResult: string;
  state: CheckpointState;
  /** Recognition rule applied when this checkpoint is completed. */
  starRule: StarRuleId;
  startedAt: ISODate | null;
  completedAt: ISODate | null;
  actualResult: string;
  skipReason: string;
  evidence: EvidenceRef[];
  updatedBy: string | null;
  /** Individual difficulty for this task, 1 (basic) to 5 (expert). */
  starLevel?: 1 | 2 | 3 | 4 | 5;
  /** Person currently responsible for this task; ownership stays with the mission owner. */
  assigneeId?: string | null;
  assigneeRole?: string;
  /** What a verifier must confirm before this task can be marked complete. */
  verification?: string;
  /** When true the task cannot complete without at least one evidence item. */
  requiredEvidence?: boolean;
  /** When true an approval record must be approved before the task can complete. */
  requiresApproval?: boolean;
  approvalId?: string | null;
  /** Orders of the tasks that must be completed first. */
  dependsOn?: number[];
  blockedReason?: string;
  assignedAt?: ISODate | null;
  verifiedAt?: ISODate | null;
  verifiedBy?: string | null;
}

export type MissionEventType =
  | "mission.received"
  | "mission.assigned"
  | "mission.viewed"
  | "mission.accepted"
  | "mission.declined"
  | "mission.started"
  | "mission.checkpoint"
  | "mission.pending"
  | "mission.resumed"
  | "mission.escalated"
  | "mission.resolved"
  | "mission.completed"
  | "mission.closed"
  | "mission.document"
  | "mission.note"
  | "mission.paused"
  | "mission.help_requested"
  | "mission.task_assigned"
  | "mission.transferred"
  | "mission.review_submitted"
  | "mission.signed_off"
  | "recognition.star"
  | "recognition.xp"
  | "recognition.level"
  | "recognition.badge";

export interface MissionEvent {
  id: string;
  at: ISODate;
  type: MissionEventType;
  actorId: string;
  actorName: string;
  summary: string;
  detail: string;
}

export interface MissionDecline {
  id: string;
  at: ISODate;
  technicianId: string;
  technicianName: string;
  reason: DeclineReason;
  note: string;
}

export type DeclineReason =
  | "outside_skill_set"
  | "incorrect_assignment"
  | "access_unavailable"
  | "workload_conflict"
  | "another_department"
  | "other";

export interface MissionResolution {
  rootCause: string;
  workPerformed: string;
  resolution: string;
  verification: string;
  knowledgeArticleId: string | null;
  finalNotes: string;
  recordedAt: ISODate;
  recordedBy: string;
}

export interface MissionEscalation {
  reason: string;
  expertise: string;
  receivingTeam: string;
  at: ISODate;
  by: string;
  acknowledgedAt: ISODate | null;
}

export interface MissionPending {
  reason: MissionPendingReason;
  note: string;
  nextActionAt: ISODate | null;
  since: ISODate;
}

export interface MissionTeamMember {
  userId: string;
  name: string;
  role: string;
  department: string;
  responsibility: string;
  availability: "available" | "busy" | "offline";
}

export interface MissionSignoff {
  signerName: string;
  role: string;
  note: string;
  at: ISODate;
}

export interface MissionHelpRequest {
  id: string;
  at: ISODate;
  byId: string;
  byName: string;
  need: string;
  resolvedAt: ISODate | null;
}

export interface Mission {
  id: string;
  number: string;
  title: string;
  description: string;
  requester: { id: string; name: string; department: string; email: string };
  tenant: string;
  priority: MissionPriority;
  severity: string;
  affected: { type: string; name: string; detail: string };
  submittedAt: ISODate;
  slaDueAt: ISODate;
  status: MissionStatus;
  statusChangedAt: ISODate;
  offeredTo: string;
  assignedTeam: string;
  acceptedBy: string | null;
  acceptedAt: ISODate | null;
  startedAt: ISODate | null;
  checkpoints: Checkpoint[];
  declines: MissionDecline[];
  pending: MissionPending | null;
  escalation: MissionEscalation | null;
  resolution: MissionResolution | null;
  closedAt: ISODate | null;
  trail: MissionEvent[];
  playbookId: string;
  documentIds: string[];
  internalNotes: InternalNote[];
  requestedTools: string[];
  /** Mission-level reference shown to the technician, e.g. MO-2026-0016. */
  missionRef?: string;
  team?: MissionTeamMember[];
  signoff?: MissionSignoff | null;
  reviewSubmittedAt?: ISODate | null;
  pausedAt?: ISODate | null;
  helpRequests?: MissionHelpRequest[];
}

export interface InternalNote {
  id: string;
  at: ISODate;
  authorId: string;
  authorName: string;
  body: string;
  visibility: "internal" | "requester";
}

/* --------------------------------------------------------------------- tasks */

export type TaskStatus = "open" | "in_progress" | "blocked" | "done";

export interface Task {
  id: string;
  title: string;
  detail: string;
  status: TaskStatus;
  priority: MissionPriority | "none";
  dueAt: ISODate | null;
  project: string;
  source: "personal" | "assigned" | "mission" | "connector";
  sourceLabel: string;
  missionId: string | null;
  progressNote: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ---------------------------------------------------------------- checklists */

export type ChecklistCategory = "personal" | "troubleshooting" | "project" | "task" | "recurring";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  completedAt: ISODate | null;
  linkedMissionId: string | null;
}

export interface Checklist {
  id: string;
  title: string;
  category: ChecklistCategory;
  items: ChecklistItem[];
  dueAt: ISODate | null;
  recurring: "none" | "daily" | "weekly" | "monthly";
  missionId: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* --------------------------------------------------------------------- notes */

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  missionId: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ----------------------------------------------------------------- approvals */

export type ApprovalStatus = "pending" | "approved" | "rejected" | "escalated";

export interface ApprovalDecision {
  id: string;
  at: ISODate;
  actorId: string;
  actorName: string;
  action: "submitted" | "approved" | "rejected" | "escalated" | "commented";
  note: string;
}

export interface Approval {
  id: string;
  title: string;
  summary: string;
  type: string;
  level: 1 | 2 | 3;
  amountUsd: number | null;
  requesterName: string;
  requesterDepartment: string;
  status: ApprovalStatus;
  requiredApprover: string;
  createdAt: ISODate;
  dueAt: ISODate;
  decidedAt: ISODate | null;
  decisionNote: string;
  history: ApprovalDecision[];
  missionId: string | null;
}

/* ---------------------------------------------------------------- signatures */

export type SignatureStatus = "awaiting_signature" | "signed" | "declined" | "expired";

export interface SignatureRequest {
  id: string;
  documentName: string;
  documentId: string | null;
  requestedBy: string;
  requestedAt: ISODate;
  dueAt: ISODate;
  status: SignatureStatus;
  profileId: string | null;
  signedAt: ISODate | null;
  auditHash: string | null;
  note: string;
}

export interface SignatureProfile {
  id: string;
  label: string;
  fullName: string;
  title: string;
  style: "formal" | "initials" | "compact";
}

/* ---------------------------------------------------------------- knowledge */

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string[];
  tags: string[];
  updatedAt: ISODate;
  author: string;
  readMinutes: number;
  savedAt: ISODate | null;
  relatedMissionIds: string[];
  documentId: string | null;
}

export interface Playbook {
  id: string;
  title: string;
  category: string;
  summary: string;
  version: string;
  updatedAt: ISODate;
  steps: { title: string; guidance: string; expected: string }[];
}

/* ------------------------------------------------------------------ contacts */

export interface Contact {
  id: string;
  name: string;
  title: string;
  department: string;
  team: string;
  location: string;
  email: string;
  phone: string;
  availability: "Available" | "Busy" | "In a meeting" | "Away";
  canEscalateTo: boolean;
}

/* ---------------------------------------------------------------- connectors */

export type ConnectorStatus = "available" | "connected" | "syncing" | "attention" | "disconnected";

export type ConnectorCategory =
  | "Microsoft 365"
  | "Cloud storage"
  | "Document management"
  | "Communication"
  | "Calendar and scheduling"
  | "Business productivity"
  | "Finance and accounting"
  | "Project management"
  | "Local documents"
  | "Approved external services";

export interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  provider: "microsoft" | "local" | "external";
  status: ConnectorStatus;
  account: string | null;
  tenant: string | null;
  scopes: string[];
  capabilities: string[];
  lastSyncAt: ISODate | null;
  healthMessage: string;
  /** Human-readable prerequisite that blocks a genuine connection. */
  requirement: string | null;
  configured: boolean;
  itemCount: number;
  browserEnabled: boolean;
}

export type DocumentKind =
  | "word"
  | "excel"
  | "powerpoint"
  | "pdf"
  | "image"
  | "text"
  | "data"
  | "archive"
  | "audio"
  | "video";

export interface LibraryDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  extension: string;
  path: string;
  bytes: number;
  modifiedAt: ISODate;
  owner: string;
  folder: string;
  connectorId: string;
  previewable: boolean;
  editable: boolean;
  sharedWith: string[];
  starred: boolean;
}

export type DocumentActionMode = "linked" | "imported" | "attached";

export type WorkTargetType =
  "mission" | "task" | "project" | "knowledge" | "meeting" | "record" | "user";

export interface WorkTarget {
  type: WorkTargetType;
  id: string;
  label: string;
}

export interface DocumentAction {
  id: string;
  documentId: string;
  documentName: string;
  mode: DocumentActionMode;
  target: WorkTarget;
  connectorId: string;
  actorId: string;
  at: ISODate;
  syncState: "linked" | "copied" | "not_applicable";
  note: string;
}

export type SyncEventType =
  | "connector.connected"
  | "connector.disconnected"
  | "connector.attention"
  | "sync.completed"
  | "sync.retried"
  | "document.linked"
  | "document.imported"
  | "document.attached"
  | "event.duplicate_suppressed";

export interface SyncEvent {
  id: string;
  at: ISODate;
  connectorId: string;
  type: SyncEventType;
  summary: string;
  detail: string;
  dedupeKey: string | null;
}

/* ------------------------------------------------------------------ modules */

export interface ModuleDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  entitlement: 1 | 2 | 3 | 4 | 5;
  installed: boolean;
  inHelpBuddy: boolean;
  requires: string[];
  operational: boolean;
  unavailableReason: string | null;
}

/* --------------------------------------------------------------- characters */

export type CharacterState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "working"
  | "responding"
  | "success"
  | "concerned"
  | "escalation";

export interface CharacterProfile {
  id: string;
  name: string;
  roleLabel: string;
  avatarPreset: "noah" | "ava" | "marcus" | "priya" | "sofia";
  outfit: "blue-hoodie" | "navy-blazer" | "green-polo" | "grey-suit";
  voice: string;
  accent: string;
  personality: string;
  speakingStyle: string;
  energy: number;
  /** Optional studio presets; omitted values fall back to the seeded defaults in the UI. */
  rolePreset?: string;
  environmentPreset?: string;
  humor?: number;
  terminology?: "plain" | "technical" | "executive";
  proactivity?: "reactive" | "assisted" | "proactive";
  confirmationThreshold?: "always" | "external" | "never";
  updatedAt: ISODate;
}

/* ------------------------------------------------------------ conversations */

export interface MessageReference {
  type: "mission" | "knowledge" | "checklist" | "task" | "approval" | "document";
  id: string;
  label: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  at: ISODate;
  state: CharacterState;
  references: MessageReference[];
  /** The assistant states plainly when it has no grounded source for an answer. */
  grounded: boolean;
  attachmentIds: string[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  messages: Message[];
}

/* -------------------------------------------------------------- recognition */

export type StarRuleId =
  | "checkpoint_complete"
  | "diagnostic_verified"
  | "evidence_captured"
  | "resolution_verified"
  | "documentation_complete"
  | "escalation_prepared";

export type LedgerKind = "star" | "xp" | "level" | "badge";

export interface LedgerEntry {
  id: string;
  at: ISODate;
  kind: LedgerKind;
  ruleId: string;
  label: string;
  stars: number;
  xp: number;
  sourceType: "mission" | "checkpoint" | "training" | "knowledge" | "system";
  sourceId: string;
  sourceLabel: string;
  evidence: string;
  /** Prevents the same rule firing twice for the same source. */
  awardKey: string;
  actorId: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  category: "Service" | "Technical" | "Learning" | "Collaboration" | "Innovation";
  description: string;
  stage: "bronze" | "silver" | "gold";
  criteria: string;
  threshold: number;
  metric: keyof RecognitionStats;
}

export interface RecognitionStats {
  missionsAccepted: number;
  missionsDeclined: number;
  missionsCompleted: number;
  missionsClosed: number;
  checkpointsCompleted: number;
  checkpointsUnsuccessful: number;
  evidenceItems: number;
  documentedResolutions: number;
  escalations: number;
  knowledgeContributions: number;
  knowledgeSaved: number;
  stars: number;
  xp: number;
  level: number;
  p1Completed: number;
}

export type LevelId = number;

export interface LevelDefinition {
  level: LevelId;
  name: string;
  minXp: number;
}

/* ----------------------------------------------------------------- activity */

export type ActivitySurface =
  | "help_buddy"
  | "mission"
  | "connector"
  | "recognition"
  | "approval"
  | "signature"
  | "task"
  | "checklist"
  | "knowledge"
  | "note"
  | "identity"
  | "module";

export interface ActivityEvent {
  id: string;
  at: ISODate;
  actorId: string;
  actorName: string;
  surface: ActivitySurface;
  type: string;
  summary: string;
  detail: string;
  targetType:
    | WorkTargetType
    | "connector"
    | "checklist"
    | "approval"
    | "signature"
    | "module"
    | "note"
    | null;
  targetId: string | null;
  targetLabel: string;
}

/* -------------------------------------------------------------------- state */

export interface CommandState {
  schemaVersion: number;
  activeUserId: string;
  users: User[];
  missions: Mission[];
  tasks: Task[];
  checklists: Checklist[];
  notes: Note[];
  approvals: Approval[];
  signatures: SignatureRequest[];
  signatureProfiles: SignatureProfile[];
  knowledge: KnowledgeArticle[];
  playbooks: Playbook[];
  contacts: Contact[];
  conversations: Conversation[];
  activeConversationId: string;
  ledger: LedgerEntry[];
  activity: ActivityEvent[];
  connectors: Connector[];
  library: LibraryDocument[];
  documentActions: DocumentAction[];
  syncEvents: SyncEvent[];
  modules: ModuleDefinition[];
  characters: CharacterProfile[];
  activeCharacterId: string;
  /** Unsaved work, keyed by draft id, so switching tabs never discards in-progress edits. */
  drafts: Record<string, string>;
}
