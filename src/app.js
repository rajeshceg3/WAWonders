export class WAWondersApp {
    constructor(mapInstance, locations) {
        this.map = mapInstance;
        this.locations = locations;
        this.markers = {};
        this.isAnimating = false;

        // Bind DOM elements - assume they exist
        this.drawer = document.getElementById('info-drawer');
        this.locationList = document.getElementById('location-list');
        this.locationListContainer = document.getElementById('location-list-container');
        this.detailView = document.getElementById('detail-view');
        this.closeButton = document.getElementById('close-drawer');
    }

    init() {
        this.locations.forEach(location => this.addLocation(location));

        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeDrawer();
            });
        }

        if (this.map) {
            this.map.on('click', () => {
                if (this.drawer && this.drawer.classList.contains('active')) {
                    this.closeDrawer();
                }
            });
        }

        if (this.drawer) {
            this.drawer.classList.add('active');
        }
    }

    addLocation(location) {
        if (!this.map || !this.locationList) return;

        // We assume L (Leaflet) is globally available or injected via some means,
        // but since we are refactoring existing code which relies on global L,
        // we will use global L here.
        // In a stricter environment, we would import L or pass it as dependency.

        const L = window.L;
        const markerIcon = L.divIcon({ className: 'custom-marker', html: '', iconSize: [20, 20], iconAnchor: [10, 10] });
        const marker = L.marker(location.coords, { icon: markerIcon }).addTo(this.map);
        marker.bindPopup(`<b>${location.name}</b>`);
        this.markers[location.id] = marker;

        const li = document.createElement('li');
        li.textContent = location.name;
        li.dataset.id = location.id;
        li.setAttribute('tabindex', '0');
        this.locationList.appendChild(li);

        const handleSelection = () => this.selectLocation(location.id);
        marker.on('click', handleSelection);
        li.addEventListener('click', handleSelection);
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelection();
            }
        });
    }

    selectLocation(id) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const location = this.locations.find(loc => loc.id === id);
        if (!location) {
            this.isAnimating = false;
            return;
        }

        if (this.map) {
            this.map.flyTo(location.coords, 10, { animate: true, duration: 1.5 });
            this.map.once('moveend', () => {
                this.isAnimating = false;
            });
        } else {
             this.isAnimating = false;
        }

        this.showDetailView(location);
        this.updateActiveStates(id);
        if (this.drawer) this.drawer.classList.add('active');
    }

    showDetailView(location) {
        if (!this.detailView || !this.locationListContainer) return;

        while(this.detailView.firstChild) {
            this.detailView.removeChild(this.detailView.firstChild);
        }

        const img = document.createElement('img');
        img.src = location.imageUrl;
        img.alt = location.name;
        img.loading = 'lazy';
        img.decoding = 'async';

        const h2 = document.createElement('h2');
        h2.textContent = location.name;

        const p = document.createElement('p');
        p.textContent = location.description;

        this.detailView.appendChild(img);
        this.detailView.appendChild(h2);
        this.detailView.appendChild(p);

        this.detailView.style.display = 'block';
        this.locationListContainer.style.display = 'none';
    }

    showListView() {
        if (!this.detailView || !this.locationListContainer) return;

        this.detailView.style.display = 'none';
        this.locationListContainer.style.display = 'block';
        this.updateActiveStates(null);

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
            }
        }
        this.locationList.querySelectorAll('li').forEach(li => {
            li.classList.toggle('selected', li.dataset.id === activeId);
        });
    }

    closeDrawer() {
        if (this.drawer) this.drawer.classList.remove('active');
        this.showListView();
    }
}
