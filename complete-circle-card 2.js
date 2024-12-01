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
            show_glow: true,
            direction: "counter-clockwise",
            size: 150,
            stroke_width: 8,
            hide_name: false,
            display_mode: "both",
            icon_color: "",
            show_badge: false,
            badge_icon: "mdi:alert",
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

    _computeValue(stateObj) {
        if (!stateObj) return 0;
        
        if (stateObj.attributes.duration) {
            const duration = stateObj.attributes.duration;
            const remaining = stateObj.attributes.remaining || 0;
            return (remaining / duration) * 100;
        }

        const value = parseFloat(stateObj.state);
        return isNaN(value) ? 0 : Math.min(Math.max(value, 0), 100);
    }

    _formatState(stateObj) {
        if (!stateObj) return '';
        
        if (stateObj.attributes.duration) {
            const remaining = stateObj.attributes.remaining || 0;
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        if (stateObj.attributes.unit_of_measurement === '%' || 
            stateObj.entity_id.includes('battery')) {
            return `${Math.round(parseFloat(stateObj.state))}%`;
        }

        const value = parseFloat(stateObj.state);
        return !isNaN(value) ? value.toFixed(1) : stateObj.state;
    }

    _evaluateBadgeCondition(stateObj) {
        if (!this.config.show_badge) return false;
        if (!this.config.badge_condition) return true;

        try {
            return Function('states', 'state', 
                `return ${this.config.badge_condition}`
            )(this._hass.states, stateObj.state);
        } catch (e) {
            console.error('Badge condition error:', e);
            return false;
        }
    }

    _generateTicks(radius, size) {
        if (!this.config.show_ticks) return '';
        
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
            
            ticks.push(`
                <line 
                    class="tick ${isMainTick ? 'major' : ''}"
                    x1="${x1}" 
                    y1="${y1}" 
                    x2="${x2}" 
                    y2="${y2}"
                />
            `);
        }
        return ticks.join('');
    }

    _generateGlowFilter() {
        return `
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

    render() {
        if (!this._hass || !this.config) return;

        const stateObj = this._hass.states[this.config.entity];
        if (!stateObj) {
            this.shadowRoot.innerHTML = `
                <ha-card>
                    <div style="padding: 8px;">Entity not found: ${this.config.entity}</div>
                </ha-card>
            `;
            return;
        }

        const value = this._computeValue(stateObj);
        const showBadge = this._evaluateBadgeCondition(stateObj);
        const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;
        const size = this.config.size || 150;
        const strokeWidth = this.config.stroke_width || 8;
        const radius = (size / 2) - (strokeWidth * 1.5);
        const circumference = 2 * Math.PI * radius;
        const progress = value / 100;
        const strokeDashoffset = this.config.direction === "clockwise" 
            ? circumference * (1 - progress)
            : circumference * progress;
        const color = this.config.icon_color || "var(--primary-color)";

        this.shadowRoot.innerHTML = `
            <ha-card>
                <style>
                    ha-card {
                        padding: 16px;
                    }
                    
                    .container {
                        position: relative;
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
                        stroke: ${color};
                        transition: stroke-dashoffset 0.3s ease-in-out;
                    }
                    
                    .progress.glow {
                        filter: url(#glow);
                    }
                    
                    .tick {
                        stroke: var(--disabled-text-color);
                        opacity: 0.3;
                    }
                    
                    .tick.major {
                        stroke-width: 2;
                        opacity: 0.4;
                    }
                    
                    .center {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        width: 100%;
                        padding: 0 8px;
                        box-sizing: border-box;
                    }
                    
                    .name {
                        font-size: 16px;
                        font-weight: 500;
                        margin-top: 16px;
                        opacity: 0.7;
                    }

                    .state {
                        font-size: ${this.config.display_mode === "both" ? "14px" : "22px"};
                        font-weight: bold;
                        margin-top: 4px;
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

                    ha-icon {
                        --mdc-icon-size: 24px;
                        display: block;
                        color: ${color};
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
                            ${this.config.show_glow ? this._generateGlowFilter() : ''}
                            
                            <circle
                                class="background"
                                cx="${size/2}"
                                cy="${size/2}"
                                r="${radius}"
                            />
                            
                            ${this._generateTicks(radius, size)}
                            
                            <circle
                                class="progress ${this.config.show_glow ? 'glow' : ''}"
                                cx="${size/2}"
                                cy="${size/2}"
                                r="${radius}"
                                stroke-dasharray="${circumference} ${circumference}"
                                stroke-dashoffset="${strokeDashoffset}"
                                transform="${this.config.direction === 'clockwise' ? `scale(1,-1) translate(0,-${size})` : ''}"
                            />
                        </svg>

                        <div class="center">
                            ${this.config.display_mode !== 'state' ? `
                                <ha-icon icon="${this.config.icon}"></ha-icon>
                            ` : ''}
                            ${this.config.display_mode !== 'icon' ? `
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