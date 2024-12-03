if (!customElements.get("mushroom-circle-card")) {
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

        setConfig(config) {
            if (!config.entity) {
                throw new Error("Please define an entity");
            }
            this.config = {
                type: "custom:mushroom-circle-card",
                entity: "",
                name: "",
                icon: "mdi:circle",
                show_ticks: false,
                tick_position: "inside",
                direction: "clockwise",
                stroke_width: 8,
                hide_name: false,
                display_mode: "percentage",
                max_value: 100,
                icon_size: "24px",
                layout: {
                    width: 1,
                    height: 1
                },
                fill_container: false,
                duration: null,
                guess_mode: false,
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
            if (this.config.display_mode === 'time' && stateObj.entity_id.includes('timer')) {
                const remaining = this._computeRemainingTime(stateObj);
                const duration = this._timeToSeconds(stateObj.attributes.duration);
                return duration ? ((duration - remaining) / duration) * 100 : 0;
            }

            const numericValue = parseFloat(stateObj.state);
            if (!isNaN(numericValue)) {
                if (this.config.display_mode === 'value') {
                    const maxValue = parseFloat(this.config.max_value) || 100;
                    return Math.min(100, (numericValue / maxValue) * 100);
                }
                return Math.min(100, Math.max(0, numericValue));
            }
            return 0;
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
            switch (this.config.display_mode) {
                case 'time':
                    if (stateObj.entity_id.includes('timer')) {
                        if (this.config.guess_mode && stateObj.state === 'active' && stateObj.attributes.finishes_at) {
                            return this._formatTime(this._computeRemainingTime(stateObj));
                        }
                        return stateObj.attributes.remaining || "0:00:00";
                    }
                    break;

                case 'percentage':
                    const value = parseFloat(stateObj.state);
                    return !isNaN(value) ? `${Math.round(value)}%` : stateObj.state;

                case 'value':
                    const numValue = parseFloat(stateObj.state);
                    return !isNaN(numValue) ? 
                        `${numValue}${stateObj.attributes.unit_of_measurement || ''}` : 
                        stateObj.state;
            }
            return stateObj.state;
        }

        _generateTicks(radius) {
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
                const x1 = baseRadius * Math.sin(angle);
                const y1 = -baseRadius * Math.cos(angle);
                const x2 = (baseRadius + (isInside ? -tickLength : tickLength)) * Math.sin(angle);
                const y2 = -(baseRadius + (isInside ? -tickLength : tickLength)) * Math.cos(angle);
                
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
            const radius = 35 - (strokeWidth / 2);
            const progressPath = this._computeProgressPath(radius, value, this.config.direction);
            const color = this._computeColor(stateObj);
            const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;

            this.shadowRoot.innerHTML = `
                <ha-card>
                    <style>
                        ha-card {
                            box-sizing: border-box;
                            height: 100%;
                            width: 100%;
                            padding: 0;
                            position: relative;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            padding: 1rem;
                            height: 100%;
                            width: 100%;
                            box-sizing: border-box;
                        }
                        .circle-container {
                            position: relative;
                            flex: 1;
                            width: 100%;
                            max-width: calc(${this.config?.layout?.width || 1} * 50px);
                            aspect-ratio: 1;
                        }
                        svg {
                            width: 100%;
                            height: 100%;
                            overflow: visible;
                            display: block;
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
                            stroke-width: ${strokeWidth};
                            stroke-linecap: round;
                            transition: all 0.3s ease-in-out;
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
                            inset: 0;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                        }
                        ha-icon {
                            --mdc-icon-size: ${this.config.icon_size || '24px'};
                            color: ${color};
                            margin-bottom: 4px;
                        }
                        .info {
                            color: var(--primary-text-color);
                            font-size: var(--primary-font-size);
                            font-weight: var(--card-font-weight);
                            line-height: var(--card-line-height);
                        }
                        .name {
                            color: var(--secondary-text-color);
                            font-size: var(--body-font-size);
                            font-weight: var(--card-font-weight);
                            line-height: var(--body-line-height);
                            margin-top: 0.5rem;
                            text-align: center;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            width: 100%;
                        }
                    </style>

                    <div class="container">
                        <div class="circle-container">
                            <svg viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid meet">
                                <circle
                                    class="background"
                                    cx="0"
                                    cy="0"
                                    r="${radius}"
                                />
                                ${this._generateTicks(radius)}
                                <path
                                    class="progress-path"
                                    d="${progressPath}"
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
}

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mushroom-circle-card",
    name: "Mushroom Circle Card",
    description: "A circular progress card with Mushroom styling"
});
