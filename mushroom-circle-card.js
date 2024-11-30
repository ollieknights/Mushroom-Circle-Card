class MushroomCircleCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getConfigElement() {
    return document.createElement("mushroom-circle-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      icon: "mdi:battery",
      show_ticks: false,
      show_glow: true,
      icon_size: "default",
      icon_custom_size: "24px",
      icon_color: "",
      show_badge: false,
      badge_icon: "mdi:alert",
      badge_color: "rgb(var(--rgb-state-success))",
      badge_condition: "",
      layout: "vertical",
      fill_container: false,
      hide_name: false
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define an entity");
    }
    this.config = {...MushroomCircleCard.getStubConfig(), ...config};
  }

  set hass(hass) {
    if (!this.config || !hass) return;

    if (!this._initialized) {
      this._initialize();
    }

    this._hass = hass;
    this._updateValues();
  }

  _initialize() {
    this._initialized = true;
    this._createCard();
  }

  _createCard() {
    const card = document.createElement('ha-card');
    const content = document.createElement('div');
    content.classList.add('circle-card');
    
    const style = document.createElement('style');
    style.textContent = `
      .circle-card {
        padding: 16px;
        display: flex;
        flex-direction: ${this.config.layout === 'horizontal' ? 'row' : 'column'};
        align-items: center;
        justify-content: center;
        gap: 16px;
      }
      
      .circle-container {
        position: relative;
        width: var(--circle-size, 150px);
        height: var(--circle-size, 150px);
      }
      
      .tick {
        stroke: var(--tick-color, var(--disabled-text-color, #666));
        opacity: 0.3;
      }
      
      .progress-ring {
        transform: rotate(-90deg);
        transition: stroke-dashoffset 0.3s ease;
      }
      
      .icon-container {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: var(--icon-container-size, 42px);
        height: var(--icon-container-size, 42px);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--icon-background-color);
      }
      
      .badge {
        position: absolute;
        top: 4px;
        left: 50%;
        transform: translateX(-50%);
        width: var(--badge-size, 24px);
        height: var(--badge-size, 24px);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--badge-color);
        color: white;
        z-index: 1;
      }
      
      .info {
        display: flex;
        flex-direction: column;
        align-items: ${this.config.layout === 'horizontal' ? 'flex-start' : 'center'};
        gap: 4px;
      }
      
      .name {
        font-size: var(--name-font-size, 14px);
        font-weight: var(--name-font-weight, normal);
        color: var(--primary-text-color);
        opacity: 0.7;
      }
      
      .value {
        font-size: var(--value-font-size, 18px);
        font-weight: var(--value-font-weight, bold);
        color: var(--primary-text-color);
      }
      
      /* Glow filter */
      .glow {
        filter: drop-shadow(0 0 6px var(--glow-color));
      }
    `;
    
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);
    card.appendChild(content);
    
    this._content = content;
  }

  _updateValues() {
    const stateObj = this._hass.states[this.config.entity];
    if (!stateObj) return;

    const value = this._calculateValue(stateObj);
    const color = this._calculateColor(value);

    this._content.innerHTML = this._generateSVG(value, color, stateObj);
  }

  _calculateValue(stateObj) {
    if (stateObj.attributes.duration) {
      const duration = stateObj.attributes.duration;
      const remaining = stateObj.attributes.remaining || 0;
      return (remaining / duration) * 100;
    }

    return parseFloat(stateObj.state) || 0;
  }

  _calculateColor(value) {
    if (this.config.icon_color) return this.config.icon_color;
    
    if (value <= 20) return 'rgb(var(--rgb-state-error))';
    if (value <= 50) return 'rgb(var(--rgb-state-warning))';
    return 'rgb(var(--rgb-state-success))';
  }

  _evaluateCondition(condition, state) {
    try {
      return new Function('state', 'value', `return ${condition}`)(
        state.state,
        parseFloat(state.state)
      );
    } catch (e) {
      return false;
    }
  }

  _generateTicks(radius, size) {
    if (!this.config.show_ticks) return '';

    const ticks = [];
    const tickCount = 60;

    for (let i = 0; i < tickCount; i++) {
      const angle = (i * 360 / tickCount) * (Math.PI / 180);
      const isMainTick = i % 5 === 0;
      const innerRadius = radius - (isMainTick ? 8 : 5);
      
      const x1 = size/2 + innerRadius * Math.cos(angle);
      const y1 = size/2 + innerRadius * Math.sin(angle);
      const x2 = size/2 + radius * Math.cos(angle);
      const y2 = size/2 + radius * Math.sin(angle);
      
      ticks.push(`<line 
        class="tick"
        x1="${x1}"
        y1="${y1}"
        x2="${x2}"
        y2="${y2}"
        stroke-width="${isMainTick ? 2 : 1}"
      />`);
    }

    return ticks.join('');
  }

  _generateSVG(value, color, stateObj) {
    const size = 150;
    const radius = (size / 2) - 20;
    const circumference = 2 * Math.PI * radius;
    const progress = value / 100;
    const strokeDashoffset = circumference * (1 - progress);

    // Calculate end marker position
    const angle = (progress * 360 - 90) * (Math.PI / 180);
    const markerX = size/2 + radius * Math.cos(angle);
    const markerY = size/2 + radius * Math.sin(angle);

    const showBadge = this.config.show_badge && 
      (!this.config.badge_condition || 
       this._evaluateCondition(this.config.badge_condition, stateObj));

    return `
      <div class="circle-container">
        ${showBadge ? `
          <div class="badge" style="--badge-color: ${this.config.badge_color}">
            <ha-icon icon="${this.config.badge_icon}" style="width: 14px; height: 14px;"></ha-icon>
          </div>
        ` : ''}
        
        <svg width="100%" height="100%" viewBox="0 0 ${size} ${size}">
          ${this.config.show_glow ? `
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          ` : ''}
          
          <!-- Background circle -->
          <circle
            cx="${size/2}"
            cy="${size/2}"
            r="${radius}"
            fill="none"
            stroke="var(--disabled-text-color)"
            stroke-width="8"
            opacity="0.2"
          />
          
          ${this._generateTicks(radius, size)}
          
          <!-- Progress circle -->
          <circle
            class="progress-ring ${this.config.show_glow ? 'glow' : ''}"
            cx="${size/2}"
            cy="${size/2}"
            r="${radius}"
            fill="none"
            stroke="${color}"
            stroke-width="8"
            stroke-dasharray="${circumference} ${circumference}"
            stroke-dashoffset="${strokeDashoffset}"
            style="--glow-color: ${color}"
          />
          
          <!-- End marker -->
          <circle 
            cx="${markerX}"
            cy="${markerY}"
            r="6"
            fill="white"
            stroke="${color}"
            stroke-width="2"
            ${this.config.show_glow ? 'class="glow"' : ''}
          />
        </svg>

        <div class="icon-container" style="--icon-background-color: ${color}20">
          <ha-icon
            .icon="${this.config.icon}"
            style="color: ${color}; width: ${this._getIconSize()}; height: ${this._getIconSize()}"
          ></ha-icon>
        </div>
      </div>
      
      <div class="info">
        ${!this.config.hide_name ? `
          <span class="name">
            ${this.config.name || stateObj.attributes.friendly_name || this.config.entity}
          </span>
        ` : ''}
        <span class="value">${Math.round(value)}%</span>
      </div>
    `;
  }

  _getIconSize() {
    switch (this.config.icon_size) {
      case 'small': return '18px';
      case 'large': return '36px';
      case 'custom': return this.config.icon_custom_size || '24px';
      default: return '24px';
    }
  }

  getCardSize() {
    return 3;
  }
}

// Register card
customElements.define('mushroom-circle-card', MushroomCircleCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mushroom-circle-card",
  name: "Mushroom Circle Card",
  description: "A circular progress card with Mushroom styling",
  preview: true
});