import { expect, test } from 'vitest';

import { capCaptcha } from '../src';

test('capCaptcha plugin', () => {
  const plugin = capCaptcha({
    providerUrl: 'https://cap.example.com',
    siteKeys: {
      'site-key-1': 'secret-1',
      'site-key-2': 'secret-2',
    },
  });

  expect(plugin.id).toBe('cap-captcha');
  expect(plugin.$ERROR_CODES).toBeDefined();
});
