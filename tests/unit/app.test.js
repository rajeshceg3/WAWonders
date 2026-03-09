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

// Mock Web Audio API
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

describe('WAWondersApp Logic', () => {
    let app;
    const locations = [
        { id: '1', name: 'Test Loc', coords: [0, 0], description: 'Desc', imageUrl: 'img.jpg' }
    ];

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <button id="audio-toggle">
                <svg class="audio-icon-muted"></svg>
                <svg class="audio-icon-unmuted"></svg>
            </button>
            <div id="info-drawer">
                <div class="drawer-header"></div>
                <div class="drawer-handle"></div>
                <div id="views-container">
                    <div id="location-list-container">
                        <ul id="location-list"></ul>
                    </div>
                    <div id="detail-view"></div>
                </div>
                <button id="close-drawer"></button>
            </div>
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

    test('mobile swipe down gesture should close drawer', () => {
        window.innerWidth = 500; // simulate mobile
        app.init();

        const header = document.querySelector('.drawer-header');

        // Setup initial state
        app.drawer.style.transform = '';
        app.drawer.classList.add('active');

        // Simulate dragging down 150px
        const touchStartEvent = new Event('touchstart');
        touchStartEvent.touches = [{ clientY: 100 }];
        header.dispatchEvent(touchStartEvent);

        const touchMoveEvent = new Event('touchmove');
        touchMoveEvent.touches = [{ clientY: 250 }];
        header.dispatchEvent(touchMoveEvent);

        const touchEndEvent = new Event('touchend');
        header.dispatchEvent(touchEndEvent);

        // Verify drawer close was triggered
        expect(app.drawer.classList.contains('active')).toBe(false);
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
