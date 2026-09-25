# Localization

Locale resolution, ICU MessageFormat rendering, fallback behavior, and parity
checks across `en`, `fr`, and `pt-BR`.

```ts
import {
  assertLocalizationParity,
  createLocalizer,
} from '@mission-control/localization';

assertLocalizationParity(catalogs);

const localizer = createLocalizer({
  catalogs,
  defaultLocale: 'en',
});

const result = localizer.format(
  'validation.evidence.missing',
  { evidenceId: 'bulletin-17' },
  ['fr-CA', 'en'],
);
```

Locale selection accepts language-region preferences and resolves them to the
three platform locales. Missing messages fall back through the event default
locale and then English. Missing keys, invalid ICU syntax, missing values, and
parity failures are explicit `LocalizationError` results rather than
success-shaped defaults.
