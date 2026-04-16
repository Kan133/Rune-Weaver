import type {
  CLICanonicalAcceptance,
  CLICanonicalGapFillGuidance,
  CLIGapFillDecisionRecord,
  CLIGapFillReadiness,
  CLIReviewPayload,
  GapFillProductStatus,
} from '@/hooks/useCLIExecutor';

export interface GapFillApprovalUnitViewModel {
  classificationLabel: string;
  classificationTone: 'canonical' | 'exploratory';
  evidenceLabel: string;
  targetSurface: string;
  targetFile?: string;
  verdictLabel: string;
  nextStep: string;
  rationale: string;
  blockedReason?: string;
  blockedItems: string[];
  assumptions: string[];
  userInputs: string[];
  inferredInputs: string[];
  failureCategories: string[];
}

function deriveVerdictLabel(
  status: GapFillProductStatus | undefined,
  decision: string | undefined,
): string {
  if (status === 'blocked_by_policy') {
    return '策略阻塞';
  }
  if (status === 'blocked_by_host') {
    return '宿主阻塞';
  }
  if (status === 'needs_confirmation') {
    return '需要确认';
  }
  if (status === 'ready_to_apply') {
    return decision === 'auto_apply' ? '允许应用' : '可继续应用';
  }
  return decision || '等待评审';
}

function deriveRationale(input: {
  status: GapFillProductStatus | undefined;
  guidance: CLICanonicalGapFillGuidance;
  acceptance: CLICanonicalAcceptance;
  readiness?: CLIGapFillReadiness;
}): { rationale: string; blockedReason?: string } {
  const { status, guidance, acceptance, readiness } = input;

  if (status === 'blocked_by_policy') {
    return {
      rationale:
        '当前 patch 已越过受保护结构或策略边界，Workbench 只能把这次结果展示为被拦截的审批单元，不能继续在这条路径上应用。',
      blockedReason: '这次请求触碰了 Blueprint / Pattern / Host authority 之外的受保护结构。',
    };
  }

  if (status === 'blocked_by_host') {
    return {
      rationale:
        '当前业务逻辑审批单元本身已经可读，但 CLI 仍判定宿主未准备好，所以必须先补齐宿主前置项，再继续 confirmation / apply / validate。',
      blockedReason: readiness?.blockingItems?.[0] || '宿主 readiness 仍有缺口。',
    };
  }

  if (status === 'needs_confirmation') {
    return {
      rationale:
        'CLI 已生成可审阅的审批单元，但这一步还不能直接应用。你需要先确认正在批准的边界内变更，再继续 apply。',
    };
  }

  if (status === 'ready_to_apply') {
    return {
      rationale:
        acceptance.classification === 'canonical_acceptance_ready'
          ? '当前 canonical run 已完成 apply/validate 所需前置，后续动作只是在 CLI authority 下继续 repair-build 和 launch 收尾。'
          : '当前审批单元已经允许继续 apply，但 acceptance 收尾是否成立仍取决于后续 validate、host readiness 和 continuation 条件。',
    };
  }

  return {
    rationale: guidance.summary,
  };
}

export function buildGapFillApprovalUnit(input: {
  review?: CLIReviewPayload | null;
  decisionRecord?: CLIGapFillDecisionRecord;
  readiness?: CLIGapFillReadiness;
  guidance: CLICanonicalGapFillGuidance;
  acceptance: CLICanonicalAcceptance;
  effectiveBoundary?: string;
}): GapFillApprovalUnitViewModel {
  const { review, decisionRecord, readiness, guidance, acceptance, effectiveBoundary } = input;
  const status = review?.gapFillStatus;
  const targetSurface =
    decisionRecord?.selectedBoundaryLabel ||
    decisionRecord?.selectedBoundary ||
    effectiveBoundary ||
    guidance.expectedBoundary;
  const nextStep =
    decisionRecord?.exactNextStep ||
    guidance.nextStep ||
    acceptance.nextStep ||
    '先生成 review，再按 confirmation/apply -> validate -> repair-build -> launch 继续。';
  const blockedItems = status === 'blocked_by_host' ? (readiness?.blockingItems || []) : [];
  const { rationale, blockedReason } = deriveRationale({
    status,
    guidance,
    acceptance,
    readiness,
  });

  return {
    classificationLabel: guidance.classification === 'canonical' ? 'Canonical' : 'Exploratory',
    classificationTone: guidance.classification,
    evidenceLabel:
      guidance.classification === 'canonical'
        ? 'Acceptance-oriented review unit'
        : 'Exploratory only, not acceptance-equivalent',
    targetSurface,
    targetFile: review?.generatedFiles?.[0],
    verdictLabel: deriveVerdictLabel(status, decisionRecord?.decision),
    nextStep,
    rationale,
    blockedReason,
    blockedItems,
    assumptions: decisionRecord?.assumptionsMade || [],
    userInputs: decisionRecord?.userInputsUsed || [],
    inferredInputs: decisionRecord?.inferredInputsUsed || [],
    failureCategories: decisionRecord?.failureCategories || [],
  };
}
