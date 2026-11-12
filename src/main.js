import './style.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { locations } from './data.js';
import { WAWondersApp } from './app.js';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
window.L=L;
await import('leaflet.markercluster');
const start=() => {
 const map=L.map('map',{center:[-25.27,122.5],zoom:4,zoomControl:true,zoomAnimation:false,zoomSnap:.5});
 map.zoomControl.setPosition('bottomright');
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
 const app=new WAWondersApp(map,locations,tiles);app.markerLayer=L.markerClusterGroup({animate:false,maxClusterRadius:54,showCoverageOnHover:false,disableClusteringAtZoom:10,iconCreateFunction:c=>L.divIcon({className:'guide-cluster',html:'<span>'+c.getChildCount()+'</span>',iconSize:[44,44],iconAnchor:[22,22]})}).addTo(map);
 const offsetView=(coords,zoom)=>{const mobile=innerWidth<768;const offset=L.point(mobile?0:210,mobile?-innerHeight*.25:0);map.stop();map.setView(map.unproject(map.project(coords,zoom).subtract(offset),zoom),zoom,{animate:false});};
 app.centerPlace=coords=>offsetView(coords,10);app.overview=()=>offsetView([-25.27,122.5],innerWidth<768?3:4.5);app.init();app.overview();
 const status=document.querySelector('#map-status');tiles.on('tileerror',()=>{status.hidden=false;});tiles.on('tileload',()=>{status.hidden=true;});
 document.querySelector('#browse-toggle').onclick=()=>{app.stopAutoTour();app.showListView();app.drawer.classList.add('active');app.overview();};
 document.querySelector('#reset-map').onclick=()=>{app.stopAutoTour();app.overview();};
 document.querySelector('#tour-toggle').onclick=()=>{if(app.isAutoTourActive)app.stopAutoTour();else app.startAutoTour();document.querySelector('#tour-toggle').textContent=app.isAutoTourActive?'Stop tour':'Start tour';};
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();

// Quiet chrome: the country leads; controls visit when called and retire when left.
const initChrome=()=>{
  const PIN_KEY='wawonders-chrome-pin',TOP_ZONE=96,BOTTOM_ZONE=150,RETIRE_MS=2600;
  const els=[document.querySelector('.top-controls'),document.querySelector('.leaflet-control-zoom')].filter(Boolean);
  els.forEach(e=>e.classList.add('chrome','chrome-on'));
  const hint=document.createElement('button');
  hint.className='chrome-hint';hint.hidden=true;hint.setAttribute('aria-label','Show controls');
  hint.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 16 C 7 13, 9.5 13.2, 12 15 C 14.5 16.8, 17 16.4, 20 13.8 M7 12.5 C 7.3 10.5, 9 9, 11.2 9.2 C 12.6 9.3 13.5 10.1 13.8 11.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  document.body.appendChild(hint);
  const pinBtn=document.createElement('button');
  pinBtn.id='pin-controls';pinBtn.type='button';pinBtn.className='control-btn pin-btn';pinBtn.textContent='Pin';pinBtn.title='Keep controls visible';pinBtn.setAttribute('aria-pressed','false');
  const tc=document.querySelector('.top-controls');if(tc)tc.appendChild(pinBtn);
  let pinned=false;try{pinned=localStorage.getItem(PIN_KEY)==='1'}catch{}
  let chrome=true,focusWithin=false,retireTimer=0;
  const apply=()=>{const on=chrome||pinned;els.forEach(e=>e.classList.toggle('chrome-on',on));hint.hidden=on};
  const retireSoon=()=>{clearTimeout(retireTimer);retireTimer=setTimeout(()=>{if(!focusWithin){chrome=false;apply()}},RETIRE_MS)};
  const wake=()=>{chrome=true;apply();retireSoon()};
  document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;if(e.clientY<TOP_ZONE||e.clientY>innerHeight-BOTTOM_ZONE)wake()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.querySelector('#info-drawer.active,#cinematic-title.active'))return;focusWithin=false;chrome=false;apply()}});
  document.addEventListener('focusin',e=>{if(els.some(x=>x.contains(e.target))){focusWithin=true;clearTimeout(retireTimer);chrome=true;apply()}});
  document.addEventListener('focusout',e=>{if(!els.some(x=>x.contains(e.relatedTarget))){focusWithin=false;retireSoon()}});
  hint.addEventListener('click',wake);
  const setPin=next=>{pinned=next;try{next?localStorage.setItem(PIN_KEY,'1'):localStorage.removeItem(PIN_KEY)}catch{}pinBtn.setAttribute('aria-pressed',String(next));pinBtn.textContent=next?'Unpin':'Pin';pinBtn.title=next?'Let controls retire':'Keep controls visible';if(next){chrome=true;apply()}else retireSoon()};
  pinBtn.addEventListener('click',()=>setPin(!pinned));
  if(pinned)setPin(true);
  retireSoon();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initChrome);else initChrome();
