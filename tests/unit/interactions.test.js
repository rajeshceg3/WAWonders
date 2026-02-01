/**
 * @jest-environment jsdom
 */

import { WAWondersApp } from '../../src/app.js';

// Mock Leaflet
const mockMap = {
    on: jest.fn((event, cb) => {
        if (event === 'click') mockMap._clickCb = cb;
    }),
    flyTo: jest.fn(),
    once: jest.fn((event, cb) => cb()),
    zoomControl: { setPosition: jest.fn() }
};

const mockMarker = {
    addTo: jest.fn().mockReturnThis(),
    bindPopup: jest.fn().mockReturnThis(),
    on: jest.fn((event, cb) => {
        mockMarker[`_${event}Cb`] = cb;
    }),
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

describe('WAWondersApp Interactions', () => {
    let app;
    const locations = [
        { id: '1', name: 'Test Loc', coords: [0, 0], description: 'Desc', imageUrl: 'img.jpg' }
    ];

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="info-drawer"></div>
            <ul id="location-list"></ul>
            <div id="location-list-container"></div>
            <div id="detail-view"></div>
            <button id="close-drawer"></button>
        `;
        app = new WAWondersApp(mockMap, locations);
        app.init();
    });

    test('Hovering list item should highlight marker', () => {
        const listItem = document.querySelector('#location-list li');

        // Simulate mouseenter
        const mouseenter = new Event('mouseenter');
        listItem.dispatchEvent(mouseenter);

        expect(mockMarker._icon.classList.add).toHaveBeenCalledWith('highlighted');
        expect(mockMarker.setZIndexOffset).toHaveBeenCalledWith(1000);

        // Simulate mouseleave
        const mouseleave = new Event('mouseleave');
        listItem.dispatchEvent(mouseleave);

        expect(mockMarker._icon.classList.remove).toHaveBeenCalledWith('highlighted');
        expect(mockMarker.setZIndexOffset).toHaveBeenCalledWith(0);
    });

    test('Hovering marker should highlight list item', () => {
        const listItem = document.querySelector('#location-list li');

        // Simulate marker mouseover
        mockMarker._mouseoverCb();
        expect(listItem.classList.contains('highlighted')).toBe(true);

        // Simulate marker mouseout
        mockMarker._mouseoutCb();
        expect(listItem.classList.contains('highlighted')).toBe(false);
    });

    test('Clicking map should close drawer if active', () => {
        const drawer = document.getElementById('info-drawer');
        drawer.classList.add('active');

        jest.useFakeTimers();
        // Simulate map click
        mockMap._clickCb();
        expect(drawer.classList.contains('active')).toBe(false);
        jest.runAllTimers();
        jest.useRealTimers();
    });

    test('Keyboard Enter on list item should trigger selection', () => {
        const listItem = document.querySelector('#location-list li');
        jest.useFakeTimers();

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        listItem.dispatchEvent(event);
        jest.runAllTimers();

        expect(mockMap.flyTo).toHaveBeenCalled();
        jest.useRealTimers();
    });
});
