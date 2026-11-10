/**
 * Kipsmthn TV - Continue Watching Card Component
 *
 * A cinematic content card for the Continue Watching section.
 * Displays landscape artwork, title, provider, progress, and episode info.
 */

(function (global) {
  'use strict';

  function ContinueWatchingCard(options) {
    this.content = options.content;
    this.options = Object.assign({}, {
      onFocus: null,
      onSelect: null,
      index: 0,
      total: 0
    }, options || {});
    this.element = this.createElement();
    this.imageLoaded = false;
    this.bindEvents();
    this.loadImage();
  }

  ContinueWatchingCard.prototype.createElement = function () {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'carousel-item continue-card';
    button.setAttribute('role', 'listitem');
    button.setAttribute('data-content-id', this.content.id);
    button.setAttribute('aria-label', this.getAriaLabel());

    // Card background with landscape artwork
    var cardBg = document.createElement('div');
    cardBg.className = 'card-bg';
    cardBg.setAttribute('data-content-id', this.content.id);

    // Overlay gradient for text readability
    var overlay = document.createElement('div');
    overlay.className = 'card-overlay';

    // Content area
    var cardContent = document.createElement('div');
    cardContent.className = 'card-content';

    // Provider logo and title row
    var headerRow = document.createElement('div');
    headerRow.className = 'card-header';

    // Use streaming asset service for provider logo if available
    var providerLogoSrc = this.content.providerLogo;
    if (window.streamingAssetService && this.content.providerId) {
      providerLogoSrc = window.streamingAssetService.getProviderLogoUrl(this.content.providerId);
    } else if (window.contentArtworkService) {
      providerLogoSrc = window.contentArtworkService.getProviderLogoUrl(this.content.providerLogo);
    }

    var providerLogo = document.createElement('img');
    providerLogo.className = 'provider-logo';
    providerLogo.src = providerLogoSrc;
    providerLogo.alt = '';
    providerLogo.loading = 'lazy';
    providerLogo.decoding = 'async';

    var title = document.createElement('h3');
    title.className = 'content-title';
    title.textContent = this.content.title;

    headerRow.appendChild(providerLogo);
    headerRow.appendChild(title);

    // Episode/season info
    var meta = document.createElement('p');
    meta.className = 'content-meta';
    meta.textContent = this.getMetaText();

    // Progress bar
    var progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-valuenow', String(this.content.progress));
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-label', 'Playback progress: ' + this.content.progress + '%');

    var progressFill = document.createElement('div');
    progressFill.className = 'progress-fill progress-' + this.getProgressClass();
    progressFill.style.width = this.content.progress + '%';

    progressBar.appendChild(progressFill);

    // Continue watching indicator
    var continueBadge = document.createElement('span');
    continueBadge.className = 'continue-badge';
    continueBadge.textContent = 'Continue Watching';

    // Remaining time
    var remainingTime = document.createElement('span');
    remainingTime.className = 'remaining-time';
    remainingTime.textContent = this.getRemainingTimeText();

    cardContent.appendChild(headerRow);
    cardContent.appendChild(meta);
    cardContent.appendChild(progressBar);
    cardContent.appendChild(continueBadge);
    cardContent.appendChild(remainingTime);

    button.appendChild(cardBg);
    button.appendChild(overlay);
    button.appendChild(cardContent);

    return button;
  };

  ContinueWatchingCard.prototype.getAriaLabel = function () {
    var content = this.content;
    var providerName = content.providerId.replace('-', ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var label = content.title + ' - Continue ';
    if (content.season && content.episode) {
      label += 'Season ' + content.season + ' Episode ' + content.episode;
    }
    label += ' - ' + content.progress + '% complete - ' + providerName;
    return label;
  };

  ContinueWatchingCard.prototype.getMetaText = function () {
    var content = this.content;
    var parts = [];

    if (content.type === 'series' && content.season && content.episode) {
      parts.push('S' + String(content.season).padStart(2, '0') + ' E' + String(content.episode).padStart(2, '0'));
      if (content.episodeTitle) {
        parts.push('· ' + content.episodeTitle);
      }
    } else if (content.releaseYear) {
      parts.push(String(content.releaseYear));
    }

    // Add provider name
    var providerName = content.providerId
      .split('-')
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
      .join(' ');
    parts.push('· ' + providerName);

    // Add demo indicator
    if (content.isDemo) {
      parts.push('· Demo content');
    }

    return parts.join(' ');
  };

  ContinueWatchingCard.prototype.getProgressClass = function () {
    var progress = this.content.progress;
    if (progress >= 90) return '90';
    if (progress >= 75) return '75';
    if (progress >= 50) return '50';
    if (progress >= 25) return '25';
    return '10';
  };

  ContinueWatchingCard.prototype.getRemainingTimeText = function () {
    var content = this.content;
    var remaining = Math.round(content.duration * (1 - content.progress / 100));
    var hours = Math.floor(remaining / 3600);
    var minutes = Math.floor((remaining % 3600) / 60);

    if (hours > 0) {
      return hours + 'h ' + minutes + 'm remaining';
    }
    return minutes + 'm remaining';
  };

  ContinueWatchingCard.prototype.loadImage = function () {
    var cardBg = this.element.querySelector('.card-bg');
    if (!cardBg) return;

    // Use streaming asset service for landscape still if available
    var landscapeUrl;
    if (window.streamingAssetService && this.content.tmdbId) {
      landscapeUrl = window.streamingAssetService.getLandscapeStillUrl(this.content.id, this.content.tmdbId, this.content.type);
    } else if (window.contentArtworkService) {
      landscapeUrl = window.contentArtworkService.getLandscapeStillUrl(this.content.landscapeStill, this.content.id, this.content.tmdbId, this.content.type);
    } else {
      landscapeUrl = this.content.landscapeStill;
    }

    // Load via content artwork service for caching
    if (window.contentArtworkService) {
      window.contentArtworkService.loadImage(landscapeUrl).then(function () {
        var img = document.createElement('img');
        img.src = landscapeUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.objectPosition = 'center';
        img.onerror = function () {
          img.hidden = true;
          cardBg.setAttribute('data-photo-fallback', 'true');
        };
        cardBg.appendChild(img);
        this.imageLoaded = true;
      }.bind(this)).catch(function (error) {
        console.warn('Failed to load landscape still:', error);
        cardBg.setAttribute('data-photo-fallback', 'true');
      });
    } else {
      // Fallback: direct image load
      var img = document.createElement('img');
      img.src = landscapeUrl;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.objectPosition = 'center';
      img.onerror = function () {
        img.hidden = true;
        cardBg.setAttribute('data-photo-fallback', 'true');
      };
      cardBg.appendChild(img);
      this.imageLoaded = true;
    }
  };

  ContinueWatchingCard.prototype.bindEvents = function () {
    this.element.addEventListener('focus', function () {
      if (this.options.onFocus) this.options.onFocus(this.content);
    }.bind(this));

    this.element.addEventListener('click', function () {
      if (this.options.onSelect) this.options.onSelect(this.content);
    }.bind(this));

    // Keyboard support
    this.element.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.element.click();
      }
    }.bind(this));
  };

  ContinueWatchingCard.prototype.getElement = function () {
    return this.element;
  };

  ContinueWatchingCard.prototype.updateContent = function (content) {
    this.content = content;
    this.element.setAttribute('data-content-id', content.id);
    this.element.setAttribute('aria-label', this.getAriaLabel());

    // Update title
    var title = this.element.querySelector('.content-title');
    if (title) title.textContent = content.title;

    // Update meta
    var meta = this.element.querySelector('.content-meta');
    if (meta) meta.textContent = this.getMetaText();

    // Update progress
    var progressBar = this.element.querySelector('.progress-bar');
    var progressFill = this.element.querySelector('.progress-fill');
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(content.progress));
    if (progressFill) {
      progressFill.className = 'progress-fill progress-' + this.getProgressClass();
      progressFill.style.width = content.progress + '%';
    }

    // Update remaining time
    var remainingTime = this.element.querySelector('.remaining-time');
    if (remainingTime) remainingTime.textContent = this.getRemainingTimeText();

    // Reload image
    var cardBg = this.element.querySelector('.card-bg');
    if (cardBg) {
      cardBg.innerHTML = '';
      cardBg.removeAttribute('data-photo-fallback');
      this.imageLoaded = false;
      this.loadImage();
    }
  };

  ContinueWatchingCard.prototype.setFocused = function (focused) {
    this.element.classList.toggle('focused', focused);
    if (focused) {
      this.element.setAttribute('aria-selected', 'true');
    } else {
      this.element.removeAttribute('aria-selected');
    }
  };

  ContinueWatchingCard.prototype.destroy = function () {
    this.element.remove();
  };

  // Factory function
  function createContinueWatchingCard(options) {
    return new ContinueWatchingCard(options);
  }

  // Export to global scope
  global.ContinueWatchingCard = ContinueWatchingCard;
  global.createContinueWatchingCard = createContinueWatchingCard;
}(window));