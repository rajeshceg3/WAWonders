/**
 * @jest-environment jsdom
 */

import { WAWondersApp } from '../../src/app.js';

// Reuse the mock, but focuses on DOM interaction
const mockMap = {
    on: jest.fn(),
    flyTo: jest.fn(),
    once: jest.fn((event, cb) => cb()),
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

// Mock Web Audio API for tests
window.AudioContext = jest.fn().mockImplementation(() => ({
    createGain: jest.fn(() => ({
        connect: jest.fn(),
        gain: { value: 0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), cancelScheduledValues: jest.fn(), setTargetAtTime: jest.fn() }
    })),
    createOscillator: jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        type: '',
        frequency: { value: 0, setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() }
    })),
    createBuffer: jest.fn(() => ({
        getChannelData: jest.fn(() => new Float32Array(100))
    })),
    createBufferSource: jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        disconnect: jest.fn(),
        buffer: null,
        loop: false
    })),
    createBiquadFilter: jest.fn(() => ({
        connect: jest.fn(),
        type: '',
        frequency: { value: 0 },
        Q: { value: 0 }
    })),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: jest.fn()
}));

// Mock Navigator
Object.defineProperty(global.navigator, 'vibrate', {
    value: jest.fn(),
    configurable: true
});

describe('DOM Integration', () => {
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

    test('Clicking a list item should trigger selectLocation', () => {
        const listItem = document.querySelector('#location-list li');

        jest.useFakeTimers();
        listItem.click();
        jest.runAllTimers();

        // Check side effects of selectLocation
        expect(mockMap.flyTo).toHaveBeenCalled();
        expect(document.getElementById('detail-view').innerHTML).toContain('Test Loc');
        expect(document.getElementById('detail-view').querySelector('img').src).toContain('img.jpg');

        jest.useRealTimers();
    });

    test('Clicking close button should close drawer', () => {
        const closeBtn = document.getElementById('close-drawer');
        const drawer = document.getElementById('info-drawer');

        // Simulate open state
        drawer.classList.add('active');

        jest.useFakeTimers();
        closeBtn.click();

        // closeDrawer removes active class immediately
        expect(drawer.classList.contains('active')).toBe(false);

        jest.runAllTimers();
        jest.useRealTimers();
    });
});
