# Contributing

## Creating a New Plugin

New plugins live in the `packages/` directory. Use the `tsdown` scaffolding tool to bootstrap a new package:

```bash
cd packages
pnpm create tsdown@latest
```

When prompted:

1. Enter the **package name** following the `better-auth-<plugin-name>` convention (e.g. `better-auth-my-plugin`)
2. Select the **default template**

This generates the boilerplate files (`package.json`, `tsdown.config.ts`, `tsconfig.json`, and a `src/` entry point) needed to build and publish the plugin.

### After scaffolding

1. Implement your plugin logic inside `src/`.
2. Add an entry for the new plugin in the root `README.md`.

## Releasing a New Version

1. Bump the version in the plugin's `packages/<plugin>/package.json` (or use `bumpp`).
2. Commit the change.
3. Push a tag matching `{plugin-dir}-v{version}`, for example:

   ```bash
   git tag cookie-consent-v0.2.0
   git push origin cookie-consent-v0.2.0
   ```

   The tag name **must match the plugin's directory name** under `packages/`. The CI workflow will build the package and publish it to npm automatically.

> Note: Publishing requires an `NPM_TOKEN` secret set in the GitHub repository.
