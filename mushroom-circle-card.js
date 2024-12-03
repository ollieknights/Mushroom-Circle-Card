if (!customElements.get("mushroom-circle-card")) {
    class MushroomCircleCard extends HTMLElement {
        // Keep constructor, callbacks, and helper methods the same
        
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
            const radius = 40 - (strokeWidth / 2);
            const progressPath = this._computeProgressPath(radius, value, this.config.direction);
            const color = this._computeColor(stateObj, value);
            const name = this.config.name || stateObj.attributes.friendly_name || this.config.entity;

            this.shadowRoot.innerHTML = `
                <ha-card>
                    <style>
                        ha-card {
                            box-sizing: border-box;
                            padding: 8px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            background: var(--ha-card-background, var(--card-background-color, white));
                            border-radius: var(--ha-card-border-radius, 12px);
                            box-shadow: var(--ha-card-box-shadow, none);
                            width: ${this.config?.layout?.width ? this.config.layout.width * 50 + 'px' : '100px'};
                            height: ${this.config?.layout?.height ? this.config.layout.height * 50 + 'px' : '100px'};
                        }
                        .container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            width: 100%;
                            height: 100%;
                            max-width: 200px;
                            max-height: 200px;
                            aspect-ratio: 1;
                        }
                        .circle-container {
                            position: relative;
                            width: 80%;
                            padding-bottom: 80%;
                            height: 0;
                        }
                        svg {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
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
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
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
                            margin-top: 4px;
                        }
                    </style>

                    <div class="container">
                        <div class="circle-container">
                            <svg viewBox="-45 -45 90 90" preserveAspectRatio="xMidYMid meet">
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
