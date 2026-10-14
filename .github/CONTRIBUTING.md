# Internal maintenance

This fork is maintained for internal use. Work does not require an upstream
issue, discussion, pull request, public npm release, or GitHub Actions run.

For a change:

1. Keep the Quill 2 public API compatible unless the internal change explicitly requires otherwise.
2. Add a regression test for behavior changes and security fixes.
3. Run `bun run verify` from the repository root.
4. Describe observable changes in `CHANGELOG.md` and update affected developer documentation.

See [development instructions](DEVELOPMENT.md) for the Bun toolchain and internal
build output. Preserve upstream source credits and license files.
