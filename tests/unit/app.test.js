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
    _icon: { classList: { toggle: jest.fn(), add: jest.fn(), remove: jest.fn() } },
    setZIndexOffset: jest.fn()
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
        expect(listItems[0].textContent).toContain('Test Loc');
    });

    test('selectLocation should update state and fly map', () => {
        app.init();
        app.selectLocation('1');

        expect(mockMap.flyTo).toHaveBeenCalledWith([0, 0], 10, expect.any(Object));
        // detail-view logic involves timers now, but the initial call sets content and logic starts transition
        // Since we are mocking timers, we might need jest.useFakeTimers() if we want to test exact display state immediately
        // However, showDetailView sets display:block inside a timeout?
        // Wait, my implementation:
        // this.detailView.style.display = 'block' is inside setTimeout(..., 300) in showDetailView?
        // No.
        /*
        this.detailView.appendChild(heroDiv);
        this.detailView.appendChild(contentDiv);

        // Transition Logic: List Out -> Detail In
        this.locationListContainer.style.opacity = '0';

        setTimeout(() => {
            this.locationListContainer.style.display = 'none';
            this.detailView.style.display = 'block';
            ...
        }, 300);
        */
        // So display:block is DELAYED.

        // I need to use fake timers to test this properly.
        jest.useFakeTimers();
        app.selectLocation('1');
        jest.runAllTimers();

        expect(document.getElementById('detail-view').style.display).toBe('block');
        expect(document.getElementById('location-list-container').style.display).toBe('none');

        jest.useRealTimers();
    });

    test('closeDrawer should reset view', () => {
        jest.useFakeTimers();
        app.init();
        app.selectLocation('1');
        jest.runAllTimers(); // finish open animation

        app.closeDrawer();
        expect(document.getElementById('info-drawer').classList.contains('active')).toBe(false);

        jest.runAllTimers(); // finish close/reset animation

        expect(document.getElementById('detail-view').style.display).toBe('none');
        expect(document.getElementById('location-list-container').style.display).toBe('block');
        jest.useRealTimers();
    });
});
