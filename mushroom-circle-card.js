class MushroomCircleCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._lastKnownState = null;
        this._lastStateChange = null;
        this._guessedDuration = null;
        this._updateTimer = null;
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
            hide_icon: false,
            hide_state: false,
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

    // ... (previous methods remain the same until render())

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
        const progressPath = this._computeProgressPath(radius, value, this.config.direction);
        const color = this._computeColor(stateObj, value);
        const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;

        // Calculate scale based on layout dimensions
        const scale = Math.min(
            this.config?.layout?.width || 1,
            this.config?.layout?.height || 1
        );

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
                        min-height: ${50 * scale}px;
                    }
                    .circle-container {
                        position: relative;
                        width: ${100 * scale}px;
                        height: ${100 * scale}px;
                        min-height: ${100 * scale}px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto;
                    }
                    /* ... (rest of styles remain the same) ... */
                </style>

                <div class="container">
                    <div class="circle-container">
                        <svg viewBox="-50 -50 100 100">
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
                            ${!this.config.hide_icon && this.config.icon ? 
                                `<ha-icon icon="${this.config.icon}"></ha-icon>` : ''}
                            ${!this.config.hide_state ? 
                                `<div class="info">${this._formatState(stateObj)}</div>` : ''}
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
