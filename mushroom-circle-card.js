class MushroomCircleCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
        this.config = config;
        if (!config.entity) {
            throw new Error("Please define an entity");
        }
    }

    set hass(hass) {
        this._hass = hass;
        this.render();
    }

    _testCondition(stateObj) {
        console.log('Testing condition:', this.config.badge_condition);
        console.log('Current states:', this._hass.states);
        
        if (!this.config.show_badge) return false;
        if (!this.config.badge_condition) return true;

        try {
            const result = Function('states', 'state', 
                `return ${this.config.badge_condition}`
            )(this._hass.states, stateObj.state);
            
            console.log('Condition result:', result);
            return result;
        } catch (e) {
            console.error('Condition error:', e);
            return false;
        }
    }

    render() {
        if (!this._hass || !this.config) return;

        const stateObj = this._hass.states[this.config.entity];
        if (!stateObj) {
            this.shadowRoot.innerHTML = '<div>Entity not found</div>';
            return;
        }

        const showBadge = this._testCondition(stateObj);
        
        this.shadowRoot.innerHTML = `
            <ha-card>
                <div style="padding: 16px; text-align: center;">
                    <div style="margin-bottom: 16px;">
                        <ha-icon 
                            icon="${this.config.icon || 'mdi:battery'}"
                            style="--mdc-icon-size: 24px; color: var(--primary-color); display: block; margin: 0 auto;">
                        </ha-icon>
                    </div>
                    
                    ${showBadge ? `
                        <div style="
                            position: absolute;
                            top: 8px;
                            right: 8px;
                            background: var(--primary-color);
                            border-radius: 50%;
                            width: 24px;
                            height: 24px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <ha-icon 
                                icon="${this.config.badge_icon || 'mdi:alert'}"
                                style="--mdc-icon-size: 16px; color: white;">
                            </ha-icon>
                        </div>
                    ` : ''}
                    
                    <div style="font-size: 16px;">
                        ${stateObj.state}
                    </div>
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
    description: "Test version for icon and conditions"
});
