// deploymentDefaults: which committed deployment (packages/shared deployments.ts) a Railway environment gets.

import { describe, expect, test } from 'bun:test';
import { DEPLOYMENTS } from '@frontpage/shared';
import { deploymentDefaults } from '../src/env';

describe('deploymentDefaults', () => {
    test('uses the local URLs off Railway', () => {
        expect(deploymentDefaults(undefined)).toBe(DEPLOYMENTS.local);
        expect(deploymentDefaults('')).toBe(DEPLOYMENTS.local);
    });

    test('maps the production and staging Railway environments to their rows', () => {
        expect(deploymentDefaults('production')?.apiUrl).toBe('https://api.readfrontpage.com');
        expect(deploymentDefaults('staging')?.siteUrl).toBe('https://staging.readfrontpage.com');
        expect(deploymentDefaults('staging')?.cookiePrefix).toBe('frontpage-staging');
    });

    test('gives an unknown Railway environment no defaults, so production checks stop it', () => {
        expect(deploymentDefaults('pr-42')).toBeUndefined();
        expect(deploymentDefaults('local')).toBeUndefined();
    });
});
