export class WAWondersApp {
    constructor(mapInstance, locations) {
        this.map = mapInstance;
        this.locations = locations;
        this.markers = {};
        this.isAnimating = false;

        // Bind DOM elements
        this.drawer = document.getElementById('info-drawer');
        this.locationList = document.getElementById('location-list');
        this.locationListContainer = document.getElementById('location-list-container');
        this.detailView = document.getElementById('detail-view');
        this.closeButton = document.getElementById('close-drawer');
    }

    init() {
        // Apply inline styles for transition that we might have missed in CSS
        if (this.locationListContainer) {
            this.locationListContainer.style.transition = 'opacity 0.3s ease';
            this.locationListContainer.style.opacity = '1';
        }

        this.locations.forEach(location => this.addLocation(location));

        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeDrawer();
            });
        }

        if (this.map) {
            this.map.on('click', () => {
                // If drawer is fully active (mobile or desktop), close it
                if (this.drawer && this.drawer.classList.contains('active')) {
                    this.closeDrawer();
                }
            });
        }

        // Initially open drawer
        if (this.drawer) {
            setTimeout(() => this.drawer.classList.add('active'), 500);
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
        this.locationList.appendChild(li);

        const handleSelection = () => this.selectLocation(location.id);

        // Interaction Events
        marker.on('click', handleSelection);
        li.addEventListener('click', handleSelection);

        // Keyboard support
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelection();
            }
        });

        // Bi-directional Highlighting
        // 1. Hover List Item -> Highlight Marker
        li.addEventListener('mouseenter', () => {
            this.setHighlight(location.id, true);
        });
        li.addEventListener('mouseleave', () => {
            this.setHighlight(location.id, false);
        });

        // 2. Hover Marker -> Highlight List Item
        marker.on('mouseover', () => {
            this.setHighlight(location.id, true);
        });
        marker.on('mouseout', () => {
            this.setHighlight(location.id, false);
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

        // Fly to location
        if (this.map) {
            this.map.flyTo(location.coords, 10, {
                animate: true,
                duration: 1.5,
                easeLinearity: 0.25
            });
            this.map.once('moveend', () => {
                this.isAnimating = false;
            });
        } else {
             this.isAnimating = false;
        }

        this.showDetailView(location);
        this.updateActiveStates(id);

        if (this.drawer) {
            this.drawer.classList.add('active');
        }
    }

    showDetailView(location) {
        if (!this.detailView || !this.locationListContainer) return;

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

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'detail-content';

        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.innerHTML = '← Back to list';
        backBtn.onclick = (e) => {
            e.stopPropagation();
            this.showListView();
        };

        const h2 = document.createElement('h2');
        h2.textContent = location.name;

        const p = document.createElement('p');
        p.textContent = location.description;

        contentDiv.appendChild(backBtn);
        contentDiv.appendChild(h2);
        contentDiv.appendChild(p);

        this.detailView.appendChild(heroDiv);
        this.detailView.appendChild(contentDiv);

        // Transition Logic: List Out -> Detail In
        this.locationListContainer.style.opacity = '0';

        setTimeout(() => {
            this.locationListContainer.style.display = 'none';
            this.detailView.style.display = 'block';

            // Force reflow to enable transition
            void this.detailView.offsetWidth;

            this.detailView.classList.add('visible');
        }, 300); // Matches CSS transition time
    }

    showListView() {
        if (!this.detailView || !this.locationListContainer) return;

        // Transition Logic: Detail Out -> List In
        this.detailView.classList.remove('visible');

        setTimeout(() => {
            this.detailView.style.display = 'none';
            this.locationListContainer.style.display = 'block';

            // Force reflow
            void this.locationListContainer.offsetWidth;

            this.locationListContainer.style.opacity = '1';
            this.updateActiveStates(null);
        }, 300);

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
            li.classList.toggle('selected', li.dataset.id === activeId);
        });
    }

    closeDrawer() {
        if (this.drawer) this.drawer.classList.remove('active');
        // Reset to list view when closed, after a delay
        setTimeout(() => {
            this.showListView();
        }, 500);
    }
}
