import { expect, test } from 'vitest';

import { captcha } from '../src';

test('captcha plugin', () => {
  const plugin = captcha({
    providerUrl: 'https://cap.example.com/site-key',
    secretKey: 'secret',
  });

  expect(plugin.id).toBe('captcha');
  expect(plugin.$ERROR_CODES).toBeDefined();
});
