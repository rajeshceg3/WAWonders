import './style.css';
import { locations } from './data.js';
import { WAWondersApp } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize map
    const L = window.L; // Assume L is loaded via CDN

    // Start slightly zoomed out for cinematic entrance
    const map = L.map('map', { center: [-25.27, 122.5], zoom: 4, zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
    map.zoomControl.setPosition('bottomright');

    // Initialize app
    const app = new WAWondersApp(map, locations);
    app.init();

    // Cinematic entrance animation
    setTimeout(() => {
        map.flyTo([-25.27, 122.5], 5, {
            animate: true,
            duration: 2.5,
            easeLinearity: 0.1
        });
    }, 100);
});
