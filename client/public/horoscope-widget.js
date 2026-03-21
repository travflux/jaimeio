/**
 * Satire Engine Horoscope Widget
 * Embeddable horoscope widget for white-label clients
 * 
 * Usage:
 * <div id="satire-horoscope-widget"></div>
 * <script src="https://your-domain.com/horoscope-widget.js"></script>
 * <script>
 *   SatireHoroscope.init({
 *     containerId: 'satire-horoscope-widget',
 *     apiUrl: 'https://your-domain.com/api/trpc',
 *     theme: 'light', // 'light' or 'dark'
 *     signs: ['aries', 'taurus', 'gemini'], // optional: show specific signs
 *     displayMode: 'carousel' // 'carousel', 'grid', or 'list'
 *   });
 * </script>
 */

(function(window) {
  'use strict';

  const SatireHoroscope = {
    config: {
      containerId: 'satire-horoscope-widget',
      apiUrl: '',
      theme: 'light',
      signs: null,
      displayMode: 'carousel',
      autoRefresh: false,
      refreshInterval: 3600000, // 1 hour
    },

    state: {
      horoscopes: [],
      currentSignIndex: 0,
      loading: false,
      error: null,
    },

    /**
     * Initialize the widget
     */
    init: function(options) {
      Object.assign(this.config, options);
      
      if (!this.config.apiUrl) {
        console.error('SatireHoroscope: apiUrl is required');
        return;
      }

      this.render();
      this.fetchHoroscopes();

      if (this.config.autoRefresh) {
        setInterval(() => this.fetchHoroscopes(), this.config.refreshInterval);
      }
    },

    /**
     * Fetch horoscopes from API
     */
    fetchHoroscopes: async function() {
      this.state.loading = true;
      this.state.error = null;
      this.updateUI();

      try {
        const params = new URLSearchParams();
        if (this.config.signs && this.config.signs.length > 0) {
          params.append('signs', JSON.stringify(this.config.signs));
        }

        const response = await fetch(
          `${this.config.apiUrl}/horoscopes.widget?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract horoscopes from tRPC response
        if (data.result && data.result.data) {
          this.state.horoscopes = data.result.data;
        } else {
          this.state.horoscopes = [];
        }

        this.state.currentSignIndex = 0;
      } catch (error) {
        this.state.error = error.message || 'Failed to load horoscopes';
        console.error('SatireHoroscope fetch error:', error);
      } finally {
        this.state.loading = false;
        this.updateUI();
      }
    },

    /**
     * Render the widget container
     */
    render: function() {
      const container = document.getElementById(this.config.containerId);
      if (!container) {
        console.error(`SatireHoroscope: container with id "${this.config.containerId}" not found`);
        return;
      }

      const widget = document.createElement('div');
      widget.className = `satire-horoscope-widget satire-theme-${this.config.theme}`;
      widget.innerHTML = `
        <style>
          .satire-horoscope-widget {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }

          .satire-theme-light {
            background: #ffffff;
            color: #1a1a1a;
            border: 1px solid #e5e7eb;
          }

          .satire-theme-dark {
            background: #1f2937;
            color: #f3f4f6;
            border: 1px solid #374151;
          }

          .horoscope-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 2px solid;
            padding-bottom: 12px;
          }

          .satire-theme-light .horoscope-header {
            border-color: #e5e7eb;
          }

          .satire-theme-dark .horoscope-header {
            border-color: #374151;
          }

          .horoscope-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }

          .horoscope-date {
            font-size: 12px;
            opacity: 0.7;
          }

          .horoscope-container {
            min-height: 150px;
          }

          .horoscope-carousel {
            position: relative;
          }

          .horoscope-item {
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 16px;
          }

          .satire-theme-light .horoscope-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
          }

          .satire-theme-dark .horoscope-item {
            background: #111827;
            border: 1px solid #374151;
          }

          .horoscope-sign {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: capitalize;
          }

          .horoscope-content {
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 12px;
          }

          .horoscope-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
          }

          .horoscope-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .horoscope-list .horoscope-item {
            margin-bottom: 0;
          }

          .horoscope-controls {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 16px;
          }

          .horoscope-btn {
            padding: 8px 12px;
            border: 1px solid;
            background: transparent;
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.2s;
          }

          .satire-theme-light .horoscope-btn {
            border-color: #d1d5db;
            color: #374151;
          }

          .satire-theme-light .horoscope-btn:hover {
            background: #f3f4f6;
          }

          .satire-theme-dark .horoscope-btn {
            border-color: #4b5563;
            color: #d1d5db;
          }

          .satire-theme-dark .horoscope-btn:hover {
            background: #374151;
          }

          .horoscope-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .horoscope-loading {
            text-align: center;
            padding: 40px 20px;
            opacity: 0.6;
          }

          .horoscope-error {
            padding: 16px;
            border-radius: 4px;
            font-size: 14px;
          }

          .satire-theme-light .horoscope-error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }

          .satire-theme-dark .horoscope-error {
            background: #7f1d1d;
            color: #fca5a5;
            border: 1px solid #dc2626;
          }

          .horoscope-footer {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid;
            font-size: 11px;
            text-align: center;
            opacity: 0.6;
          }

          .satire-theme-light .horoscope-footer {
            border-color: #e5e7eb;
          }

          .satire-theme-dark .horoscope-footer {
            border-color: #374151;
          }

          .horoscope-footer a {
            color: inherit;
            text-decoration: none;
          }

          .horoscope-footer a:hover {
            text-decoration: underline;
          }
        </style>

        <div class="horoscope-header">
          <h3 class="horoscope-title">✨ Daily Horoscopes</h3>
          <div class="horoscope-date" id="horoscope-date"></div>
        </div>

        <div class="horoscope-container" id="horoscope-content">
          <div class="horoscope-loading">Loading horoscopes...</div>
        </div>

        <div class="horoscope-footer">
          <a href="#" target="_blank" rel="noopener noreferrer">Powered by Satire Engine</a>
        </div>
      `;

      container.appendChild(widget);
    },

    /**
     * Update the UI based on current state
     */
    updateUI: function() {
      const contentContainer = document.getElementById('horoscope-content');
      const dateElement = document.getElementById('horoscope-date');

      if (!contentContainer) return;

      // Update date
      if (dateElement) {
        const today = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        dateElement.textContent = today;
      }

      // Show loading state
      if (this.state.loading && this.state.horoscopes.length === 0) {
        contentContainer.innerHTML = '<div class="horoscope-loading">Loading horoscopes...</div>';
        return;
      }

      // Show error state
      if (this.state.error) {
        contentContainer.innerHTML = `
          <div class="horoscope-error">
            ⚠️ ${this.state.error}
          </div>
        `;
        return;
      }

      // Show empty state
      if (this.state.horoscopes.length === 0) {
        contentContainer.innerHTML = `
          <div class="horoscope-loading">No horoscopes available for today.</div>
        `;
        return;
      }

      // Render based on display mode
      let html = '';

      if (this.config.displayMode === 'carousel') {
        html = this.renderCarousel();
      } else if (this.config.displayMode === 'grid') {
        html = this.renderGrid();
      } else {
        html = this.renderList();
      }

      contentContainer.innerHTML = html;

      // Attach event listeners for carousel controls
      if (this.config.displayMode === 'carousel') {
        const prevBtn = contentContainer.querySelector('.carousel-prev');
        const nextBtn = contentContainer.querySelector('.carousel-next');
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousSign());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextSign());
      }
    },

    /**
     * Render carousel view
     */
    renderCarousel: function() {
      const h = this.state.horoscopes[this.state.currentSignIndex];
      if (!h) return '<div class="horoscope-loading">No horoscopes available</div>';

      return `
        <div class="horoscope-carousel">
          <div class="horoscope-item">
            <div class="horoscope-sign">${h.sign.charAt(0).toUpperCase() + h.sign.slice(1)}</div>
            <div class="horoscope-content">${this.escapeHtml(h.content)}</div>
          </div>
          <div class="horoscope-controls">
            <button class="horoscope-btn carousel-prev" ${this.state.currentSignIndex === 0 ? 'disabled' : ''}>← Previous</button>
            <span style="padding: 8px 12px; font-size: 12px;">
              ${this.state.currentSignIndex + 1} / ${this.state.horoscopes.length}
            </span>
            <button class="horoscope-btn carousel-next" ${this.state.currentSignIndex === this.state.horoscopes.length - 1 ? 'disabled' : ''}>Next →</button>
          </div>
        </div>
      `;
    },

    /**
     * Render grid view
     */
    renderGrid: function() {
      const items = this.state.horoscopes
        .map(h => `
          <div class="horoscope-item">
            <div class="horoscope-sign">${h.sign.charAt(0).toUpperCase() + h.sign.slice(1)}</div>
            <div class="horoscope-content">${this.escapeHtml(h.content)}</div>
          </div>
        `)
        .join('');

      return `<div class="horoscope-grid">${items}</div>`;
    },

    /**
     * Render list view
     */
    renderList: function() {
      const items = this.state.horoscopes
        .map(h => `
          <div class="horoscope-item">
            <div class="horoscope-sign">${h.sign.charAt(0).toUpperCase() + h.sign.slice(1)}</div>
            <div class="horoscope-content">${this.escapeHtml(h.content)}</div>
          </div>
        `)
        .join('');

      return `<div class="horoscope-list">${items}</div>`;
    },

    /**
     * Navigate to next sign in carousel
     */
    nextSign: function() {
      if (this.state.currentSignIndex < this.state.horoscopes.length - 1) {
        this.state.currentSignIndex++;
        this.updateUI();
      }
    },

    /**
     * Navigate to previous sign in carousel
     */
    previousSign: function() {
      if (this.state.currentSignIndex > 0) {
        this.state.currentSignIndex--;
        this.updateUI();
      }
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml: function(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return text.replace(/[&<>"']/g, m => map[m]);
    },
  };

  // Expose to window
  window.SatireHoroscope = SatireHoroscope;

})(window);
