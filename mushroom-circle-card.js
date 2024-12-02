class MushroomCircleCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
            decimal_places: 1
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

    // Convert HH:MM:SS to seconds
    _timeToSeconds(timeString) {
        if (!timeString) return 0;
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        return (hours * 3600) + (minutes * 60) + (seconds || 0);
    }

    _formatState(stateObj) {
        // Timer handling with string format HH:MM:SS
        if (stateObj.entity_id.includes('timer')) {
            return stateObj.attributes.remaining || "0:00:00";
        }

        // Percentage handling
        if (stateObj.attributes.unit_of_measurement === '%' || 
            stateObj.entity_id.includes('battery')) {
            const value = parseFloat(stateObj.state);
            return !isNaN(value) ? `${Math.round(value)}%` : stateObj.state;
        }

        // Decimal number handling
        const value = parseFloat(stateObj.state);
        if (!isNaN(value)) {
            const decimals = this.config.decimal_places || 1;
            return value.toFixed(decimals);
        }

        return stateObj.state;
    }

    _computeValue(stateObj) {
        // Timer progress
        if (stateObj.entity_id.includes('timer')) {
            const duration = this._timeToSeconds(stateObj.attributes.duration);
            const remaining = this._timeToSeconds(stateObj.attributes.remaining);
            if (duration === 0) return 0;
            return (remaining / duration) * 100;
        }

        // Regular value handling
        const value = parseFloat(stateObj.state);
        return isNaN(value) ? 0 : Math.min(Math.max(value, 0), 100);
    }

    _computeColor(value) {
        if (this.config.ring_color) {
            if (this.config.ring_color.startsWith('var(')) {
                return this.config.ring_color;
            }
            try {
                return Function('value', `return ${this.config.ring_color}`)(value);
            } catch (e) {
                console.error('Ring color error:', e);
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
        const size = this.config.size || 150;
        const strokeWidth = this.config.stroke_width || 8;
        const radius = (size / 2) - (strokeWidth * 1.5);
        const circumference = 2 * Math.PI * radius;
        const progress = value / 100;
        const isClockwise = this.config.direction === "clockwise";
        const strokeDashoffset = isClockwise ? 
            circumference * (1 - progress) : 
            -circumference * progress;
        const color = this._computeColor(value);
        const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;

        this.shadowRoot.innerHTML = `
            <ha-card>
                <style>
                    ha-card {
                        height: 100%;
                        padding: 16px;
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
                        width: ${size}px;
                        height: ${size}px;
                    }
                    svg {
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
                        width: ${this.config.icon_size};
                        height: ${this.config.icon_size};
                        color: ${color};
                        display: flex;
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
                        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                            <circle
                                class="background"
                                cx="${size/2}"
                                cy="${size/2}"
                                r="${radius}"
                            />

                            ${this._generateTicks(radius, size)}

                            <circle
                                class="progress"
                                cx="${size/2}"
                                cy="${size/2}"
                                r="${radius}"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${strokeDashoffset}"
                                transform="${isClockwise ? `scale(1,-1) translate(0,-${size})` : ''}"
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
