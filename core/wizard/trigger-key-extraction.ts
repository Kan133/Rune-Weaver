export interface TriggerKeySignal {
  key?: string;
  fromKey?: string;
  toKey?: string;
  evidenceText?: string;
  kind: "activation" | "rebind";
}

function normalizeTriggerKey(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/^F\d{1,2}$/.test(normalized) || /^[A-Z]$/.test(normalized)) {
    return normalized;
  }

  return undefined;
}

function buildSignal(
  kind: TriggerKeySignal["kind"],
  match: RegExpMatchArray | null,
  inputIndex: number,
  targetIndex?: number,
): TriggerKeySignal | undefined {
  if (!match) {
    return undefined;
  }

  const fromKey = normalizeTriggerKey(match[inputIndex]);
  const toKey = typeof targetIndex === "number" ? normalizeTriggerKey(match[targetIndex]) : undefined;
  const key = toKey || fromKey;
  if (!key) {
    return undefined;
  }

  return {
    key,
    fromKey,
    ...(toKey ? { toKey } : {}),
    evidenceText: match[0],
    kind,
  };
}

export function extractTriggerKeySignal(rawText: string): TriggerKeySignal | undefined {
  const rebindPatterns: Array<{ pattern: RegExp; fromIndex: number; toIndex: number }> = [
    {
      pattern:
        /(?:change|rebind|switch|update|set|move)[^\n]{0,40}?(?:trigger\s*key|key(?:\s*binding)?|hotkey)[^\n]{0,20}?\bfrom\b\s*(f\d+|[a-z])\b[^\n]{0,20}?\bto\b\s*(f\d+|[a-z])\b/iu,
      fromIndex: 1,
      toIndex: 2,
    },
    {
      pattern:
        /(?:change|rebind|switch|update|set|move)[^\n]{0,20}?\b(f\d+|[a-z])\b[^\n]{0,20}?(?:to|into)\s*(f\d+|[a-z])\b/iu,
      fromIndex: 1,
      toIndex: 2,
    },
    {
      pattern:
        /(?:把|将)(?:[^\n]{0,16}?)?(?:触发键|按键|快捷键|热键)[^\n]{0,10}?(?:从)?\s*(f\d+|[a-z])\s*(?:改(?:成|为)|换(?:成|为|到)?|改到|切(?:到|换到)?|调整(?:到|为)?|设为)\s*(f\d+|[a-z])/iu,
      fromIndex: 1,
      toIndex: 2,
    },
  ];

  for (const { pattern, fromIndex, toIndex } of rebindPatterns) {
    const signal = buildSignal("rebind", rawText.match(pattern), fromIndex, toIndex);
    if (signal) {
      return signal;
    }
  }

  const targetOnlyRebindPatterns: Array<{ pattern: RegExp; keyIndex: number }> = [
    {
      pattern:
        /(?:change|rebind|switch|update|set|move)[^\n]{0,40}?(?:trigger\s*key|key(?:\s*binding)?|hotkey)[^\n]{0,20}?(?:to|into|as)\s*(f\d+|[a-z])\b/iu,
      keyIndex: 1,
    },
    {
      pattern:
        /(?:把|将)(?:[^\n]{0,16}?)?(?:触发键|按键|快捷键|热键)[^\n]{0,10}?(?:改(?:成|为)|换(?:成|为|到)?|切(?:到|换到)?|调整(?:到|为)?|设为)\s*(f\d+|[a-z])\b/iu,
      keyIndex: 1,
    },
  ];

  for (const { pattern, keyIndex } of targetOnlyRebindPatterns) {
    const signal = buildSignal("rebind", rawText.match(pattern), keyIndex);
    if (signal) {
      return signal;
    }
  }

  const activationPatterns: Array<{ pattern: RegExp; keyIndex: number }> = [
    {
      pattern: /(?:press|hit|tap|bind|when(?:\s+the)?\s+player\s+presses?)\s+(f\d+|[a-z])\b/iu,
      keyIndex: 1,
    },
    {
      pattern: /(?:trigger\s*key|key(?:\s*binding)?|hotkey)[^\n]{0,12}?(?:to|as|is)\s*(f\d+|[a-z])\b/iu,
      keyIndex: 1,
    },
    {
      pattern: /(?:按下|按|触发键|快捷键|热键)[^\n]{0,6}?(f\d+|[a-z])\b/iu,
      keyIndex: 1,
    },
  ];

  for (const { pattern, keyIndex } of activationPatterns) {
    const signal = buildSignal("activation", rawText.match(pattern), keyIndex);
    if (signal) {
      return signal;
    }
  }

  return undefined;
}

export function extractRequestedTriggerKeyFromPrompt(rawText: string): string | undefined {
  return extractTriggerKeySignal(rawText)?.key;
}
