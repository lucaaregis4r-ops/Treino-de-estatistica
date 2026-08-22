import { describe, expect, it } from 'vitest';
import { createDefaultProfileRegistry } from './registry/createDefaultProfileRegistry';
import { ProfileRegistry } from './ProfileRegistry';
import { ProfileResolver } from './ProfileResolver';
import { ProfileValidator } from './ProfileValidator';
import type { CodeProfile, TrainingProfile } from './types';

describe('Profile Engine', () => {
  it('registers the six initial profiles', () => {
    const registry = createDefaultProfileRegistry();

    expect(registry.list('code')).toHaveLength(2);
    expect(registry.list('complexity')).toHaveLength(4);
    expect(registry.list('competition')).toHaveLength(1);
  });

  it('serializes a profile without changing its configuration', () => {
    const profile = createDefaultProfileRegistry().resolve('code', 'default_compact_v1', '1.0.0');
    expect(profile.ok).toBe(true);
    if (!profile.ok) return;

    expect(JSON.parse(JSON.stringify(profile.value))).toEqual(profile.value);
  });

  it('resolves a versioned profile context', () => {
    const resolver = new ProfileResolver(createDefaultProfileRegistry());
    const result = resolver.resolve({
      code: { id: 'default_compact_v1', version: '1.0.0' },
      complexity: { id: 'tactical', version: '1.0.0' },
      competition: { id: 'cbv_superliga_reference_2025_26', version: '1.0.0' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.codeProfile.kind).toBe('code');
      expect(result.value.complexityProfile.level).toBe('tactical');
      expect(result.value.competitionProfile?.effectiveDate).toBe('2025-10-01');
    }
  });

  it('returns a typed error for duplicate and missing profiles', () => {
    const registry = createDefaultProfileRegistry();
    const existing = registry.resolve('complexity', 'basic');
    expect(existing.ok).toBe(true);
    if (!existing.ok) return;

    const duplicate = registry.register(existing.value);
    const missing = registry.resolve('code', 'missing');

    expect(duplicate.ok).toBe(false);
    expect(!duplicate.ok && duplicate.error.code).toBe('duplicate_profile');
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.error.code).toBe('profile_not_found');
  });

  it('rejects invalid profile versions and training targets', () => {
    const validator = new ProfileValidator();
    const invalid: TrainingProfile = {
      kind: 'training',
      id: 'invalid_training',
      version: 'v1',
      name: 'Invalid training',
      complexityProfileId: 'basic',
      enabledSkills: ['attack'],
      targetAccuracy: 1.2,
    };

    const result = validator.validate(invalid);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['invalid_profile_version', 'invalid_target_accuracy']),
    );
  });

  it('accepts a new data-driven code profile without parser changes', () => {
    const registry = new ProfileRegistry();
    const custom: CodeProfile = {
      kind: 'code',
      id: 'test_verbose_v1',
      version: '1.0.0',
      name: 'Test verbose profile',
      grammar: ['skill', 'player', 'evaluation'],
      skills: { AT: 'attack' },
      evaluations: { '3': 'excellent' },
    };

    const registered = registry.register(custom);
    const resolved = registry.resolve('code', custom.id, custom.version);

    expect(registered.ok).toBe(true);
    expect(resolved.ok && resolved.value.grammar).toEqual(['skill', 'player', 'evaluation']);
  });
});
