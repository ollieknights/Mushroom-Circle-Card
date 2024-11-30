# Mushroom Circle Card

A customizable circular progress card for Home Assistant with Mushroom Card styling. Perfect for displaying battery levels, timers, sensors, and more.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)

<p align="center">
  <img src="https://raw.githubusercontent.com/ollieknights/mushroom-circle-card/main/examples/preview.png" alt="Mushroom Circle Card Preview">
</p>

## Features
- Circular progress indicator
- Optional tick marks
- Optional glowing ring effect
- Conditional status badge
- Progress end marker
- Mushroom card styling
- Light/Dark theme support
- Value-based color changes

## Prerequisites
- Home Assistant 2023.11.0 or newer
- [Mushroom Cards](https://github.com/piitaya/lovelace-mushroom) installed
- [HACS](https://hacs.xyz/) installed

## Installation

1. Add this repository to HACS:
    - Go to HACS > Frontend
    - Click the menu (⋮) > Custom repositories
    - Add URL: `https://github.com/ollieknights/mushroom-circle-card`
    - Category: Lovelace
2. Install "Mushroom Circle Card" from HACS
3. Refresh your browser

## Usage Examples

### Battery Level
```yaml
type: custom:mushroom-circle-card
entity: sensor.phone_battery
icon: mdi:battery
show_ticks: false
show_glow: true
icon_size: large
icon_color: >
  [[[
    if (state < 20) return 'rgb(var(--rgb-state-error))';
    if (state < 50) return 'rgb(var(--rgb-state-warning))';
    return 'rgb(var(--rgb-state-success))';
  ]]]
show_badge: true
badge_icon: mdi:lightning-bolt
badge_color: 'rgb(var(--rgb-state-success))'
badge_condition: "state == 'charging'"
```

### Timer
```yaml
type: custom:mushroom-circle-card
entity: timer.laundry
icon: mdi:washing-machine
show_ticks: true
show_glow: false
icon_color: 'rgb(var(--rgb-state-entity))'
show_badge: true
badge_icon: mdi:pause
badge_condition: "state == 'active'"
```

### CPU Temperature
```yaml
type: custom:mushroom-circle-card
entity: sensor.cpu_temperature
icon: mdi:cpu
show_ticks: false
show_glow: true
icon_size: large
icon_color: >
  [[[
    if (state > 80) return 'rgb(var(--rgb-state-error))';
    if (state > 60) return 'rgb(var(--rgb-state-warning))';
    return 'rgb(var(--rgb-state-success))';
  ]]]
show_badge: true
badge_icon: mdi:alert
badge_color: 'rgb(var(--rgb-state-error))'
badge_condition: "state > 80"
```

### Storage Space
```yaml
type: custom:mushroom-circle-card
entity: sensor.disk_use_percent
icon: mdi:harddisk
show_ticks: true
show_glow: true
icon_color: >
  [[[
    if (state > 90) return 'rgb(var(--rgb-state-error))';
    if (state > 75) return 'rgb(var(--rgb-state-warning))';
    return 'rgb(var(--rgb-state-success))';
  ]]]
```

## Configuration Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| entity | string | Required | Entity ID |
| icon | string | mdi:circle | MDI icon to display |
| icon_size | string | default | Icon size: 'small', 'default', 'large', 'custom' |
| icon_custom_size | string | 24px | Custom icon size when icon_size is 'custom' |
| icon_color | string | auto | Icon color (supports HA color variables) |
| show_ticks | boolean | false | Show tick marks around circle |
| show_glow | boolean | false | Enable glowing effect on progress ring |
| show_badge | boolean | false | Show status badge |
| badge_icon | string | - | MDI icon for badge |
| badge_color | string | - | Badge background color |
| badge_condition | string | - | Condition for showing badge |
| layout | string | vertical | Card layout: 'vertical' or 'horizontal' |
| fill_container | boolean | false | Make card fill container width |
| hide_name | boolean | false | Hide the entity name |

## Theme Variables
The card respects the following Home Assistant theme variables:
- `--rgb-state-entity`
- `--rgb-state-error`
- `--rgb-state-warning`
- `--rgb-state-success`
- All Mushroom card variables

## Contributing
Feel free to submit issues and pull requests.

## License
This project is under the MIT License. See the LICENSE file for details.

## Credits
- Inspired by [Mushroom Cards](https://github.com/piitaya/lovelace-mushroom)
- Built for Home Assistant
