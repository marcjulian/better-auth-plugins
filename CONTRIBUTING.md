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

Run the release script at the project root:

```bash
pnpm release
```

It will prompt for which plugin to release and the bump type (patch/minor/major), then bump the version, commit, and create a git tag automatically.

After the script finishes, push the tag to trigger the publish workflow:

```bash
git push --follow-tags
```

> Note: Publishing requires an `NPM_TOKEN` secret set in the GitHub repository.
