class MushroomCircleCard extends HTMLElement {
    static getConfigElement() {
        return document.createElement("mushroom-circle-card-editor");
    }

    static getStubConfig() {
        return {
            type: "custom:mushroom-circle-card",
            entity: "",
            name: "",
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

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error("Please define an entity");
        }
        this.config = {
            ...MushroomCircleCard.getStubConfig(),
            ...config
        };

        this.render();
    }

    set hass(hass) {
        this._hass = hass;
        this.render();
    }

    // Generate the card's CSS
    static get styles() {
        return `
            :host {
                --mdc-icon-size: var(--icon-size, 24px);
                --circle-size: var(--card-size, 150px);
                --circle-border-width: 8px;
                --circle-border-radius: calc(var(--circle-size) / 2);
                --icon-border-radius: 50%;
                --icon-padding: 12px;
                --badge-size: 24px;
                --transition-duration: 0.3s;
            }

            ha-card {
                height: 100%;
                padding: var(--spacing, 16px);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                background: var(--ha-card-background, var(--card-background-color, white));
            }

            .container {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--spacing, 16px);
            }

            .container.horizontal {
                flex-direction: row;
                justify-content: space-evenly;
                align-items: center;
            }

            .circle-container {
                position: relative;
                width: var(--circle-size);
                height: var(--circle-size);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            svg {
                width: 100%;
                height: 100%;
                display: block;
                transform: rotate(-90deg);
                overflow: visible;
            }

            circle {
                fill: none;
                stroke-width: var(--circle-border-width);
                stroke-linecap: round;
                transition: all var(--transition-duration) ease-in-out;
            }

            .background-circle {
                stroke: var(--disabled-text-color, #888);
                opacity: 0.2;
            }

            .progress-circle {
                transition: stroke-dashoffset var(--transition-duration) ease-in-out,
                            stroke var(--transition-duration) ease-in-out;
            }

            .progress-circle.glow {
                filter: drop-shadow(0 0 6px var(--stroke-color, currentColor));
            }

            .tick {
                stroke: var(--disabled-text-color, #888);
                stroke-width: 1px;
                opacity: 0.3;
            }

            .tick.main {
                stroke-width: 2px;
                opacity: 0.4;
            }

            .marker {
                fill: white;
                stroke-width: 2px;
                transition: all var(--transition-duration) ease-in-out;
            }

            .marker.glow {
                filter: drop-shadow(0 0 4px var(--stroke-color, currentColor));
            }

            .badge {
                position: absolute;
                top: 4px;
                left: 50%;
                transform: translateX(-50%);
                background-color: var(--badge-color, var(--success-color));
                width: var(--badge-size);
                height: var(--badge-size);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                z-index: 1;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: background-color var(--transition-duration) ease-in-out;
            }

            .badge ha-icon {
                --mdc-icon-size: calc(var(--badge-size) * 0.6);
            }

            .icon-container {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: var(--icon-container-color, rgba(var(--rgb-state-entity, 54, 95, 140), 0.05));
                border-radius: var(--icon-border-radius);
                padding: var(--icon-padding);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color var(--transition-duration) ease-in-out;
            }

            .icon-container ha-icon {
                display: flex;
                color: var(--icon-color, var(--primary-text-color));
                transition: color var(--transition-duration) ease-in-out;
            }

            .info {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                width: 100%;
                gap: 4px;
            }

            .horizontal .info {
                align-items: flex-start;
                text-align: left;
            }

            .name {
                font-size: var(--name-font-size, 14px);
                font-weight: var(--name-font-weight, 500);
                color: var(--name-color, var(--primary-text-color));
                line-height: 1.2;
                opacity: 0.9;
            }

            .state {
                font-size: var(--state-font-size, 16px);
                font-weight: var(--state-font-weight, 600);
                color: var(--state-color, var(--primary-text-color));
                line-height: 1.3;
            }

            .error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                gap: 8px;
                color: var(--error-color, var(--warning-color));
                padding: 16px;
            }
        `;
    }

    render() {
        if (!this._hass || !this.config) {
            this.shadowRoot.innerHTML = `
                <ha-card>
                    <div class="error">Loading...</div>
                </ha-card>
            `;
            return;
        }

        const stateObj = this._hass.states[this.config.entity];
        if (!stateObj) {
            this.shadowRoot.innerHTML = `
                <ha-card>
                    <div class="error">
                        Entity not found: ${this.config.entity}
                    </div>
                </ha-card>
            `;
            return;
        }

        const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;
        const value = this._computeValue(stateObj);
        const color = this._computeColor(value);
        const showBadge = this._computeShowBadge(stateObj);

        this.shadowRoot.innerHTML = `
            <style>${MushroomCircleCard.styles}</style>
            <ha-card>
                <div class="container ${this.config.layout === 'horizontal' ? 'horizontal' : ''}">
                    <div class="circle-container">
                        ${showBadge ? this._generateBadge() : ''}
                        ${this._generateSvg(value, color)}
                        ${this._generateIcon(color)}
                    </div>
                    <div class="info">
                        ${!this.config.hide_name ? `<div class="name">${name}</div>` : ''}
                        <div class="state">${value}${this._getUnitOfMeasurement(stateObj)}</div>
                    </div>
                </div>
            </ha-card>
        `;
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

    _generateSvg(value, color) {
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

        return `
            <svg width="${size}" height="${size}">
                ${this.config.show_glow ? this._generateGlowFilter() : ""}
                <circle
                    class="background-circle"
                    cx="${size/2}"
                    cy="${size/2}"
                    r="${radius}"
                />
                ${this.config.show_ticks ? this._generateTicks(radius, size) : ""}
                <circle
                    class="progress-circle ${this.config.show_glow ? 'glow' : ''}"
                    cx="${size/2}"
                    cy="${size/2}"
                    r="${radius}"
                    stroke="${color}"
                    stroke-dasharray="${circumference} ${circumference}"
                    stroke-dashoffset="${strokeDashoffset}"
                    transform="rotate(${rotateAngle} ${size/2} ${size/2}) scale(1 ${scaleY})"
                    style="--stroke-color: ${color}"
                />
                <circle 
                    class="marker ${this.config.show_glow ? 'glow' : ''}"
                    cx="${markerX}"
                    cy="${markerY}"
                    r="6"
                    stroke="${color}"
                    style="--stroke-color: ${color}"
                />
            </svg>
        `;
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

            ticks.push(`
                <line
                    class="tick ${isMainTick ? 'main' : ''}"
                    x1="${x1}"
                    y1="${y1}"
                    x2="${x2}"
                    y2="${y2}"
                />
            `);
        }
        
        return ticks.join('');
    }

    _generateBadge() {
        return `
            <div class="badge" style="--badge-color: ${this.config.badge_color}">
                <ha-icon icon="${this.config.badge_icon}"></ha-icon>
            </div>
        `;
    }

    _generateIcon(color) {
        return `
            <div class="icon-container">
                <ha-icon
                    icon="${this.config.icon}"
                    style="--mdc-icon-size: ${this._computeIconSize()}; color: ${color};"
                ></ha-icon>
            </div>
        `;
    }

    _getUnitOfMeasurement(stateObj) {
        if (stateObj.attributes.duration) return "%";
        return stateObj.attributes.unit_of_measurement || "%";
