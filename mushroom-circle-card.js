class MushroomCircleCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._lastKnownState = null;
        this._lastStateChange = null;
        this._guessedDuration = null;
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
            size: 150,
            stroke_width: 8,
            hide_name: false,
            display_mode: "both",
            ring_color: "",
            icon_size: "24px",
            decimal_places: 1,
            fill_container: false,
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

    _guessTimeRemaining(stateObj) {
        if (stateObj.attributes.duration) {
            return this._timeToSeconds(stateObj.attributes.duration);
        }
        
        if (this.config.guess_mode) {
            if (stateObj.state === 'active' && this._lastKnownState !== 'active') {
                this._lastStateChange = new Date();
                this._guessedDuration = this._guessedDuration || 60 * 60;
            }
            
            if (this._lastStateChange) {
                const elapsed = (new Date() - this._lastStateChange) / 1000;
                return Math.max(0, this._guessedDuration - elapsed);
            }
        }
        
        this._lastKnownState = stateObj.state;
        return 0;
    }

    _computeDuration(config, stateObj) {
        if (typeof config.duration === 'number') return config.duration;

        if (config.duration) {
            if (config.duration.attribute) {
                const value = stateObj.attributes[config.duration.attribute];
                return this._parseDurationValue(value, config.duration.units);
            }

            if (config.duration.entity) {
                const durationEntity = this._hass.states[config.duration.entity];
                if (!durationEntity) return 100;
                
                const value = config.duration.attribute ? 
                    durationEntity.attributes[config.duration.attribute] : 
                    durationEntity.state;
                    
                return this._parseDurationValue(value, config.duration.units);
            }
        }

        return 100;
    }

    _parseDurationValue(value, units = 'duration') {
        switch(units) {
            case 'seconds':
                return parseFloat(value);
            case 'minutes':
                return parseFloat(value) * 60;
            case 'hours':
                return parseFloat(value) * 3600;
            case 'duration':
                return this._timeToSeconds(value);
            default:
                return parseFloat(value);
        }
    }

    _formatState(stateObj) {
        if (stateObj.entity_id.includes('timer')) {
            return stateObj.attributes.remaining || "0:00:00";
        }

        if (stateObj.attributes.unit_of_measurement === '%' || 
            stateObj.entity_id.includes('battery')) {
            const value = parseFloat(stateObj.state);
            return !isNaN(value) ? `${Math.round(value)}%` : stateObj.state;
        }

        const value = parseFloat(stateObj.state);
        if (!isNaN(value)) {
            const decimals = this.config.decimal_places || 1;
            return value.toFixed(decimals);
        }

        return stateObj.state;
    }

    _computeValue(stateObj) {
        if (stateObj.entity_id.includes('timer')) {
            let remaining = this._timeToSeconds(stateObj.attributes.remaining);
            let duration = this._timeToSeconds(stateObj.attributes.duration);
            
            if (this.config.guess_mode && stateObj.state === 'active') {
                if (this._lastKnownState !== 'active') {
                    this._lastStateChange = new Date();
                    this._guessedDuration = duration;
                }
                if (this._lastStateChange && this._guessedDuration) {
                    const elapsed = (new Date() - this._lastStateChange) / 1000;
                    remaining = Math.max(0, this._guessedDuration - elapsed);
                    duration = this._guessedDuration;
                }
            }
            
            this._lastKnownState = stateObj.state;
            return duration ? ((duration - remaining) / duration) * 100 : 0;
        }
        
        const value = parseFloat(stateObj.state);
        const duration = this._computeDuration(this.config, stateObj);
        
        if (this.config.duration) {
            return (value / duration) * 100;
        }
        
        return isNaN(value) ? 0 : Math.min(Math.max(value, 0), 100);
    }

    _computeColor(value) {
        if (this.config.ring_color) {
            try {
                return Function('states', 'value', 
                    `return ${this.config.ring_color}`
                )(this._hass.states, value);
            } catch (e) {
                return 'var(--primary-color)';
            }
        }
        
        if (value <= 20) return 'var(--error-color)';
        if (value <= 50) return 'var(--warning-color)';
        return 'var(--success-color)';
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
        const baseSize = this.config.size || 150;
        const strokeWidth = this.config.stroke_width || 8;
        const radius = (baseSize / 2) - (strokeWidth * 1.5);
        const circumference = 2 * Math.PI * radius;
        const progress = value / 100;
        const isClockwise = this.config.direction === "clockwise";
        const strokeDashoffset = circumference * (1 - progress);
        const color = this._computeColor(value);
        const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;

        this.shadowRoot.innerHTML = `
            <ha-card>
                <style>
                    ha-card {
                        height: 100%;
                        padding: 16px;
                        box-sizing: border-box;
                    }
                    .container {
                        position: relative;
                        width: 100%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .circle-container {
                        position: relative;
                        width: ${this.config.fill_container ? '100%' : `${baseSize}px`};
                        height: auto;
                        aspect-ratio: 1;
                    }
                    svg {
                        width: 100%;
                        height: 100%;
                        transform: rotate(${isClockwise ? '-90' : '90'}deg);
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
                    .center-content {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        gap: 4px;
                    }
                    ha-icon {
                        width: ${this.config.icon_size || '24px'};
                        height: ${this.config.icon_size || '24px'};
                        color: ${color};
                        display: flex;
                        --mdc-icon-size: ${this.config.icon_size || '24px'};
                    }
                    .state {
                        font-size: ${this.config.display_mode === "both" ? "14px" : "22px"};
                        font-weight: bold;
                    }
                    .name {
                        font-size: 16px;
                        font-weight: 500;
                        margin-top: 8px;
                        opacity: 0.7;
                    }
                </style>

                <div class="container">
                    <div class="circle-container">
                        <svg viewBox="0 0 ${baseSize} ${baseSize}">
                            <circle
                                class="background"
                                cx="${baseSize/2}"
                                cy="${baseSize/2}"
                                r="${radius}"
                            />

                            ${this._generateTicks(radius, baseSize)}

                            <circle
                                class="progress"
                                cx="${baseSize/2}"
                                cy="${baseSize/2}"
                                r="${radius}"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${strokeDashoffset}"
                                transform="${isClockwise ? `scale(1,-1) translate(0,-${baseSize})` : ''}"
                            />
                        </svg>

                        <div class="center-content">
                            ${this.config.display_mode !== "state" ? `
                                <ha-icon icon="${this.config.icon}"></ha-icon>
                            ` : ''}
                            ${this.config.display_mode !== "icon" ? `
                                <div class="state">${this._formatState(stateObj)}</div>
                            ` : ''}
                        </div>
                    </div>

                    ${!this.config.hide_name ? `
                        <div class="name">${name}</div>
                    ` : ''}
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
