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
            icon: "mdi:battery",
            show_ticks: false,
            tick_position: "inside",
            direction: "counter-clockwise",
            size: 150,
            ring_width: 8,
            hide_name: false,
            display_mode: "both",
            ring_color: "",
            show_badge: false,
            badge_icon: "mdi:lightning-bolt",
            badge_color: "",
            badge_condition: "",
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

    _formatState(stateObj) {
        // Handle timers
        if (stateObj.entity_id.includes('timer')) {
            const remaining = stateObj.attributes.remaining || 0;
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = remaining % 60;
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Handle percentages
        if (stateObj.attributes.unit_of_measurement === '%' || 
            stateObj.entity_id.includes('battery')) {
            const value = parseFloat(stateObj.state);
            return !isNaN(value) ? `${Math.round(value)}%` : stateObj.state;
        }

        // Handle decimal numbers
        const value = parseFloat(stateObj.state);
        if (!isNaN(value)) {
            const decimals = this.config.decimal_places || 1;
            return value.toFixed(decimals);
        }

        return stateObj.state;
    }

    _computeValue(stateObj) {
        if (stateObj.entity_id.includes('timer')) {
            const duration = stateObj.attributes.duration || 0;
            const remaining = stateObj.attributes.remaining || 0;
            return (remaining / duration) * 100;
        }

        const value = parseFloat(stateObj.state);
        return isNaN(value) ? 0 : Math.min(Math.max(value, 0), 100);
    }

    _computeColor(value) {
        // Check for custom ring color logic
        if (this.config.ring_color) {
            try {
                return Function('states', 'value', 
                    `return ${this.config.ring_color}`
                )(this._hass.states, value);
            } catch (e) {
                console.error('Ring color error:', e);
            }
        }
        
        // Default color logic
        if (value <= 20) return 'var(--error-color)';
        if (value <= 50) return 'var(--warning-color)';
        return 'var(--success-color)';
    }

    _evaluateBadgeCondition(stateObj) {
        if (!this.config.show_badge) return false;
        if (!this.config.badge_condition) return true;

        try {
            return Function('states', 'state', 
                `return ${this.config.badge_condition}`
            )(this._hass.states, stateObj.state);
        } catch (e) {
            return false;
        }
    }

    _generateTicks(radius, size) {
        if (!this.config.show_ticks) return '';
        
        const tickCount = 60;
        const ticks = [];
        const position = this.config.tick_position || 'inside';
        const offset = position === 'inside' ? -8 : 8;
        
        for (let i = 0; i < tickCount; i++) {
            const angle = (i * 360 / tickCount) * (Math.PI / 180);
            const isMainTick = i % 5 === 0;
            const tickLength = isMainTick ? 8 : 5;
            
            const startRadius = position === 'inside' ? radius + offset : radius;
            const x1 = size/2 + startRadius * Math.cos(angle);
            const y1 = size/2 + startRadius * Math.sin(angle);
            const x2 = size/2 + (startRadius + tickLength) * Math.cos(angle);
            const y2 = size/2 + (startRadius + tickLength) * Math.sin(angle);
            
            ticks.push(`
                <line 
                    x1="${x1}" 
                    y1="${y1}" 
                    x2="${x2}" 
                    y2="${y2}"
                    class="tick ${isMainTick ? 'major' : ''}"
                    stroke-width="${isMainTick ? 2 : 1}"
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
        const ringWidth = this.config.ring_width || 8;
        const radius = (size / 2) - (ringWidth * 1.5);
        const circumference = 2 * Math.PI * radius;
        const progress = value / 100;
        const isClockwise = this.config.direction === "clockwise";
        const strokeDashoffset = isClockwise ? 
            circumference * (1 - progress) : 
            -circumference * progress;
        const showBadge = this._evaluateBadgeCondition(stateObj);
        const color = this._computeColor(value);
        const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;

        this.shadowRoot.innerHTML = `
            <ha-card>
                <style>
                    :host {
                        --mdc-icon-size: ${this.config.icon_size || '24px'};
                    }
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
                        stroke-width: ${ringWidth};
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
                    }
                    .tick.major {
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
                    }
                    ha-icon {
                        width: var(--mdc-icon-size);
                        height: var(--mdc-icon-size);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: ${color};
                    }
                    .badge {
                        position: absolute;
                        top: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        background-color: ${this.config.badge_color || color};
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
                    .badge ha-icon {
                        --mdc-icon-size: 14px;
                        color: white;
                    }
                    .state {
                        font-size: ${this.config.display_mode === "both" ? "14px" : "22px"};
                        font-weight: bold;
                        margin-top: 4px;
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
                        ${showBadge ? `
                            <div class="badge">
                                <ha-icon icon="${this.config.badge_icon}"></ha-icon>
                            </div>
                        ` : ''}
                        
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
                                stroke-dasharray="${circumference} ${circumference}"
                                stroke-dashoffset="${strokeDashoffset}"
                            />
                        </svg>

                        <div class="center-content">
                            ${this.config.display_mode !== "state" ? `
                                <ha-icon icon="${this.config.icon}" style="margin: 0 auto;"></ha-icon>
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
