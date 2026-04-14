// Workbench Composer Types
// Conversation flow types for F002 - Workbench Composer

export type ComposerMessageType =
  | "user_request"
  | "system_clarification"
  | "governance_prompt"
  | "next_step_hint"
  | "action_submission"
  | "feature_update"
  | "confirmation_response";

export type ComposerActionType =
  | "continue"
  | "confirm"
  | "update"
  | "write"
  | "clarify"
  | "cancel"
  | "retry";

export interface ComposerMessage {
  id: string;
  type: ComposerMessageType;
  content: string;
  timestamp: string;
  metadata?: {
    actionType?: ComposerActionType;
    requiresInput?: boolean;
    suggestedInputs?: string[];
    relatedFeatureId?: string;
    governanceItemIds?: string[];
  };
}

export interface ComposerFlow {
  sessionId: string;
  messages: ComposerMessage[];
  currentStage: ComposerStage;
  suggestedActions: ComposerSuggestedAction[];
  inputPlaceholder?: string;
  isAwaitingInput: boolean;
}

export type ComposerStage =
  | "initial"
  | "clarifying"
  | "routing"
  | "reviewing"
  | "confirming"
  | "planning"
  | "generating"
  | "writing"
  | "complete"
  | "error";

export interface ComposerSuggestedAction {
  id: string;
  type: ComposerActionType;
  label: string;
  description?: string;
  enabled: boolean;
  primary?: boolean;
  danger?: boolean;
}

export interface ComposerState {
  inputValue: string;
  isSubmitting: boolean;
  showActionButtons: boolean;
  expanded: boolean;
}
