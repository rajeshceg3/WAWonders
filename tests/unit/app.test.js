/**
 * @jest-environment jsdom
 */

import { WAWondersApp } from '../../src/app.js';

// Mock Leaflet
const mockMap = {
    on: jest.fn((event, cb) => {
        if (event === 'mousemove') mockMap._mousemoveCb = cb;
    }),
    flyTo: jest.fn(),
    once: jest.fn((event, cb) => cb()), // Immediately trigger callback
    zoomControl: { setPosition: jest.fn() },
    getCenter: jest.fn(() => ({ lat: -25, lng: 122 })),
    removeLayer: jest.fn(),
    hasLayer: jest.fn(() => false)
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
    latLng: jest.fn((coords) => ({ lat: coords[0], lng: coords[1] })),
    polyline: jest.fn(() => ({ addTo: jest.fn() }))
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
            <button id="theme-toggle">
                <svg class="theme-icon-light"></svg>
                <svg class="theme-icon-dark"></svg>
            </button>
            <div id="info-drawer">
                <div class="drawer-header"></div>
                <div class="drawer-handle"></div>
                <div id="views-container">
                    <div id="location-list-container">
                        <input type="text" id="location-search" />
                        <ul id="location-list"></ul>
                    </div>
                    <div id="detail-view"></div>
                </div>
                <button id="close-drawer"></button>
            </div>
            <div id="coordinate-tracker"></div>
        `;

        jest.clearAllMocks();
        app = new WAWondersApp(mockMap, locations);

        // Ensure DOM elements are bound since we added them after the original init tests were written
        app.themeToggleBtn = document.getElementById('theme-toggle');
        app.searchInput = document.getElementById('location-search');
    });

    test('theme toggle click should toggle light and dark modes', () => {
        app.init();
        const themeBtn = document.getElementById('theme-toggle');
        const darkIcon = themeBtn.querySelector('.theme-icon-dark');
        const lightIcon = themeBtn.querySelector('.theme-icon-light');

        // Mock tile layer
        app.tileLayer = { setUrl: jest.fn() };

        // Default is dark mode (assumed without explicit data-theme)
        // Click to toggle to light mode
        themeBtn.click();
        expect(document.body.dataset.theme).toBe('light');
        expect(darkIcon.style.display).toBe('none');
        expect(lightIcon.style.display).toBe('block');
        expect(app.tileLayer.setUrl).toHaveBeenCalledWith(expect.stringContaining('light_all'));

        // Click to toggle back to dark mode
        themeBtn.click();
        expect(document.body.dataset.theme).toBe('dark');
        expect(darkIcon.style.display).toBe('block');
        expect(lightIcon.style.display).toBe('none');
        expect(app.tileLayer.setUrl).toHaveBeenCalledWith(expect.stringContaining('dark_all'));
    });

    test('search input should filter locations', () => {
        // Add multiple locations for search
        const multiLocations = [
            { id: '1', name: 'Desert Oasis', coords: [0, 0] },
            { id: '2', name: 'Coastal Reef', coords: [1, 1] }
        ];
        app = new WAWondersApp(mockMap, multiLocations);
        app.themeToggleBtn = document.getElementById('theme-toggle');
        app.searchInput = document.getElementById('location-search');
        app.init();

        const searchInput = document.getElementById('location-search');
        const listItems = document.querySelectorAll('#location-list li');

        // Initial state: both visible
        expect(listItems[0].style.display).not.toBe('none');
        expect(listItems[1].style.display).not.toBe('none');

        // Type "desert"
        app.filterLocations('desert');
        expect(listItems[0].style.display).toBe('flex'); // matches
        expect(listItems[1].style.display).toBe('none'); // hidden
        expect(mockMap.removeLayer).toHaveBeenCalled();

        // Type "reef"
        app.filterLocations('reef');
        expect(listItems[0].style.display).toBe('none');
        expect(listItems[1].style.display).toBe('flex');
    });

    test('init should populate location list and add markers', () => {
        app.init();

        expect(mockL.marker).toHaveBeenCalledTimes(1);
        const listItems = document.querySelectorAll('#location-list li');
        expect(listItems.length).toBe(1);
        expect(listItems[0].textContent).toContain('Test Loc');
    });

    test('audio toggle click should toggle mute state', () => {
        app.init();
        const toggleBtn = document.getElementById('audio-toggle');
        const mutedIcon = toggleBtn.querySelector('.audio-icon-muted');
        const unmutedIcon = toggleBtn.querySelector('.audio-icon-unmuted');

        // Initial state is muted (from SoundManager constructor)
        // Click to unmute
        toggleBtn.click();
        expect(mutedIcon.style.display).toBe('none');
        expect(unmutedIcon.style.display).toBe('block');
        expect(toggleBtn.classList.contains('active')).toBe(true);

        // Click to mute
        toggleBtn.click();
        expect(mutedIcon.style.display).toBe('block');
        expect(unmutedIcon.style.display).toBe('none');
        expect(toggleBtn.classList.contains('active')).toBe(false);
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

    test('selectLocation should update state, fly map, and render mock weather', () => {
        app.init();
        jest.useFakeTimers();
        app.selectLocation('1');

        expect(mockMap.flyTo).toHaveBeenCalledWith([0, 0], 10, expect.any(Object));

        jest.runAllTimers();

        expect(document.getElementById('detail-view').style.display).toBe('block');
        expect(document.getElementById('location-list-container').style.display).toBe('none');

        // Check for mock weather integration
        const detailHtml = document.getElementById('detail-view').innerHTML;
        // The default biome without specific tags is 'desert' by default based on getBiomeFallback
        expect(detailHtml).toContain('☀️ 35°C');

        jest.useRealTimers();
    });


    test('closeDrawer should reset view', () => {
        jest.useFakeTimers();
        app.init();
        // Stop auto tour to prevent infinite timers
        app.stopAutoTour();
        clearTimeout(app.idleTimeout);

        app.selectLocation('1');
        jest.advanceTimersByTime(2000); // Only advance enough for animations
        window.innerWidth = 1000;

        app.closeDrawer();
        expect(document.getElementById('info-drawer').classList.contains('active')).toBe(false);

        jest.advanceTimersByTime(2000); // Only advance enough for animations

        expect(document.getElementById('detail-view').style.display).toBe('none');
        expect(document.getElementById('location-list-container').style.display).toBe('block');
        jest.useRealTimers();
    });

    test('map mousemove should update coordinate tracker', () => {
        app.init();

        // Trigger map mousemove
        const mockEvent = { latlng: { lat: -25.27, lng: 122.5 } };
        if (mockMap._mousemoveCb) {
             mockMap._mousemoveCb(mockEvent);
        }

        const tracker = document.getElementById('coordinate-tracker');
        expect(tracker.textContent).toBe('LAT: -25.2700 | LNG: 122.5000');
        expect(tracker.classList.contains('active')).toBe(true);
    });

    test('closeButton hover should apply magnetic transform', () => {
        app.init();
        const btn = document.getElementById('close-drawer');

        // Mock getBoundingClientRect
        btn.getBoundingClientRect = jest.fn(() => ({
            left: 100,
            top: 100,
            width: 30,
            height: 30
        }));

        // Simulate mousemove on close button
        const mousemove = new MouseEvent('mousemove', {
            clientX: 120, // (120 - 100 - 15) = 5 * 0.3 = 1.5
            clientY: 110  // (110 - 100 - 15) = -5 * 0.3 = -1.5
        });
        btn.dispatchEvent(mousemove);
        expect(btn.style.transform).toBe('translate(1.5px, -1.5px)');

        // Simulate mouseleave
        const mouseleave = new MouseEvent('mouseleave');
        btn.dispatchEvent(mouseleave);
        expect(btn.style.transform).toBe('');
    });


    test('parallax hover effect should apply properties to hero', () => {
        jest.useFakeTimers();
        app.init();
        app.stopAutoTour();
        clearTimeout(app.idleTimeout);

        app.selectLocation('1');
        jest.advanceTimersByTime(2000);
        window.innerWidth = 1000;


        // The hero is added after selection
        const detailView = document.getElementById('detail-view');
        const hero = detailView.querySelector('.detail-hero');

        // Mock getBoundingClientRect
        hero.getBoundingClientRect = jest.fn(() => ({
            left: 100,
            top: 100,
            width: 200,
            height: 200
        }));

        // Trigger mousemove on detailView
        const mousemove = new MouseEvent('mousemove', {
            clientX: 250, // center + 50 -> +0.5 x
            clientY: 250  // center + 50 -> +0.5 y
        });
        detailView.dispatchEvent(mousemove);

        expect(hero.style.getPropertyValue('--hero-x')).toBe('0.5');
        expect(hero.style.getPropertyValue('--hero-y')).toBe('0.5');

        // Trigger mouseleave
        const mouseleave = new MouseEvent('mouseleave');
        detailView.dispatchEvent(mouseleave);

        expect(hero.style.getPropertyValue('--hero-x')).toBe('0');
        expect(hero.style.getPropertyValue('--hero-y')).toBe('0');
    });

    test('mobile init handles mobile-specific touch logic correctly', () => {
        // Simple test for the handle code
        window.innerWidth = 500;
        app.init();
        const handle = document.querySelector('.drawer-handle');

        const tsEvent = new Event('touchstart');
        tsEvent.touches = [{ clientY: 100 }];
        handle.dispatchEvent(tsEvent);

        const tmEvent = new Event('touchmove');
        tmEvent.touches = [{ clientY: 150 }];
        handle.dispatchEvent(tmEvent);

        // check inline style
        expect(app.drawer.style.transform).toBe('translateY(50px)');

        const teEvent = new Event('touchend');
        handle.dispatchEvent(teEvent);
        // Did not move far enough, so transform cleared, but not closed
        expect(app.drawer.style.transform).toBe('');
    });

    test('drawing flight path and back', () => {
        app.init();
        const start = { lat: 0, lng: 0 };
        const end = { lat: 10, lng: 10 };
        app.drawFlightPath(start, end);
        expect(mockL.polyline).toHaveBeenCalled();

        jest.useFakeTimers();
        app.showListView();
        jest.runAllTimers();
        expect(document.getElementById('detail-view').style.display).toBe('none');
        jest.useRealTimers();
    });

    describe('Auto Tour Logic', () => {
        let originalInnerWidth;

        beforeEach(() => {
            jest.useFakeTimers();
            originalInnerWidth = window.innerWidth;

            // Re-setup DOM for particles
            const particlesOverlay = document.createElement('div');
            particlesOverlay.id = 'particles-overlay';
            document.body.appendChild(particlesOverlay);

            app.init();
            app.stopAutoTour();
            clearTimeout(app.idleTimeout);
        });

        afterEach(() => {
            window.innerWidth = originalInnerWidth;
            app.stopAutoTour(); // Make sure intervals are cleared
            jest.useRealTimers();
            const particlesOverlay = document.getElementById('particles-overlay');
            if (particlesOverlay) particlesOverlay.remove();

            const cinematicTitle = document.getElementById('cinematic-title');
            if (cinematicTitle) cinematicTitle.remove();

            document.body.removeAttribute('data-biome');
        });

        test('setupAutoTour should start tour after 30 seconds of idle time', () => {
            // Provide locations so playNextTourLocation doesn't throw when timer hits
            app.locations = [
                { id: 'loc1', name: 'Reef', coords: [1, 1], description: 'A beautiful coastal reef.' }
            ];

            app.setupAutoTour();
            expect(app.isAutoTourActive).toBe(false);

            // Fast forward 29 seconds
            jest.advanceTimersByTime(29000);
            expect(app.isAutoTourActive).toBe(false);

            // Fast forward 1 more second
            jest.advanceTimersByTime(1000);
            expect(app.isAutoTourActive).toBe(true);
        });

        test('user interactions should reset idle timer', () => {
            // Provide full location objects since the logic depends on description
            app.locations = [
                { id: 'loc1', name: 'Reef', coords: [1, 1], description: 'A beautiful coastal reef.', imageUrl: '' }
            ];

            app.setupAutoTour();

            // Fast forward 15 seconds
            jest.advanceTimersByTime(15000);

            // Simulate mouse move
            window.dispatchEvent(new Event('mousemove'));

            // Fast forward another 20 seconds (total 35)
            jest.advanceTimersByTime(20000);

            // Tour should NOT be active yet because timer was reset
            expect(app.isAutoTourActive).toBe(false);

            // Fast forward another 10 seconds (total 45, 30 since reset)
            jest.advanceTimersByTime(10000);
            expect(app.isAutoTourActive).toBe(true);
        });

        test('startAutoTour should hide UI and show cinematic title', () => {
            app.locations = [
                { id: 'loc1', name: 'Reef', coords: [1, 1], description: 'A beautiful coastal reef.' }
            ];
            app.startAutoTour();

            expect(app.drawer.classList.contains('hidden-for-tour')).toBe(true);
            expect(app.drawer.classList.contains('active')).toBe(false);

            const cinematicTitle = document.getElementById('cinematic-title');
            expect(cinematicTitle).toBeTruthy();
            expect(cinematicTitle.classList.contains('active')).toBe(true);
        });

        test('playNextTourLocation should fly to next location and set biome', () => {
            // Need locations to test this properly
            app.locations = [
                { id: 'loc1', name: 'Reef', coords: [1, 1], description: 'A beautiful coastal reef.' },
                { id: 'loc2', name: 'Desert', coords: [2, 2], description: 'A sandy desert.' }
            ];

            app.isAutoTourActive = true;
            app.playNextTourLocation();

            expect(mockMap.flyTo).toHaveBeenCalledWith([1, 1], 8, expect.any(Object));
            expect(document.body.getAttribute('data-biome')).toBe('coastal');

            // Advance 8 seconds to trigger next location
            jest.advanceTimersByTime(8000);

            expect(mockMap.flyTo).toHaveBeenCalledWith([2, 2], 8, expect.any(Object));
            expect(document.body.getAttribute('data-biome')).toBe('desert');
        });

        test('stopAutoTour should restore UI and clean up intervals', () => {
            app.startAutoTour();
            expect(app.isAutoTourActive).toBe(true);

            app.stopAutoTour();

            expect(app.isAutoTourActive).toBe(false);
            expect(app.drawer.classList.contains('hidden-for-tour')).toBe(false);

            const cinematicTitle = document.getElementById('cinematic-title');
            expect(cinematicTitle.classList.contains('active')).toBe(false);

            expect(document.body.hasAttribute('data-biome')).toBe(false);
        });

        test('updateParticles should create correct number of particles for biomes', () => {
            const particlesOverlay = document.getElementById('particles-overlay');

            app.updateParticles('coastal');
            expect(particlesOverlay.classList.contains('particles-coastal')).toBe(true);
            expect(particlesOverlay.querySelectorAll('.particle').length).toBe(30);

            app.updateParticles('forest');
            expect(particlesOverlay.classList.contains('particles-forest')).toBe(true);
            expect(particlesOverlay.querySelectorAll('.particle').length).toBe(25);

            app.updateParticles('desert');
            expect(particlesOverlay.classList.contains('particles-desert')).toBe(true);
            expect(particlesOverlay.querySelectorAll('.particle').length).toBe(40);

            app.updateParticles(null);
            expect(particlesOverlay.className).toBe('');
            expect(particlesOverlay.querySelectorAll('.particle').length).toBe(0);
        });
    });

});
