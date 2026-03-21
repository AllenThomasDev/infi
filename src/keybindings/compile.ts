import { parseKeybindingShortcut } from "./parse-shortcut";
import { parseKeybindingWhenExpression } from "./parse-when";
import type {
  KeybindingRule,
  ResolvedKeybindingRule,
  ResolvedKeybindingsConfig,
} from "./types";

export function compileResolvedKeybindingRule(
  rule: KeybindingRule,
): ResolvedKeybindingRule | null {
  const shortcut = parseKeybindingShortcut(rule.key);
  if (!shortcut) return null;

  if (rule.when !== undefined) {
    const whenAst = parseKeybindingWhenExpression(rule.when);
    if (!whenAst) return null;
    return { command: rule.command, label: rule.label, shortcut, whenAst };
  }

  return { command: rule.command, label: rule.label, shortcut };
}

export function compileResolvedKeybindingsConfig(
  config: ReadonlyArray<KeybindingRule>,
): ResolvedKeybindingsConfig {
  const compiled: ResolvedKeybindingsConfig = [];
  for (const rule of config) {
    const resolved = compileResolvedKeybindingRule(rule);
    if (resolved) {
      compiled.push(resolved);
    }
  }
  return compiled;
}
