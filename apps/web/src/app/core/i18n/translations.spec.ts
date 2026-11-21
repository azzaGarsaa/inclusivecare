import ar from '../../../../public/i18n/ar.json';
import en from '../../../../public/i18n/en.json';
import fr from '../../../../public/i18n/fr.json';

interface Tree {
  [key: string]: string | Tree;
}

/** Flattens nested translations to `a.b.c` → text. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((all, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...all, [path]: value }
      : { ...all, ...flatten(value, path) };
  }, {});
}

const placeholders = (text: string) =>
  [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  const reference = flatten(en);
  const others = { fr: flatten(fr), ar: flatten(ar) };

  it.each(Object.entries(others))(
    '%s has exactly the same keys as English',
    (_lang, translation) => {
      expect(Object.keys(translation).sort()).toEqual(Object.keys(reference).sort());
    },
  );

  it.each(Object.entries(others))(
    '%s uses the same placeholders as English',
    (_lang, translation) => {
      for (const [key, text] of Object.entries(reference)) {
        expect(placeholders(translation[key]), key).toEqual(placeholders(text));
      }
    },
  );

  it('has no empty text in any language', () => {
    for (const translation of [reference, ...Object.values(others)]) {
      for (const [key, text] of Object.entries(translation)) {
        expect(text.trim(), key).not.toBe('');
      }
    }
  });
});
