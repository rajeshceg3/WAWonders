import { SoundManager } from './audio.js';

export class WAWondersApp {
    constructor(mapInstance, locations, tileLayer) {
        this.map = mapInstance;
        this.locations = locations;
        this.tileLayer = tileLayer;
        this.markers = {};
        this.isAnimating = false;
        this.soundManager = new SoundManager();
        this.currentFlightPath = null;

        // Bind DOM elements
        this.drawer = document.getElementById('info-drawer');
        this.locationList = document.getElementById('location-list');
        this.locationListContainer = document.getElementById('location-list-container');
        this.detailView = document.getElementById('detail-view');
        this.closeButton = document.getElementById('close-drawer');
        this.audioToggleBtn = document.getElementById('audio-toggle');
        this.coordTracker = document.getElementById('coordinate-tracker');
        this.searchInput = document.getElementById('location-search');
        this.themeToggleBtn = document.getElementById('theme-toggle');

        this.parallaxMoveHandler = null;
        this.parallaxLeaveHandler = null;
        this.flightPathTimeoutId = null;
    }

    init() {
        this.locations.forEach(location => this.addLocation(location));

        // Initialize sound manager on first user interaction
        const initAudio = () => {
            this.soundManager.init();
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };
        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);

        if (this.audioToggleBtn) {
            this.audioToggleBtn.addEventListener('click', () => {
                const isMuted = this.soundManager.toggleMute();
                this.soundManager.playClickSound(); // Play sound if we just unmuted

                const mutedIcon = this.audioToggleBtn.querySelector('.audio-icon-muted');
                const unmutedIcon = this.audioToggleBtn.querySelector('.audio-icon-unmuted');

                if (isMuted) {
                    mutedIcon.style.display = 'block';
                    unmutedIcon.style.display = 'none';
                    this.audioToggleBtn.classList.remove('active');
                } else {
                    mutedIcon.style.display = 'none';
                    unmutedIcon.style.display = 'block';
                    this.audioToggleBtn.classList.add('active');
                }
            });
            this.audioToggleBtn.addEventListener('mouseenter', () => this.soundManager.playHoverSound());
        }

        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => {
                const isLight = document.body.dataset.theme === 'light';
                const darkIcon = this.themeToggleBtn.querySelector('.theme-icon-dark');
                const lightIcon = this.themeToggleBtn.querySelector('.theme-icon-light');

                if (isLight) {
                    document.body.dataset.theme = 'dark';
                    darkIcon.style.display = 'block';
                    lightIcon.style.display = 'none';
                    if (this.tileLayer) {
                        this.tileLayer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
                    }
                } else {
                    document.body.dataset.theme = 'light';
                    darkIcon.style.display = 'none';
                    lightIcon.style.display = 'block';
                    if (this.tileLayer) {
                        this.tileLayer.setUrl('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
                    }
                }
                this.soundManager.playClickSound();
            });
            this.themeToggleBtn.addEventListener('mouseenter', () => this.soundManager.playHoverSound());
        }

        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.soundManager.playClickSound();
                this.closeDrawer();
            });
            this.closeButton.addEventListener('mouseenter', () => this.soundManager.playHoverSound());

            // Magnetic micro-interaction
            this.closeButton.addEventListener('mousemove', (e) => {
                const rect = this.closeButton.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                this.closeButton.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
            });

            this.closeButton.addEventListener('mouseleave', () => {
                this.closeButton.style.transform = '';
            });
        }

        if (this.map) {
            this.map.on('click', () => {
                // If drawer is fully active (mobile or desktop), close it
                if (this.drawer && this.drawer.classList.contains('active')) {
                    this.closeDrawer();
                }
            });

            this.map.on('mousemove', (e) => {
                if (this.coordTracker) {
                    const lat = e.latlng.lat.toFixed(4);
                    const lng = e.latlng.lng.toFixed(4);
                    this.coordTracker.textContent = `LAT: ${lat} | LNG: ${lng}`;
                    if (!this.coordTracker.classList.contains('active')) {
                        this.coordTracker.classList.add('active');
                    }
                }
            });
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filterLocations(e.target.value);
            });
        }

        // Initially open drawer
        if (this.drawer) {
            setTimeout(() => this.drawer.classList.add('active'), 500);

            // Mouse tracking for CSS spotlight effect
            this.drawer.addEventListener('mousemove', (e) => {
                const rect = this.drawer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.drawer.style.setProperty('--mouse-x', `${x}px`);
                this.drawer.style.setProperty('--mouse-y', `${y}px`);
            });

            // Mobile Swipe-down to Close Gestures
            this.initMobileGestures();
        }
    }

    initMobileGestures() {
        if (!this.drawer) return;

        const header = this.drawer.querySelector('.drawer-header');
        const handle = this.drawer.querySelector('.drawer-handle');

        if (!header && !handle) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const onTouchStart = (e) => {
            if (window.innerWidth > 768) return; // Only apply on mobile
            startY = e.touches[0].clientY;
            isDragging = true;
            this.drawer.style.transition = 'none'; // Disable transition for 1:1 finger tracking
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            // Only allow dragging downwards
            if (deltaY > 0) {
                e.preventDefault(); // Prevent scrolling the content
                this.drawer.style.transform = `translateY(${deltaY}px)`;
            }
        };

        const onTouchEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;

            this.drawer.style.transition = ''; // Restore CSS transition

            const deltaY = currentY - startY;
            // If dragged down by more than 100px or fast swipe, close it
            if (deltaY > 100) {
                this.drawer.style.transform = ''; // Clear inline transform
                this.closeDrawer();
            } else {
                // Snap back up
                this.drawer.style.transform = '';
            }
        };

        // Attach events to handle or header for drag
        if (handle) {
            handle.addEventListener('touchstart', onTouchStart, { passive: true });
            handle.addEventListener('touchmove', onTouchMove, { passive: false });
            handle.addEventListener('touchend', onTouchEnd);
        }

        if (header) {
            header.addEventListener('touchstart', onTouchStart, { passive: true });
            header.addEventListener('touchmove', onTouchMove, { passive: false });
            header.addEventListener('touchend', onTouchEnd);
        }
    }

    addLocation(location) {
        if (!this.map || !this.locationList) return;

        const L = window.L;
        // Use a divIcon that we can style with CSS classes
        const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const marker = L.marker(location.coords, { icon: markerIcon }).addTo(this.map);

        // Custom popup content
        const popupContent = `<div style="text-align:center;">${location.name}</div>`;
        marker.bindPopup(popupContent, {
            closeButton: false,
            className: 'glass-popup'
        });

        this.markers[location.id] = marker;

        const li = document.createElement('li');
        // Add an arrow icon for affordance
        li.innerHTML = `<span>${location.name}</span> <span style="opacity:0.5">→</span>`;
        li.dataset.id = location.id;
        li.setAttribute('tabindex', '0');

        // Staggered entrance animation delay based on index
        const index = this.locationList.children.length;
        li.style.animationDelay = `${0.1 + (index * 0.05)}s`;

        this.locationList.appendChild(li);

        const handleSelection = () => {
            if (navigator.vibrate) navigator.vibrate([10]);
            this.soundManager.playClickSound();
            this.selectLocation(location.id);
        };

        // Interaction Events
        marker.on('click', handleSelection);
        li.addEventListener('click', handleSelection);

        // Keyboard support
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelection();
            }
        });        // Bi-directional Highlighting
        // 1. Hover List Item -> Highlight Marker
        li.addEventListener('mouseenter', () => {
            this.soundManager.playHoverSound();
            this.setHighlight(location.id, true);
        });
        li.addEventListener('mousemove', (e) => {
            const rect = li.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            // Max rotation is 5deg
            const maxRotate = 5;
            const rotateX = (y / (rect.height / 2)) * -maxRotate;
            const rotateY = (x / (rect.width / 2)) * maxRotate;

            li.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });
        li.addEventListener('mouseleave', () => {
            li.style.transform = '';
            this.setHighlight(location.id, false);
        });

        // 2. Hover Marker -> Highlight List Item
        marker.on('mouseover', () => {
            this.soundManager.playHoverSound();
            this.setHighlight(location.id, true);
        });
        marker.on('mouseout', () => {
            this.setHighlight(location.id, false);
        });
    }

    filterLocations(query) {
        const lowerQuery = query.toLowerCase();
        const listItems = Array.from(this.locationList.children);

        listItems.forEach(li => {
            const locationName = li.querySelector('span').textContent.toLowerCase();
            if (locationName.includes(lowerQuery)) {
                li.style.display = 'flex';
                // Show marker
                const id = li.dataset.id;
                if (this.markers[id] && this.map) {
                    if (!this.map.hasLayer(this.markers[id])) {
                        this.markers[id].addTo(this.map);
                    }
                }
            } else {
                li.style.display = 'none';
                // Hide marker
                const id = li.dataset.id;
                if (this.markers[id] && this.map) {
                    this.map.removeLayer(this.markers[id]);
                }
            }
        });
    }

    setHighlight(id, isHighlighted) {
        // Highlight Marker
        const marker = this.markers[id];
        if (marker && marker._icon) {
            if (isHighlighted) {
                marker._icon.classList.add('highlighted');
                // Bring to front
                marker.setZIndexOffset(1000);
            } else {
                marker._icon.classList.remove('highlighted');
                marker.setZIndexOffset(0);
            }
        }

        // Highlight List Item
        const li = this.locationList.querySelector(`li[data-id="${id}"]`);
        if (li) {
            if (isHighlighted) {
                li.classList.add('highlighted');
                // Optional: scroll into view if needed, but might be annoying on hover
            } else {
                li.classList.remove('highlighted');
            }
        }
    }

    selectLocation(id) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const location = this.locations.find(loc => loc.id === id);
        if (!location) {
            this.isAnimating = false;
            return;
        }

        // Play whoosh sound for transition
        this.soundManager.playFlySound();

        // Fly to location and draw flight path
        if (this.map) {
            const startLatLng = this.map.getCenter();
            const endLatLng = L.latLng(location.coords);

            this.drawFlightPath(startLatLng, endLatLng);

            this.map.flyTo(location.coords, 10, {
                animate: true,
                duration: 1.5,
                easeLinearity: 0.25
            });
            this.map.once('moveend', () => {
                this.isAnimating = false;
                if (this.currentFlightPath) {
                    // Fade out
                    if (this.currentFlightPath._path) {
                        this.currentFlightPath._path.style.opacity = '0';
                    }
                    const pathToRemove = this.currentFlightPath;
                    this.flightPathTimeoutId = setTimeout(() => {
                        if (pathToRemove && this.map) {
                            this.map.removeLayer(pathToRemove);
                            if (this.currentFlightPath === pathToRemove) {
                                this.currentFlightPath = null;
                            }
                        }
                    }, 500);
                }
            });
        } else {
             this.isAnimating = false;
        }

        // Determine biome based on location (simple heuristic based on keywords)
        let biome = 'desert'; // default
        const desc = location.description.toLowerCase();
        if (desc.includes('reef') || desc.includes('beach') || desc.includes('ocean') || desc.includes('water') || desc.includes('bay')) {
            biome = 'coastal';
        } else if (desc.includes('forest') || desc.includes('park') || desc.includes('tree')) {
            biome = 'forest';
        }
        this.soundManager.setBiome(biome);

        this.showDetailView(location, biome);
        document.body.setAttribute('data-biome', biome);
        this.updateActiveStates(id);

        if (this.drawer) {
            this.drawer.classList.add('active');
        }
    }

    showDetailView(location, biome) {
        if (!this.detailView || !this.locationListContainer) return;

        // Set the biome attribute for CSS styling
        if (biome) {
            this.detailView.setAttribute('data-biome', biome);
        }

        // Clear previous content
        while(this.detailView.firstChild) {
            this.detailView.removeChild(this.detailView.firstChild);
        }

        // Build Detail View DOM
        // Hero
        const heroDiv = document.createElement('div');
        heroDiv.className = 'detail-hero';

        const img = document.createElement('img');
        img.src = location.imageUrl;
        img.alt = location.name;
        img.loading = 'lazy';
        heroDiv.appendChild(img);

        // Particles
        const particlesDiv = document.createElement('div');
        particlesDiv.className = 'biome-particles';
        heroDiv.appendChild(particlesDiv);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'detail-content';

        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.innerHTML = '← Back to list';
        backBtn.onclick = (e) => {
            e.stopPropagation();
            this.soundManager.playClickSound();
            this.showListView();
        };
        backBtn.onmouseenter = () => this.soundManager.playHoverSound();

        const h2 = document.createElement('h2');
        h2.textContent = location.name;

        const metaDiv = document.createElement('div');
        metaDiv.className = 'detail-meta';
        const formattedLat = location.coords[0].toFixed(4);
        const formattedLng = location.coords[1].toFixed(4);

        let weatherStr = '☁️ 22°C';
        if (biome === 'desert') weatherStr = '☀️ 35°C';
        else if (biome === 'coastal') weatherStr = '🌬️ 24°C';
        else if (biome === 'forest') weatherStr = '🌦️ 18°C';

        metaDiv.innerHTML = `<span class="biome-tag">${biome.toUpperCase()}</span><span class="detail-weather">${weatherStr}</span><span class="detail-coords">${formattedLat}, ${formattedLng}</span>`;

        const p = document.createElement('p');
        p.textContent = location.description;

        contentDiv.appendChild(backBtn);
        contentDiv.appendChild(h2);
        contentDiv.appendChild(metaDiv);
        contentDiv.appendChild(p);

        this.detailView.appendChild(heroDiv);
        this.detailView.appendChild(contentDiv);

        // Cleanup previous handlers if any
        if (this.parallaxMoveHandler) {
            this.detailView.removeEventListener('mousemove', this.parallaxMoveHandler);
        }
        if (this.parallaxLeaveHandler) {
            this.detailView.removeEventListener('mouseleave', this.parallaxLeaveHandler);
        }

        // Add mousemove for hero parallax effect
        this.parallaxMoveHandler = (e) => {
            if (window.innerWidth <= 768) return; // Disable on mobile
            const rect = heroDiv.getBoundingClientRect();
            // Calculate mouse position relative to center of the image, normalized between -1 and 1
            const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
            const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

            heroDiv.style.setProperty('--hero-x', `${x}`);
            heroDiv.style.setProperty('--hero-y', `${y}`);
        };
        this.parallaxLeaveHandler = () => {
            heroDiv.style.setProperty('--hero-x', `0`);
            heroDiv.style.setProperty('--hero-y', `0`);
        };

        this.detailView.addEventListener('mousemove', this.parallaxMoveHandler);
        this.detailView.addEventListener('mouseleave', this.parallaxLeaveHandler);

        // Transition Logic: List Out -> Detail In
        // Show detail view behind the scene but ready to slide in
        this.detailView.style.display = 'block';

        // Force reflow to enable transition
        void this.detailView.offsetWidth;

        // Trigger slide animations
        this.locationListContainer.classList.add('slide-out-left');
        this.detailView.classList.add('visible');

        setTimeout(() => {
            // Once transition finishes, hide list for performance
            this.locationListContainer.style.display = 'none';
        }, 400); // Matches CSS transition time
    }

    showListView() {
        if (!this.detailView || !this.locationListContainer) return;

        // Transition Logic: Detail Out -> List In

        // Ensure list is display block again before sliding back
        this.locationListContainer.style.display = 'block';

        // Force reflow
        void this.locationListContainer.offsetWidth;

        // Remove slide classes to trigger return animations
        this.detailView.classList.remove('visible');
        document.body.removeAttribute('data-biome');
        this.locationListContainer.classList.remove('slide-out-left');

        setTimeout(() => {
            // Once transition finishes, hide detail
            this.detailView.style.display = 'none';
            this.updateActiveStates(null);
        }, 400); // Matches CSS transition time

        if (this.isAnimating) return;
        this.isAnimating = true;

        if (this.map) {
            this.map.flyTo([-25.27, 122.5], 5, { animate: true, duration: 1.5 });
            this.map.once('moveend', () => {
                this.isAnimating = false;
            });
        } else {
            this.isAnimating = false;
        }
    }

    updateActiveStates(activeId) {
        if (!this.locationList) return;

        for (const id in this.markers) {
            if (this.markers[id]._icon) {
                 this.markers[id]._icon.classList.toggle('active', id === activeId);
                 // Reset z-index if not active
                 if (id !== activeId) {
                     this.markers[id].setZIndexOffset(0);
                 } else {
                     this.markers[id].setZIndexOffset(1000);
                 }
            }
        }
        this.locationList.querySelectorAll('li').forEach(li => {
            const isSelected = li.dataset.id === activeId;
            li.classList.toggle('selected', isSelected);
            if (isSelected && typeof li.scrollIntoView === 'function') {
                // Smoothly scroll the selected item into view if not visible
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    drawFlightPath(start, end) {
        if (!this.map || !window.L) return;

        if (this.currentFlightPath) {
            this.map.removeLayer(this.currentFlightPath);
        }

        // Simple midpoint calculation for bezier curve
        const latLngs = [];
        const numPoints = 100;

        // Calculate a control point to create an arc
        // Offset perpendicular to the line connecting start and end
        const dx = end.lng - start.lng;
        const dy = end.lat - start.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return; // Handle exact same coordinates case

        // Offset factor (adjust for arc height)
        const offset = dist * 0.2;

        const midX = (start.lng + end.lng) / 2 - dy * (offset / dist);
        const midY = (start.lat + end.lat) / 2 + dx * (offset / dist);

        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * midY + t * t * end.lat;
            const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * midX + t * t * end.lng;
            latLngs.push([lat, lng]);
        }

        this.currentFlightPath = L.polyline(latLngs, {
            color: '#38bdf8', // var(--color-primary)
            weight: 2,
            opacity: 0, // Starts at 0, faded in via JS/CSS class
            className: 'flight-path',
            interactive: false
        }).addTo(this.map);

        // Force reflow and fade in
        setTimeout(() => {
             if (this.currentFlightPath && this.currentFlightPath._path) {
                 this.currentFlightPath._path.style.opacity = '0.6';
             }
        }, 50);
    }

    closeDrawer() {
        if (this.drawer) this.drawer.classList.remove('active');

        this.soundManager.stopAmbience();

        // Reset to list view when closed, after a delay
        setTimeout(() => {
            this.showListView();
        }, 500);
    }
}
