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
            show_glow: true,
            direction: "counter-clockwise",
            size: 150
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
        const radius = (size / 2) - 20;
        const circumference = 2 * Math.PI * radius;
        const progress = value / 100;
        const strokeDashoffset = circumference * (1 - progress);
        
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
                        stroke-width: 8;
                        stroke-linecap: round;
                        transition: stroke-dashoffset 0.3s ease;
                    }
                    .background {
                        stroke: var(--disabled-text-color);
                        opacity: 0.2;
                    }
                    .progress {
                        stroke: var(--primary-color);
                    }
                    .name {
                        font-size: 16px;
                        font-weight: 500;
                        margin-top: 8px;
                        color: var(--primary-text-color);
                    }
                    .value {
                        font-size: 22px;
                        font-weight: bold;
                        margin-top: 4px;
                        color: var(--primary-text-color);
                    }
                </style>
                <div class="container">
                    <div class="circle-container">
                        <svg width="${size}" height="${size}">
                            <circle
                                class="background"
                                cx="${size/2}"
                                cy="${size/2}"
                                r="${radius}"
                            />
                            <circle
                                class="progress"
                                cx="${size/2}"
                                cy="${size/2}"
                                r="${radius}"
                                stroke-dasharray="${circumference} ${circumference}"
                                stroke-dashoffset="${strokeDashoffset}"
                            />
                        </svg>
                    </div>
                    <div class="name">${name}</div>
                    <div class="value">${value}%</div>
                </div>
            </ha-card>
        `;
    }

    _computeValue(stateObj) {
        const value = parseFloat(stateObj.state);
        return isNaN(value) ? 0 : Math.round(Math.min(Math.max(value, 0), 100));
    }
}

customElements.define("mushroom-circle-card", MushroomCircleCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mushroom-circle-card",
    name: "Mushroom Circle Card",
    description: "A circular progress card with Mushroom styling"
});
