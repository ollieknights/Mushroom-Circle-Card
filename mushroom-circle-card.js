import {
  LitElement, html
} from 'https://unpkg.com/@polymer/lit-element@0.5.2/lit-element.js?module';

class EnhancedCircleSensorCard extends LitElement {
  static get properties() {
    return {
      hass: Object,
      config: Object,
      state: Object,
      dashArray: String,
      _lastKnownState: String,
      _lastStateChange: String,
      _guessedDuration: Number,
      _updateTimer: Number
    }
  }

  constructor() {
    super();
    this._lastKnownState = null;
    this._lastStateChange = null;
    this._guessedDuration = null;
    this._updateTimer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._updateTimer = setInterval(() => {
      if (this.hass && this.config.display_mode === 'time') {
        this._updateState();
      }
    }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._updateTimer) {
      clearInterval(this._updateTimer);
      this._updateTimer = null;
    }
  }

  _timeToSeconds(timeString) {
    if (!timeString) return 0;
    if (typeof timeString === 'number') return timeString;
    const matches = timeString.match(/^(\d+):(\d{2}):(\d{2})/);
    if (matches) {
      const [_, hours, minutes, seconds] = matches;
      return (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(seconds);
    }
    return 0;
  }

  _formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  _computeRemainingTime(stateObj) {
    if (this.config.guess_mode && stateObj.state === 'active' && stateObj.attributes.finishes_at) {
      const finishTime = new Date(stateObj.attributes.finishes_at);
      const now = new Date();
      return Math.max(0, (finishTime - now) / 1000);
    }
    return this._timeToSeconds(stateObj.attributes.remaining);
  }

  _generateTicks() {
    if (!this.config.show_ticks) return '';
    
    const tickCount = 60;
    const radius = 90;
    const ticks = [];
    const isInside = this.config.tick_position === 'inside';
    const tickOffset = isInside ? -8 : 8;
    
    for (let i = 0; i < tickCount; i++) {
      const angle = (i * 360 / tickCount) * (Math.PI / 180);
      const isMainTick = i % 5 === 0;
      const tickLength = isMainTick ? 8 : 5;
      
      const baseRadius = radius + tickOffset;
      const x1 = baseRadius * Math.sin(angle);
      const y1 = -baseRadius * Math.cos(angle);
      const x2 = (baseRadius + (isInside ? -tickLength : tickLength)) * Math.sin(angle);
      const y2 = -(baseRadius + (isInside ? -tickLength : tickLength)) * Math.cos(angle);
      
      ticks.push(html`
        <line 
          x1="${x1}" 
          y1="${y1}" 
          x2="${x2}" 
          y2="${y2}"
          class="${isMainTick ? 'tick major' : 'tick'}"
        />
      `);
    }
    
    return ticks;
  }

  _render({ state, dashArray, config }) {
    var stateval;
    var displayValue;

    if (state === undefined) {
      stateval = 0;
      displayValue = 0;
    } else {
      if (config.display_mode === 'time' && state.entity_id.includes('timer')) {
        const remaining = this._computeRemainingTime(state);
        displayValue = this._formatTime(remaining);
        const duration = this._timeToSeconds(state.attributes.duration);
        stateval = duration ? ((duration - remaining) / duration) * 100 : 0;
      } else if (config.display_mode === 'percentage') {
        stateval = state.state;
        displayValue = state.state + '%';
      } else {
        stateval = state.state;
        displayValue = config.attribute ? state.attributes[config.attribute] : state.state;
      }
    }

    return html`
      <style>
          :host {
            cursor: pointer;
          }

          .container {
            position: relative;
            height: ${config.style?.height || '100%'};
            width: ${config.style?.width};
            top: ${config.style?.top};
            left: ${config.style?.left};
            display: flex;
            flex-direction: column;
          }

          .labelContainer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          
          #label {
            display: flex;
            line-height: 1;
          }
          
          #label.bold {
            font-weight: bold;
          }
          
          #label, #name {
            margin: 1% 0;
          }

          .text, #name {
            font-size: 100%;
          }
          
          .unit {
            font-size: 75%;
          }

          .tick {
            stroke: var(--disabled-text-color);
            opacity: 0.3;
            stroke-width: 1px;
          }

          .tick.major {
            stroke-width: 2px;
            opacity: 0.4;
          }

          ha-card {
            background: var(--ha-card-background, var(--card-background-color, white));
            border-radius: var(--ha-card-border-radius, 4px);
            box-shadow: var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2));
            color: var(--primary-text-color);
            padding: ${config.show_card ? '8px' : '0'};
            ${config.show_card ? '' : 'box-shadow: none;'}
            ${config.show_card ? '' : 'background: none;'}
            ${config.show_card ? '' : 'border-radius: 0;'}
            ${config.show_card ? '' : 'padding: 0;'}
          }
      </style>
      <ha-card>
        <div class="container" id="container" on-click="${() => this._click()}">
          <svg viewbox="0 0 200 200" id="svg">
            <circle id="circlestrokebg" cx="50%" cy="50%" r="45%"
              fill$="${config.fill || 'rgba(255, 255, 255, .75)'}"
              stroke$="${config.stroke_bg_color || '#999999'}"
              stroke-width$="${config.stroke_bg_width || config.stroke_width || 6}"
              transform="rotate(-90 100 100)"/>
            ${this._generateTicks()}
            <circle id="circle" cx="50%" cy="50%" r="45%"
              fill$="${config.fill || 'rgba(255, 255, 255, .75)'}"
              stroke$="${this._computeStrokeColor(stateval)}"
              stroke-dasharray$="${dashArray}"
              stroke-width$="${config.stroke_width || 6}" 
              transform="rotate(-90 100 100)"/>
          </svg>
          <span class="labelContainer">
            ${config.name != null ? html`<span id="name">${config.name}</span>` : ''}
            <span id="label" class$="${!!config.name ? 'bold' : ''}">
              <span class="text">
                ${displayValue}
              </span>
              <span class="unit">
                ${config.show_max
                  ? html`&nbsp/ ${config.attribute_max ? state.attributes[config.attribute_max] : config.max}`
                  : (config.units ? config.units : state.attributes?.unit_of_measurement || '')}
              </span>
            </span>
          </span>
        </div>
      </ha-card>
    `;
  }

_computeStrokeColor(value) {
    if (this.config.ring_color) {
      try {
        return Function('value', `return ${this.config.ring_color}`)(value);
      } catch (e) {
        console.error('Error computing color:', e);
        return this.config.stroke_color || '#03a9f4';
      }
    }

    if (this.config.color_stops) {
      return this._calculateStrokeColor(value, this.config.color_stops);
    }

    return this.config.stroke_color || '#03a9f4';
  }

  _createRoot() {
    const shadow = this.attachShadow({ mode: 'open' });
    return shadow;
  }

  _didRender() {
    this.circle = this._root.querySelector('#circle');
    if (this.config) {
      this._updateConfig();
    }
  }

  setConfig(config) {
    if (!config.entity) {
      throw Error('No entity defined');
    }
    
    // Merge with default config
    this.config = {
      display_mode: 'value', // Can be 'value', 'percentage', or 'time'
      show_ticks: false,
      tick_position: 'inside',
      guess_mode: false,
      gradient: false,
      show_card: true,
      ...config
    };

    if (this.circle) {
      this._updateConfig();
    }
  }

  getCardSize() {
    return 3;
  }

  _updateConfig() {
    const container = this._root.querySelector('.labelContainer');
    container.style.color = 'var(--primary-text-color)';

    if (this.config.font_style) {
      Object.keys(this.config.font_style).forEach((prop) => {
        container.style.setProperty(prop, this.config.font_style[prop]);
      });
    }
  }

  _updateState() {
    if (!this.state || !this.config.display_mode === 'time') return;
    
    const state = this.config.attribute
      ? this.state.attributes[this.config.attribute]
      : this.state.state;
    const r = 200 * .45;
    const min = this.config.min || 0;
    const max = this.config.attribute_max
      ? this.state.attributes[this.config.attribute_max]
      : (this.config.max || 100);
    const val = this._calculateValueBetween(min, max, state);
    const score = val * 2 * Math.PI * r;
    const total = 10 * r;
    this.dashArray = `${score} ${total}`;
  }

  set hass(hass) {
    this._hass = hass;
    this.state = hass.states[this.config.entity];

    if (this.config.attribute) {
      if (!this.state.attributes[this.config.attribute] ||
          isNaN(this.state.attributes[this.config.attribute])) {
        console.error(`Attribute [${this.config.attribute}] is not a number`);
        return;
      }
    } else {
      if (!this.state || (isNaN(this.state.state) && this.config.display_mode !== 'time')) {
        console.error(`State is not a number`);
        return;
      }
    }

    const state = this.config.attribute
      ? this.state.attributes[this.config.attribute]
      : this.state.state;
    const r = 200 * .45;
    const min = this.config.min || 0;
    const max = this.config.attribute_max
      ? this.state.attributes[this.config.attribute_max]
      : (this.config.max || 100);
    const val = this._calculateValueBetween(min, max, state);
    const score = val * 2 * Math.PI * r;
    const total = 10 * r;
    this.dashArray = `${score} ${total}`;
  }

  _click() {
    this._fire('hass-more-info', { entityId: this.config.entity });
  }

  _calculateValueBetween(start, end, val) {
    return (val - start) / (end - start);
  }

  _calculateStrokeColor(state, stops) {
    const sortedStops = Object.keys(stops).map(n => Number(n)).sort((a, b) => a - b);
    let start, end, val;
    const l = sortedStops.length;
    if (state <= sortedStops[0]) {
      return stops[sortedStops[0]];
    } else if (state >= sortedStops[l - 1]) {
      return stops[sortedStops[l - 1]];
    } else {
      for (let i = 0; i < l - 1; i++) {
        const s1 = sortedStops[i];
        const s2 = sortedStops[i + 1];
        if (state >= s1 && state < s2) {
          [start, end] = [stops[s1], stops[s2]];
          if (!this.config.gradient) {
            return start;
          }
          val = this._calculateValueBetween(s1, s2, state);
          break;
        }
      }
    }
    return this._getGradientValue(start, end, val);
  }

  _getGradientValue(colorA, colorB, val) {
    const v1 = 1 - val;
    const v2 = val;
    const decA = this._hexColorToDecimal(colorA);
    const decB = this._hexColorToDecimal(colorB);
    const rDec = Math.floor((decA[0] * v1) + (decB[0] * v2));
    const gDec = Math.floor((decA[1] * v1) + (decB[1] * v2));
    const bDec = Math.floor((decA[2] * v1) + (decB[2] * v2));
    const rHex = this._padZero(rDec.toString(16));
    const gHex = this._padZero(gDec.toString(16));
    const bHex = this._padZero(bDec.toString(16));
    return `#${rHex}${gHex}${bHex}`;
  }

  _hexColorToDecimal(color) {
    let c = color.substr(1);
    if (c.length === 3) {
      c = `${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`;
    }

    const [r, g, b] = c.match(/.{2}/g);
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
  }

  _padZero(val) {
    if (val.length < 2) {
      val = `0${val}`;
    }
    return val.substr(0, 2);
  }

  _fire(type, detail) {
    const event = new Event(type, {
      bubbles: true,
      cancelable: false,
      composed: true
    });
    event.detail = detail || {};
    this.shadowRoot.dispatchEvent(event);
    return event;
  }
}

customElements.define('enhanced-circle-sensor-card', EnhancedCircleSensorCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "enhanced-circle-sensor-card",
    name: "Enhanced Circle Sensor Card",
    description: "A circular progress card with value, percentage and timer modes"
});
