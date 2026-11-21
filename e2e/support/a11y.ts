import AxeBuilder from '@axe-core/playwright';
import { expect, Page } from '@playwright/test';

/** Fails with a readable list if axe finds any WCAG 2.2 A/AA violation on the current page. */
export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  // Scanning mid-transition (e.g. a validation message fading in) measures half-transparent
  // text and reports false contrast failures on slower machines.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n')}`,
  );
  expect(summary, `Accessibility violations on ${page.url()}`).toEqual([]);
}
