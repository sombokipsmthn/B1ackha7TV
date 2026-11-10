/**
 * Kipsmthn TV - Content Card Component
 *
 * A reusable content card for displaying movies/shows in various sections.
 * Supports both portrait (poster) and landscape layouts.
 */

(function (global) {
  'use strict';

  function ContentCard(options) {
    this.content = options.content;
    this.options = Object.assign({}, {
      variant: 'landscape',
      showProgress: true,
      showProvider: true,
      showMeta: true,
      onFocus: null,
      onSelect: null
    }, options || {});
    this.element = this.createElement();
    this.imageLoaded = false;
    this.bindEvents();
    this.loadImage();
  }

  ContentCard.prototype.createElement = function () {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = this.getCardClasses();
    button.setAttribute('role', 'listitem');
    button.setAttribute('data-content-id', this.content.id);
    button.setAttribute('aria-label', this.getAriaLabel());

    // Background image container
    var cardBg = document.createElement('div');
    cardBg.className = 'card-bg';
    cardBg.setAttribute('data-content-id', this.content.id);

    // Overlay gradient
    var overlay = document.createElement('div');
    overlay.className = 'card-overlay';

    // Content area
    var cardContent = document.createElement('div');
    cardContent.className = 'card-content';

    // Header with provider logo
    if (this.options.showProvider) {
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
      cardContent.appendChild(headerRow);
    } else {
      var title = document.createElement('h3');
      title.className = 'content-title';
      title.textContent = this.content.title;
      cardContent.appendChild(title);
    }

    // Meta information
    if (this.options.showMeta) {
      var meta = document.createElement('p');
      meta.className = 'content-meta';
      meta.textContent = this.getMetaText();
      cardContent.appendChild(meta);
    }

    // Progress bar
    if (this.options.showProgress && this.content.type === 'series') {
      var progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-valuenow', String(this.content.progress));
      progressBar.setAttribute('aria-valuemin', '0');
      progressBar.setAttribute('aria-valuemax', '100');

      var progressFill = document.createElement('div');
      progressFill.className = 'progress-fill progress-' + this.getProgressClass();
      progressFill.style.width = this.content.progress + '%';

      progressBar.appendChild(progressFill);
      cardContent.appendChild(progressBar);
    }

    // Badges
    var badges = document.createElement('div');
    badges.className = 'card-badges';

    if (this.content.isDemo) {
      var demoBadge = document.createElement('span');
      demoBadge.className = 'badge demo-badge';
      demoBadge.textContent = 'Demo';
      badges.appendChild(demoBadge);
    }

    if (this.content.type === 'series' && this.content.season && this.content.episode) {
      var episodeBadge = document.createElement('span');
      episodeBadge.className = 'badge episode-badge';
      episodeBadge.textContent = 'S' + String(this.content.season).padStart(2, '0') + ' E' + String(this.content.episode).padStart(2, '0');
      badges.appendChild(episodeBadge);
    }

    if (badges.children.length > 0) {
      cardContent.appendChild(badges);
    }

    button.appendChild(cardBg);
    button.appendChild(overlay);
    button.appendChild(cardContent);

    return button;
  };

  ContentCard.prototype.getCardClasses = function () {
    var baseClasses = 'carousel-item';
    var variantClasses = {
      portrait: 'portrait-card',
      landscape: 'landscape-card continue-card',
      square: 'square-card'
    };
    return baseClasses + ' ' + (variantClasses[this.options.variant] || variantClasses.landscape);
  };

  ContentCard.prototype.getAriaLabel = function () {
    var content = this.content;
    var providerName = content.providerId.replace('-', ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var label = content.title;
    if (content.type === 'series' && content.season && content.episode) {
      label += ', Season ' + content.season + ' Episode ' + content.episode;
    }
    if (content.progress > 0) {
      label += ', ' + content.progress + '% complete';
    }
    label += ', ' + providerName;
    return label;
  };

  ContentCard.prototype.getMetaText = function () {
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

    var providerName = content.providerId
      .split('-')
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
      .join(' ');
    parts.push('· ' + providerName);

    if (content.isDemo) {
      parts.push('· Demo content');
    }

    return parts.join(' ');
  };

  ContentCard.prototype.getProgressClass = function () {
    var progress = this.content.progress;
    if (progress >= 90) return '90';
    if (progress >= 75) return '75';
    if (progress >= 50) return '50';
    if (progress >= 25) return '25';
    return '10';
  };

  ContentCard.prototype.loadImage = function () {
    var cardBg = this.element.querySelector('.card-bg');
    if (!cardBg) return;

    var imageUrl;
    switch (this.options.variant) {
      case 'portrait':
        if (window.streamingAssetService && this.content.tmdbId) {
          imageUrl = window.streamingAssetService.getPosterUrl(this.content.id, this.content.tmdbId, this.content.type);
        } else if (window.contentArtworkService) {
          imageUrl = window.contentArtworkService.getPosterUrl(this.content.poster, this.content.id, this.content.tmdbId, this.content.type);
        } else {
          imageUrl = this.content.poster;
        }
        break;
      case 'landscape':
        if (window.streamingAssetService && this.content.tmdbId) {
          imageUrl = window.streamingAssetService.getLandscapeStillUrl(this.content.id, this.content.tmdbId, this.content.type);
        } else if (window.contentArtworkService) {
          imageUrl = window.contentArtworkService.getLandscapeStillUrl(this.content.landscapeStill, this.content.id, this.content.tmdbId, this.content.type);
        } else {
          imageUrl = this.content.landscapeStill;
        }
        break;
      default:
        if (window.streamingAssetService && this.content.tmdbId) {
          imageUrl = window.streamingAssetService.getLandscapeStillUrl(this.content.id, this.content.tmdbId, this.content.type);
        } else if (window.contentArtworkService) {
          imageUrl = window.contentArtworkService.getLandscapeStillUrl(this.content.landscapeStill, this.content.id, this.content.tmdbId, this.content.type);
        } else {
          imageUrl = this.content.landscapeStill;
        }
    }

    // Load via content artwork service for caching
    if (window.contentArtworkService) {
      window.contentArtworkService.loadImage(imageUrl).then(function () {
        var img = document.createElement('img');
        img.src = imageUrl;
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
        console.warn('Failed to load content image:', error);
        cardBg.setAttribute('data-photo-fallback', 'true');
      });
    } else {
      // Fallback: direct image load
      var img = document.createElement('img');
      img.src = imageUrl;
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

  ContentCard.prototype.bindEvents = function () {
    this.element.addEventListener('focus', function () {
      if (this.options.onFocus) this.options.onFocus(this.content);
    }.bind(this));

    this.element.addEventListener('click', function () {
      if (this.options.onSelect) this.options.onSelect(this.content);
    }.bind(this));

    this.element.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.element.click();
      }
    }.bind(this));
  };

  ContentCard.prototype.getElement = function () {
    return this.element;
  };

  ContentCard.prototype.updateContent = function (content) {
    this.content = content;
    this.element.setAttribute('data-content-id', content.id);
    this.element.setAttribute('aria-label', this.getAriaLabel());

    var title = this.element.querySelector('.content-title');
    if (title) title.textContent = content.title;

    var meta = this.element.querySelector('.content-meta');
    if (meta) meta.textContent = this.getMetaText();

    var progressBar = this.element.querySelector('.progress-bar');
    var progressFill = this.element.querySelector('.progress-fill');
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(content.progress));
    if (progressFill) {
      progressFill.className = 'progress-fill progress-' + this.getProgressClass();
      progressFill.style.width = content.progress + '%';
    }

    // Reload image
    var cardBg = this.element.querySelector('.card-bg');
    if (cardBg) {
      cardBg.innerHTML = '';
      cardBg.removeAttribute('data-photo-fallback');
      this.imageLoaded = false;
      this.loadImage();
    }
  };

  ContentCard.prototype.setFocused = function (focused) {
    this.element.classList.toggle('focused', focused);
    if (focused) {
      this.element.setAttribute('aria-selected', 'true');
    } else {
      this.element.removeAttribute('aria-selected');
    }
  };

  ContentCard.prototype.destroy = function () {
    this.element.remove();
  };

  // Factory function
  function createContentCard(options) {
    return new ContentCard(options);
  }

  // Export to global scope
  global.ContentCard = ContentCard;
  global.createContentCard = createContentCard;
}(window));