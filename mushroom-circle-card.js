/*
Mushroom Circle Card v1.0.17
- Fixed clockwise/counter-clockwise rotation (both start at 12 o'clock)
- Added layout width/height support
- Fixed timer progress tracking
*/

class MushroomCircleCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._lastKnownState = null;
        this._lastStateChange = null;
        this._guessedDuration = null;
        this._updateTimer = null;
    }

    connectedCallback() {
        this._updateTimer = setInterval(() => {
            if (this._hass) this.render();
        }, 1000);
    }

    disconnectedCallback() {
        if (this._updateTimer) {
            clearInterval(this._updateTimer);
            this._updateTimer = null;
        }
    }

    getCardSize() {
        return this.config?.layout?.height || 1;
    }

    static getStubConfig() {
        return {
            type: "custom:mushroom-circle-card",
            entity: "",
            name: "",
            icon: "mdi:circle",
            show_ticks: false,
            tick_position: "inside",
            direction: "counter-clockwise",
            stroke_width: 8,
            hide_name: false,
            display_mode: "both",
            icon_size: "24px",
            layout: {
                width: 1,
                height: 1
            },
            fill_container: false,
            primary_info: "state",
            secondary_info: "name",
            duration: null,
            guess_mode: false
        };
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error("Please define an entity");
        }
        this.config = {
            ...MushroomCircleCard.getStubConfig(),
            ...config
        };
    }

    set hass(hass) {
        this._hass = hass;
        this.render();
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

    _computeValue(stateObj) {
        if (stateObj.entity_id.includes('timer')) {
            const remaining = this._computeRemainingTime(stateObj);
            const duration = this._timeToSeconds(stateObj.attributes.duration);
            const progress = duration ? ((duration - remaining) / duration) * 100 : 0;
            return progress;
        }
        return 0;
    }

    _computeColor(stateObj, value) {
        if (this.config.ring_color) {
            try {
                return Function('state', 'value', `return ${this.config.ring_color}`)(stateObj, value);
            } catch (e) {
                return 'var(--primary-color)';
            }
        }

        if (stateObj.attributes.rgb_color) {
            return `rgb(${stateObj.attributes.rgb_color.join(',')})`;
        }

        if (value <= 20) return 'var(--error-color)';
        if (value <= 50) return 'var(--warning-color)';
        return 'var(--success-color)';
    }

    _formatState(stateObj) {
        if (stateObj.entity_id.includes('timer')) {
            if (this.config.guess_mode && stateObj.state === 'active' && stateObj.attributes.finishes_at) {
                const remaining = this._computeRemainingTime(stateObj);
                return this._formatTime(remaining);
            }
            return stateObj.attributes.remaining || "0:00:00";
        }

        const value = parseFloat(stateObj.state);
        if (!isNaN(value)) {
            return stateObj.attributes.unit_of_measurement ? 
                `${value}${stateObj.attributes.unit_of_measurement}` : 
                value.toString();
        }

        return stateObj.state;
    }

    _generateTicks(radius, size) {
        if (!this.config.show_ticks) return '';
        
        const tickCount = 60;
        const ticks = [];
        const isInside = this.config.tick_position === 'inside';
        const tickOffset = isInside ? -8 : 8;
        
        for (let i = 0; i < tickCount; i++) {
            const angle = (i * 360 / tickCount) * (Math.PI / 180);
            const isMainTick = i % 5 === 0;
            const tickLength = isMainTick ? 8 : 5;
            
            const baseRadius = radius + tickOffset;
            const x1 = size/2 + baseRadius * Math.cos(angle);
            const y1 = size/2 + baseRadius * Math.sin(angle);
            const x2 = x1 + (isInside ? -tickLength : tickLength) * Math.cos(angle);
            const y2 = y1 + (isInside ? -tickLength : tickLength) * Math.sin(angle);
            
            ticks.push(`
                <line 
                    x1="${x1}" 
                    y1="${y1}" 
                    x2="${x2}" 
                    y2="${y2}"
                    class="tick ${isMainTick ? 'major' : ''}"
                />
            `);
        }
        
        return ticks.join('');
    }

    render() {
        if (!this._hass || !this.config) return;

        const stateObj = this._hass.states[this.config.entity];
        if (!stateObj) {
            this.shadowRoot.innerHTML = `
                <ha-card>
                    <div class="container">
                        Entity not found: ${this.config.entity}
                    </div>
                </ha-card>
            `;
            return;
        }

        const value = this._computeValue(stateObj);
        const strokeWidth = this.config.stroke_width || 8;
        const radius = 42 - (strokeWidth / 2);
        const circumference = 2 * Math.PI * radius;
        const progress = value / 100;
        const strokeDashoffset = circumference * (1 - progress);
        const color = this._computeColor(stateObj, value);
        const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;

        this.shadowRoot.innerHTML = `
            <ha-card>
                <style>
                    ha-card {
                        box-sizing: border-box;
                        padding: var(--spacing);
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        background: var(--ha-card-background, var(--card-background-color, white));
                        border-radius: var(--ha-card-border-radius, 12px);
                        box-shadow: var(--ha-card-box-shadow, none);
                        width: ${this.config?.layout?.width ? this.config.layout.width * 50 + 'px' : 'auto'};
                        height: ${this.config?.layout?.height ? this.config.layout.height * 50 + 'px' : 'auto'};
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        height: 100%;
                        min-height: 100px;
                    }
                    .circle-container {
                        position: relative;
                        width: 100px;
                        height: 100px;
                        min-height: 100px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto;
                    }
                    svg {
                        width: 100%;
                        height: 100%;
                        transform: rotate(-90deg) ${this.config.direction === "counter-clockwise" ? 'scale(-1, 1)' : ''};
                    }
                    circle, .tick {
                        fill: none;
                        stroke-width: ${strokeWidth};
                        stroke-linecap: round;
                    }
                    .background {
                        stroke: var(--disabled-text-color);
                        opacity: 0.2;
                    }
                    .progress {
                        transition: stroke-dashoffset 0.3s ease-in-out;
                        stroke: ${color};
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
                    .content {
                        position: absolute;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        height: 100%;
                        text-align: center;
                    }
                    ha-icon {
                        --mdc-icon-size: ${this.config.icon_size || '24px'};
                        color: ${color};
                    }
                    .info {
                        color: var(--primary-text-color);
                        font-size: var(--primary-font-size);
                        font-weight: var(--card-font-weight);
                        line-height: var(--card-line-height);
                        margin: 4px 0;
                    }
                    .name {
                        color: var(--secondary-text-color);
                        font-size: var(--body-font-size);
                        font-weight: var(--card-font-weight);
                        line-height: var(--body-line-height);
                        margin-top: 4px;
                    }
                </style>

                <div class="container">
                    <div class="circle-container">
                        <svg viewBox="0 0 100 100">
                            <circle
                                class="background"
                                cx="50"
                                cy="50"
                                r="${radius}"
                            />
                            ${this._generateTicks(radius, 100)}
                            <circle
                                class="progress"
                                cx="50"
                                cy="50"
                                r="${radius}"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${strokeDashoffset}"
                            />
                        </svg>
                        <div class="content">
                            ${this.config.icon ? `<ha-icon icon="${this.config.icon}"></ha-icon>` : ''}
                            <div class="info">${this._formatState(stateObj)}</div>
                        </div>
                    </div>
                    ${!this.config.hide_name ? `<div class="name">${name}</div>` : ''}
                </div>
            </ha-card>
        `;
    }
}

customElements.define("mushroom-circle-card", MushroomCircleCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mushroom-circle-card",
    name: "Mushroom Circle Card",
    description: "A circular progress card with Mushroom styling"
});
