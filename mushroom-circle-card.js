import { html, LitElement, css } from "https://unpkg.com/lit@2.0.0/index.js";
import { styleMap } from "https://unpkg.com/lit@2.0.0/directives/style-map.js";

class MushroomCircleCard extends LitElement {
  static getStubConfig() {
    return {
      type: "custom:mushroom-circle-card",
      entity: "sensor.example",
      name: "Circle Card",
      icon: "mdi:circle",
      show_ticks: false,
      show_glow: true,
      direction: "counter-clockwise",
      icon_size: "default",
      icon_custom_size: "24px",
      icon_color: "",
      show_badge: false,
      badge_icon: "mdi:alert",
      badge_color: "rgb(var(--rgb-state-success))",
      badge_condition: "",
      layout: "vertical",
      fill_container: false,
      hide_name: false,
      size: 150
    };
  }

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  static get styles() {
    return css`
      ha-card {
        height: 100%;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-sizing: border-box;
        justify-content: center;
      }

      .container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .container.horizontal {
        flex-direction: row;
        justify-content: space-evenly;
      }

      .circle-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .info {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 1rem;
      }

      .horizontal .info {
        margin-top: 0;
        margin-left: 1rem;
        align-items: flex-start;
      }

      .name {
        font-size: var(--material-small-font-size, 14px);
        font-weight: var(--material-font-weight-regular, 400);
        color: var(--primary-text-color);
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
        text-align: center;
      }

      .state {
        font-size: var(--material-body-font-size, 16px);
        font-weight: var(--material-font-weight-bold, 700);
        color: var(--primary-text-color);
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
        text-align: center;
      }

      .badge {
        position: absolute;
        top: 4px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--badge-color, rgb(var(--rgb-state-success)));
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        z-index: 1;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .icon-container {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        padding: 12px;
        background-color: var(--icon-background-color, rgba(var(--rgb-state-entity, 54, 95, 140), 0.05));
      }

      .error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--primary-text-color);
        opacity: 0.8;
      }
    `;
  }

  render() {
    if (!this.hass || !this.config) {
      return this._renderError("No configuration");
    }

    if (!this.config.entity) {
      return this._renderError("Entity not defined");
    }

    const stateObj = this.hass.states[this.config.entity];
    if (!stateObj) {
      return this._renderPlaceholder();
    }

    const value = this._computeValue(stateObj);
    const name = this._computeName(stateObj);
    const showBadge = this._computeShowBadge(stateObj);

    return html`
      <ha-card>
        <div class="container ${this.config.layout === "horizontal" ? "horizontal" : ""}">
          <div class="circle-container" style=${this._computeCircleContainerStyle()}>
            ${showBadge ? this._renderBadge() : ""}
            ${this._renderSvg(value)}
            ${this._renderIcon(value)}
          </div>
          <div class="info">
            ${!this.config.hide_name ? html`<div class="name">${name}</div>` : ""}
            <div class="state">
              ${value}${this._getUnitOfMeasurement(stateObj)}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderError(message) {
    return html`
      <ha-card>
        <div class="error">
          <ha-icon icon="mdi:alert" style="color: var(--error-color);"></ha-icon>
          <span>${message}</span>
        </div>
      </ha-card>
    `;
  }

  _renderPlaceholder() {
    return html`
      <ha-card>
        <div class="container ${this.config.layout === "horizontal" ? "horizontal" : ""}">
          <div class="circle-container" style=${this._computeCircleContainerStyle()}>
            ${this._renderSvg(0)}
            <div class="icon-container">
              <ha-icon
                .icon=${this.config.icon || "mdi:help-circle"}
                style="
                  width: ${this._computeIconSize()};
                  height: ${this._computeIconSize()};
                  color: var(--disabled-text-color);
                "
              ></ha-icon>
            </div>
          </div>
          <div class="info">
            <div class="name">${this.config.name || this.config.entity}</div>
            <div class="state">Not found</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSvg(value) {
    const size = this.config.size || 150;
    const radius = (size / 2) - 20;
    const circumference = 2 * Math.PI * radius;
    const progress = value / 100;
    const isClockwise = this.config.direction === "clockwise";
    
    const strokeDashoffset = isClockwise 
      ? circumference * (1 - progress)
      : circumference * progress;
    
    const rotateAngle = isClockwise ? 90 : -90;
    const scaleY = isClockwise ? -1 : 1;
    
    const angle = isClockwise 
      ? (-progress * 360 + 90) 
      : (progress * 360 - 90);
    const markerX = size/2 + radius * Math.cos(angle * Math.PI / 180);
    const markerY = size/2 + radius * Math.sin(angle * Math.PI / 180);

    return html`
      <svg width="${size}" height="${size}">
        ${this.config.show_glow ? this._renderGlowFilter() : ""}

        <circle
          cx="${size/2}"
          cy="${size/2}"
          r="${radius}"
          fill="none"
          stroke="var(--disabled-text-color)"
          stroke-width="8"
          opacity="0.2"
        />

        ${this.config.show_ticks ? this._generateTicks(radius, size) : ""}

        <circle
          cx="${size/2}"
          cy="${size/2}"
          r="${radius}"
          fill="none"
          stroke="${this._computeColor(value)}"
          stroke-width="8"
          stroke-linecap="round"
          stroke-dasharray="${circumference} ${circumference}"
          stroke-dashoffset="${strokeDashoffset}"
          transform="
            rotate(${rotateAngle} ${size/2} ${size/2}) 
            scale(1 ${scaleY})
          "
          style="${this.config.show_glow ? "filter: url(#glow)" : ""}"
        />

        <circle 
          cx="${markerX}"
          cy="${markerY}"
          r="6"
          fill="white"
          stroke="${this._computeColor(value)}"
          stroke-width="2"
          ${this.config.show_glow ? 'style="filter: url(#glow)"' : ""}
        />
      </svg>
    `;
  }

  _renderGlowFilter() {
    return html`
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    `;
  }

  _renderBadge() {
    return html`
      <div class="badge" style="--badge-color: ${this.config.badge_color}">
        <ha-icon .icon=${this.config.badge_icon} style="width: 14px; height: 14px;"></ha-icon>
      </div>
    `;
  }

  _renderIcon(value) {
    const color = this._computeColor(value);
    return html`
      <div class="icon-container">
        <ha-icon
          .icon=${this.config.icon}
          style="
            width: ${this._computeIconSize()};
            height: ${this._computeIconSize()};
            color: ${color};
          "
        ></ha-icon>
      </div>
    `;
  }

  _generateTicks(radius, size) {
    const tickCount = 60;
    const ticks = [];
    
    for (let i = 0; i < tickCount; i++) {
      const angle = i * (360 / tickCount) * (Math.PI / 180);
      const isMainTick = i % 5 === 0;
      const innerRadius = radius - (isMainTick ? 8 : 5);
      const x1 = size/2 + innerRadius * Math.cos(angle);
      const y1 = size/2 + innerRadius * Math.sin(angle);
      const x2 = size/2 + radius * Math.cos(angle);
      const y2 = size/2 + radius * Math.sin(angle);

      ticks.push(html`
        <line
          x1="${x1}"
          y1="${y1}"
          x2="${x2}"
          y2="${y2}"
          stroke="var(--disabled-text-color)"
          stroke-width="${isMainTick ? 2 : 1}"
          opacity="0.3"
        />
      `);
    }
    
    return ticks;
  }

  _computeValue(stateObj) {
    try {
      if (stateObj.attributes?.duration) {
        const duration = stateObj.attributes.duration;
        const remaining = stateObj.attributes.remaining || 0;
        return Math.round((remaining / duration) * 100);
      }

      const value = parseFloat(stateObj.state);
      return isNaN(value) ? 0 : Math.round(Math.min(Math.max(value, 0), 100));
    } catch (e) {
      return 0;
    }
  }

  _computeName(stateObj) {
    return this.config.name || 
           stateObj.attributes?.friendly_name || 
           this.config.entity || 
           "Circle Card";
  }

  _computeColor(value) {
    try {
      if (this.config.icon_color) return this.config.icon_color;
      
      if (value <= 20) return "rgb(var(--rgb-state-error, 255, 0, 0))";
      if (value <= 50) return "rgb(var(--rgb-state-warning, 255, 150, 0))";
      return "rgb(var(--rgb-state-success, 0, 255, 0))";
    } catch (e) {
      return "var(--primary-text-color)";
    }
  }

  _computeShowBadge(stateObj) {
    if (!this.config.show_badge) return false;
    if (!this.config.badge_condition) return true;
    
    try {
      return new Function('state', 'value', 
        `return ${this.config.badge_condition}`
      )(stateObj.state, this._computeValue(stateObj));
    } catch (e) {
      console.warn('Badge condition error:', e);
      return false;
    }
  }

  _computeIconSize() {
    try {
      switch (this.config.icon_size) {
        case "small": return "18px";
        case "large": return "36px";
        case "custom": return this.config.icon_custom_size || "24px";
        default: return "24px";
      }
    } catch (e) {
      return "24px";
    }
  }

  _computeCircleContainerStyle() {
    return styleMap({
      width: this.config.fill_container ? "100%" : `${this.config.size || 150}px`
    });
  }

  _getUnitOfMeasurement(stateObj) {
    if (stateObj.attributes.duration) return "%";
    return stateObj.attributes.unit_of_measurement || "%";
  }

  setConfig(config) {
    this.config = {
      ...MushroomCircleCard.getStubConfig(),
      ...config
    };
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('mushroom-circle-card', MushroomCircleCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mushroom-circle-card",
  name: "Mushroom Circle Card",
  description: "A circular progress card with Mushroom styling"
});
