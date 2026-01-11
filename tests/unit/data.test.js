import { locations } from '../../src/data.js';

describe('Data Integrity', () => {
    test('locations array should exist and be an array', () => {
        expect(Array.isArray(locations)).toBe(true);
        expect(locations.length).toBeGreaterThan(0);
    });

    test('each location should have required fields', () => {
        locations.forEach(loc => {
            expect(loc).toHaveProperty('id');
            expect(loc).toHaveProperty('name');
            expect(loc).toHaveProperty('coords');
            expect(loc).toHaveProperty('description');
            expect(loc).toHaveProperty('imageUrl');
        });
    });

    test('coords should be valid [lat, lng]', () => {
        locations.forEach(loc => {
            expect(Array.isArray(loc.coords)).toBe(true);
            expect(loc.coords).toHaveLength(2);
            expect(typeof loc.coords[0]).toBe('number');
            expect(typeof loc.coords[1]).toBe('number');
        });
    });
});
