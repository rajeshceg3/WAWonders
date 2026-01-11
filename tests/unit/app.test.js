/**
 * @jest-environment jsdom
 */

import { WAWondersApp } from '../../src/app.js';

// Mock Leaflet
const mockMap = {
    on: jest.fn(),
    flyTo: jest.fn(),
    once: jest.fn((event, cb) => cb()), // Immediately trigger callback
    zoomControl: { setPosition: jest.fn() }
};

const mockMarker = {
    addTo: jest.fn().mockReturnThis(),
    bindPopup: jest.fn().mockReturnThis(),
    on: jest.fn(),
    _icon: { classList: { toggle: jest.fn() } }
};

const mockL = {
    map: jest.fn(() => mockMap),
    tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
    divIcon: jest.fn(),
    marker: jest.fn(() => mockMarker),
};

window.L = mockL;

describe('WAWondersApp Logic', () => {
    let app;
    const locations = [
        { id: '1', name: 'Test Loc', coords: [0, 0], description: 'Desc', imageUrl: 'img.jpg' }
    ];

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="info-drawer"></div>
            <ul id="location-list"></ul>
            <div id="location-list-container"></div>
            <div id="detail-view"></div>
            <button id="close-drawer"></button>
        `;

        jest.clearAllMocks();
        app = new WAWondersApp(mockMap, locations);
    });

    test('init should populate location list and add markers', () => {
        app.init();

        expect(mockL.marker).toHaveBeenCalledTimes(1);
        const listItems = document.querySelectorAll('#location-list li');
        expect(listItems.length).toBe(1);
        expect(listItems[0].textContent).toBe('Test Loc');
    });

    test('selectLocation should update state and fly map', () => {
        app.init();
        app.selectLocation('1');

        expect(mockMap.flyTo).toHaveBeenCalledWith([0, 0], 10, expect.any(Object));
        expect(document.getElementById('detail-view').style.display).toBe('block');
        expect(document.getElementById('location-list-container').style.display).toBe('none');
    });

    test('closeDrawer should reset view', () => {
        app.init();
        app.selectLocation('1'); // Open it first
        app.closeDrawer();

        expect(document.getElementById('info-drawer').classList.contains('active')).toBe(false);
        expect(document.getElementById('detail-view').style.display).toBe('none');
        expect(document.getElementById('location-list-container').style.display).toBe('block');
    });
});
