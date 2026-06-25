import { expect, test } from 'vitest';

import { captcha } from '../src';

test('captcha plugin', () => {
  const plugin = captcha({
    providerUrl: 'https://cap.example.com',
    siteKeys: {
      'site-key-1': 'secret-1',
      'site-key-2': 'secret-2',
    },
  });

  expect(plugin.id).toBe('captcha');
  expect(plugin.$ERROR_CODES).toBeDefined();
});
