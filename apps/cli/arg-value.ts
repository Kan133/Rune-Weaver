export function consumePossiblySpacedFlagValue(args: string[], currentIndex: number): {
  value?: string;
  nextIndex: number;
} {
  const firstValue = args[currentIndex + 1];
  if (typeof firstValue !== "string") {
    return {
      value: undefined,
      nextIndex: currentIndex,
    };
  }

  const segments = [firstValue];
  let nextIndex = currentIndex + 1;

  for (let index = currentIndex + 2; index < args.length; index += 1) {
    const candidate = args[index];
    if (candidate.startsWith("-")) {
      break;
    }

    segments.push(candidate);
    nextIndex = index;
  }

  return {
    value: segments.join(" "),
    nextIndex,
  };
}
