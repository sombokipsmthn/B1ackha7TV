(function (global) {
  'use strict';

  // Locally bundled Unsplash photographs keep the TV experience reliable offline.
  // Source URLs are retained for attribution and future asset refreshes.
  var photos = {
    'night-sky': { src: 'assets/photos/night-sky.jpg', source: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455', focal: '50% 50%', alt: 'Dramatic night sky' },
    'evening-sky': { src: 'assets/photos/evening-sky.jpg', source: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8', focal: '50% 50%', alt: 'Evening light over a quiet landscape' },
    mountains: { src: 'assets/photos/twilight-mountains.jpg', source: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e', focal: '50% 45%', alt: 'Mountain lake at twilight' },
    lake: { src: 'assets/photos/lake-dusk.jpg', source: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470', focal: '50% 55%', alt: 'Still lake surrounded by mountains' },
    forest: { src: 'assets/photos/moody-forest.jpg', source: 'https://images.unsplash.com/photo-1448375240586-882707db888b', focal: '50% 50%', alt: 'Atmospheric forest canopy' },
    desert: { src: 'assets/photos/desert-cinema.jpg', source: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35', focal: '50% 50%', alt: 'Sculpted desert landscape' },
    city: { src: 'assets/photos/nocturnal-city.jpg', source: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390', focal: '50% 50%', alt: 'City skyline at night' },
    architecture: { src: 'assets/photos/quiet-architecture.jpg', source: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2', focal: '50% 50%', alt: 'Minimalist architectural facade' }
  };

  function get(key) { return photos[key] || null; }
  function url(key) { var photo = get(key); return photo ? photo.src : ''; }
  function background(key) { var photo = get(key); return photo ? 'url("' + photo.src + '")' : 'none'; }
  function preload(key, done) {
    var photo = get(key);
    if (!photo) { if (done) { done(false); } return; }
    var image = new Image();
    image.onload = function () { if (done) { done(true, image); } };
    image.onerror = function () { if (done) { done(false); } };
    image.src = photo.src;
  }

  global.PhotoLibrary = { photos: photos, get: get, url: url, background: background, preload: preload };
}(window));
