class MushroomCircleCard extends HTMLElement {
  constructor() {
    super();
  }

  setConfig(config) {
    this.innerHTML = `
      <ha-card>
        <div style="padding: 16px;">
          <div>Test Card Working</div>
          <div>Entity: ${config.entity || 'none'}</div>
        </div>
      </ha-card>
    `;
  }

  set hass(hass) {
    // Basic hass update
  }
}

customElements.define("mushroom-circle-card", MushroomCircleCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mushroom-circle-card",
  name: "Mushroom Circle Card",
  description: "A circular progress card with Mushroom styling"
});