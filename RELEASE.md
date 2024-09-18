# How to release a new version of XCOM Companion

1. Increment the version in `package.json`
2. Commit the version bump.
3. Create a corresponding git tag, e.g. if the new version is `1.2.3`, the tag should be `v1.2.3`.
4. Push the new commit and tag.
5. Delete the `dist` folder if present and run `npm run build` to generate it again.
6. Draft a new release in Github, and upload `XCOM Companion Setup <version>.exe` and ``XCOM Companion Setup <version>.exe.blockmap` to the release.
7. Open `dist/latest.yml` and check if the filenames there match the names shown in the Github release. If Github has modified them, update `latest.yml` to match.
8. Add `dist/latest.yml` to the release.
9. Select the new tag, update the release notes, and publish.