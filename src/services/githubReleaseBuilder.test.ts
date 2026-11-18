import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGithubReleasePayload,
  generateGithubPublishCommands,
  selectReleaseFilenames,
  validateGithubRepoSlug,
  validateReleaseTag,
} from './githubReleaseBuilder';

test('validateGithubRepoSlug accepts standard owner/repo and full GitHub URLs', () => {
  const direct = validateGithubRepoSlug('IchooziI/TITAN-CORE-Mod');
  assert.equal(direct.ok, true);
  assert.equal(direct.owner, 'IchooziI');
  assert.equal(direct.repo, 'TITAN-CORE-Mod');
  assert.equal(direct.normalized, 'IchooziI/TITAN-CORE-Mod');

  const fromUrl = validateGithubRepoSlug('https://github.com/devchmod/TITAN-CORE.git/');
  assert.equal(fromUrl.ok, true);
  assert.equal(fromUrl.normalized, 'devchmod/TITAN-CORE');
});

test('validateGithubRepoSlug rejects invalid repository formats', () => {
  assert.equal(validateGithubRepoSlug('').ok, false);
  assert.equal(validateGithubRepoSlug('just-a-repo').ok, false);
  assert.equal(validateGithubRepoSlug('owner/repo/extra').ok, false);
  assert.equal(validateGithubRepoSlug('owner/bad repo!').ok, false);
});

test('validateReleaseTag requires v-prefixed semver tags for GitHub Actions trigger', () => {
  assert.equal(validateReleaseTag('v1.0.3-mod-20261118').ok, true);
  assert.equal(validateReleaseTag('v1.0.3').ok, true);
  assert.equal(validateReleaseTag('1.0.3').ok, false);
  assert.equal(validateReleaseTag('').ok, false);
});

test('selectReleaseFilenames includes or excludes preserved Mod v2.2 files cleanly', () => {
  const withV22 = selectReleaseFilenames(true);
  assert.equal(withV22.includes('TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz'), true);
  assert.equal(withV22.includes('TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz'), true);
  assert.equal(withV22.includes('publish-github-release.sh'), true);
  assert.equal(withV22.includes('SHA256SUMS'), true);

  const v23Only = selectReleaseFilenames(false);
  assert.equal(v23Only.includes('TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz'), true);
  assert.equal(v23Only.includes('TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz'), false);
  assert.equal(v23Only.includes('SHA256SUMS'), true);
});

test('buildGithubReleasePayload and generateGithubPublishCommands produce valid GitHub release artifacts', () => {
  const payload = buildGithubReleasePayload({
    tag: 'v1.0.3-mod-20261118',
    title: 'TITAN-CORE Mod v2.3',
    body: '# Release notes',
    draft: true,
    prerelease: false,
  });
  assert.equal(payload.tag_name, 'v1.0.3-mod-20261118');
  assert.equal(payload.draft, true);
  assert.equal(payload.prerelease, false);

  const cmd = generateGithubPublishCommands({
    repoSlug: 'IchooziI/TITAN-CORE-Mod',
    tag: 'v1.0.3-mod-20261118',
    draft: true,
    prerelease: false,
    includePreservedV22: true,
  });
  assert.equal(cmd.includes('publish-github-release.sh "IchooziI/TITAN-CORE-Mod" "v1.0.3-mod-20261118" --draft'), true);
  assert.equal(cmd.includes('--repo "IchooziI/TITAN-CORE-Mod"'), true);
  assert.equal(cmd.includes('TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz'), true);
});
