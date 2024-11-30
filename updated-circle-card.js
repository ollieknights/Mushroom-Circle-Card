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
            show_glow: false,
            direction: "counter-clockwise",
            size: 150,
            stroke_width: 8,
            hide_name: false,
            show_state_in_center: true,
            icon_color: "",
            show_badge: false,
            badge_icon: "",
            badge_color: "",
            badge_condition: ""
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
        const value = parseFloat(stateObj.state);
        
        // Check if it's a timer
        if (stateObj.attributes.duration) {
            const time = new Date(value * 1000).toISOString().substr(11, 8);
            return time;
        }
        
        // Check if it's a percentage sensor
        if (stateObj.attributes.unit_of_measurement === '%' || 
            stateObj.entity_id.includes('battery')) {
            return `${Math.round(value)}%`;
        }
        
        // For decimal numbers
        if (!isNaN(value)) {
            return value.toFixed(1);
        }
        
        return stateObj.state;
    }

    render() {
        if (!this._hass || !this.config) return;

        const stateObj = this._hass.states[this.config.entity];
        if (!stateObj) {
            this.shadowRoot.innerHTML = `
                <ha-card>
                    <div>Entity not found: ${this.config.entity}</div>
                </ha-card>
            `;
            return;
        }

        const value = this._computeValue(stateObj);
        const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;
        const size = this.config.size || 150;
        const strokeWidth = this.config.stroke_width || 8;
        const radius = (size / 2) - (strokeWidth * 1.5);
        const circumference = 2 * Math.PI * radius;
        const progress = value / 100;
        const strokeDashoffset = circumference * (1 - progress);
        const showBadge = this._computeShowBadge(stateObj);
        const iconColor = this._computeIconColor(value);
        
        this.shadowRoot.innerHTML = `
            <ha-card>
                <style>
                    .container {
                        padding: 16px;
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
                        transform: rotate(-90deg);
                    }
                    circle {
                        fill: none;
                        stroke-width: ${strokeWidth};
                        stroke-linecap: round;
                        transition: stroke-dashoffset 0.3s ease;
                    }
                    .background {
                        stroke: var(--disabled-text-color);
                        opacity: 0.2;
                    }
                    .progress {
                        stroke: ${iconColor};
                        ${this.config.show_glow ? 'filter: drop-shadow(0 0 4px ' + iconColor + ');' : ''}
                    }
                    .tick {
                        stroke: var(--disabled-text-color);
                        opacity: 0.3;
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
                    }
                    .name {
                        font-size: 16px;
                        font-weight: 500;
                        margin-top: 8px;
                        color: var(--primary-text-color);
                        ${this.config.hide_name ? 'display: none;' : ''}
                    }
                    .state {
                        font-size: 22px;
                        font-weight: bold;
                        color: var(--primary-text-color);
                    }
                    .badge {
                        position: absolute;
                        top: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        background-color: ${this.config.badge_color || iconColor};
                        border-radius: 50%;
                        padding: 4px;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        z-index: 1;
                    }
                    ha-icon {
                        --mdc-icon-size: 24px;
                        color: ${iconColor};
                    }
                </style>
                <div class="container">
                    <div class="circle-container">
                        ${showBadge ? this._generateBadge() : ''}
                        <svg width="${size}" height="${size}">
                            ${this.config.show_glow ? this._generateGlowFilter() : ''}
                            <circle
                                class="background"
                                cx="${size/2}"
                                cy="${size/2}"
                                r="${radius}"
                            />
                            ${this.config.show_ticks ? this._generateTicks(radius, size) : ''}
                            <circle
                                class="progress"
                                cx="${size/2}"
                                cy="${size/2}"
                                r="${radius}"
                                stroke-dasharray="${circumference} ${circumference}"
                                stroke-dashoffset="${strokeDashoffset}"
                                transform="${this.config.direction === 'clockwise' ? 'scale(1,-1) translate(0,-' + size + ')' : ''}"
                            />
                        </svg>
                        <div class="center-content">
                            ${this.config.show_state_in_center ? 
                                `<div class="state">${this._formatState(stateObj)}</div>` :
                                `<ha-icon icon="${this.config.icon}"></ha-icon>`
                            }
                        </div>
                    </div>
                    <div class="name">${name}</div>
                </div>
            </ha-card>
        `;
    }

    _generateGlowFilter() {
        return `
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
        `;
    }

    _generateTicks(radius, size) {
        const tickCount = 60;
        const ticks = [];
        for (let i = 0; i < tickCount; i++) {
            const angle = (i * 360 / tickCount) * (Math.PI / 180);
            const isMainTick = i % 5 === 0;
            const innerRadius = radius - (isMainTick ? 8 : 5);
            
            const x1 = size/2 + innerRadius * Math.cos(angle);
            const y1 = size/2 + innerRadius * Math.sin(angle);
            const x2 = size/2 + radius * Math.cos(angle);
            const y2 = size/2 + radius * Math.sin(angle);
            
            ticks.push(`<line 
                x1="${x1}" 
                y1="${y1}" 
                x2="${x2}" 
                y2="${y2}"
                class="tick"
                stroke-width="${isMainTick ? 2 : 1}"
            />`);
        }
        return ticks.join('');
    }

    _generateBadge() {
        return `
            <div class="badge">
                <ha-icon icon="${this.config.badge_icon}"></ha-icon>
            </div>
        `;
    }

    _computeValue(stateObj) {
        if (stateObj.attributes.duration) {
            const duration = stateObj.attributes.duration;
            const remaining = stateObj.attributes.remaining || 0;
            return (remaining / duration) * 100;
        }
        
        const value = parseFloat(stateObj.state);
        return isNaN(value) ? 0 : Math.min(Math.max(value, 0), 100);
    }

    _computeIconColor(value) {
        if (this.config.icon_color) return this.config.icon_color;
        
        // Default color logic based on value
        if (value <= 20) return 'var(--error-color)';
        if (value <= 50) return 'var(--warning-color)';
        return 'var(--success-color)';
    }

    _computeShowBadge(stateObj) {
        if (!this.config.show_badge) return false;
        if (!this.config.badge_condition) return true;
        
        try {
            return new Function('state', 'value', 
                `return ${this.config.badge_condition}`
            )(stateObj.state, this._computeValue(stateObj));
        } catch (e) {
            return false;
        }
    }
}

customElements.define("mushroom-circle-card", MushroomCircleCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mushroom-circle-card",
    name: "Mushroom Circle Card",
    description: "A circular progress card with Mushroom styling"
});