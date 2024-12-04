if (!customElements.get("mushroom-circle-card")) {
    class MushroomCircleCard extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
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

        setConfig(config) {
            if (!config.entity) throw new Error("Please define an entity");
            this.config = {
                type: "custom:mushroom-circle-card",
                entity: "",
                icon: "mdi:circle",
                show_ticks: false,
                tick_position: "inside",
                direction: "clockwise",
                stroke_width: 6,
                guess_mode: false,
                layout: { width: 2, height: 2 },
                ...config
            };
        }

        static getStubConfig() {
            return {
                type: "custom:mushroom-circle-card",
                entity: "",
                name: "",
                icon: "mdi:circle",
                show_ticks: false,
                tick_position: "inside",
                direction: "clockwise",
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
            const remaining = this._computeRemainingTime(stateObj);
            const duration = this._timeToSeconds(stateObj.attributes.duration);
            return duration ? ((duration - remaining) / duration) * 100 : 0;
        }

        _computeProgressPath(radius, progress, direction) {
            if (progress === 0) return '';
            if (progress === 100) {
                return `M 0,-${radius} A ${radius},${radius} 0 1,${direction === 'clockwise' ? '1' : '0'} 0.1,-${radius}`;
            }
            
            const angle = (progress / 100) * 2 * Math.PI;
            const x = radius * Math.sin(angle);
            const y = -radius * Math.cos(angle);
            const largeArcFlag = progress > 50 ? 1 : 0;
            
            return direction === 'clockwise' 
                ? `M 0,-${radius} A ${radius},${radius} 0 ${largeArcFlag},1 ${x},${y}`
                : `M 0,-${radius} A ${radius},${radius} 0 ${largeArcFlag},0 ${-x},${y}`;
        }

        _computeColor(stateObj) {
            if (this.config.ring_color) {
                try {
                    const remaining = this._computeRemainingTime(stateObj);
                    return Function('remaining', `return ${this.config.ring_color}`)(remaining);
                } catch (e) {
                    console.error('Error computing color:', e);
                    return 'var(--primary-color)';
                }
            }
            return 'var(--primary-color)';
        }

        _formatState(stateObj) {
            if (this.config.guess_mode && stateObj.state === 'active' && stateObj.attributes.finishes_at) {
                return this._formatTime(this._computeRemainingTime(stateObj));
            }
            return stateObj.attributes.remaining || "0:00:00";
        }

        _generateTicks(radius) {
            if (!this.config.show_ticks) return '';
            
            const tickCount = 60;
            const ticks = [];
            const isInside = this.config.tick_position === 'inside';
            const tickOffset = isInside ? -(this.config.stroke_width/2 + 2) : (this.config.stroke_width/2 + 2);
            
            for (let i = 0; i < tickCount; i++) {
                const angle = (i * 360 / tickCount) * (Math.PI / 180);
                const isMainTick = i % 5 === 0;
                const tickLength = isMainTick ? 4 : 2;
                
                const baseRadius = radius + tickOffset;
                const x1 = baseRadius * Math.sin(angle);
                const y1 = -baseRadius * Math.cos(angle);
                const x2 = (baseRadius + (isInside ? -tickLength : tickLength)) * Math.sin(angle);
                const y2 = -(baseRadius + (isInside ? -tickLength : tickLength)) * Math.cos(angle);
                
                ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
                    class="tick ${isMainTick ? 'major' : ''}" />`);
            }
            
            return ticks.join('');
        }

        render() {
            if (!this._hass || !this.config) return;

            const stateObj = this._hass.states[this.config.entity];
            if (!stateObj) {
                this.shadowRoot.innerHTML = `<ha-card>Entity not found: ${this.config.entity}</ha-card>`;
                return;
            }

            const value = this._computeValue(stateObj);
            const strokeWidth = this.config.stroke_width || 8;
            const FIXED_RADIUS = 35;
            const radius = FIXED_RADIUS;
            const progressPath = this._computeProgressPath(radius, value, this.config.direction);
            const color = this._computeColor(stateObj);
            const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;
            
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        --card-width: ${this.config?.layout?.width ? this.config.layout.width * 50 : 100}px;
                        --card-height: ${this.config?.layout?.height ? this.config.layout.height * 50 : 100}px;
                    }
                    ha-card {
                        position: relative;
                        width: var(--card-width);
                        height: var(--card-height);
                        padding: 8px;
                        box-sizing: border-box;
                        background: var(--ha-card-background, var(--card-background-color, white));
                        border-radius: var(--ha-card-border-radius, 12px);
                        box-shadow: var(--ha-card-box-shadow, none);
                    }
                    .container {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    .circle-container {
                        position: relative;
                        width: ${Math.min(var(--card-width), var(--card-height)) - 16}px;
                        height: ${Math.min(var(--card-width), var(--card-height)) - 16}px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    svg {
                        width: 100%;
                        height: 100%;
                        display: block;
                        transform: rotate(${this.config.direction === 'counter-clockwise' ? '180deg' : '0'});
                        overflow: visible;
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
                    .progress-path {
                        stroke: ${color};
                        transition: all 0.3s ease-in-out;
                    }
                    .tick {
                        stroke: var(--disabled-text-color);
                        opacity: 0.3;
                        stroke-width: 1px;
                    }
                    .tick.major {
                        stroke-width: 1.5px;
                        opacity: 0.4;
                    }
                    .content {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                    }
                    ha-icon {
                        --mdc-icon-size: 24px;
                        color: ${color};
                        margin-bottom: 4px;
                    }
                    .info {
                        font-size: 14px;
                        line-height: 1;
                        color: var(--primary-text-color);
                    }
                    .name {
                        font-size: 12px;
                        line-height: 1;
                        color: var(--secondary-text-color);
                        opacity: 0.7;
                        margin-top: 4px;
                    }
                </style>
                <ha-card>
                    <div class="container">
                        <div class="circle-container">
                            <svg viewBox="-50 -50 100 100">
                                <circle class="background" cx="0" cy="0" r="${radius}" />
                                ${this._generateTicks(radius)}
                                <path class="progress-path" d="${progressPath}" />
                            </svg>
                            <div class="content">
                                ${this.config.icon ? `<ha-icon icon="${this.config.icon}"></ha-icon>` : ''}
                                <div class="info">${this._formatState(stateObj)}</div>
                                ${!this.config.hide_name ? `<div class="name">${name}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </ha-card>
            `;
        }
    }

    customElements.define("mushroom-circle-card", MushroomCircleCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mushroom-circle-card",
    name: "Mushroom Circle Card",
    description: "A circular progress card with Mushroom styling"
});
