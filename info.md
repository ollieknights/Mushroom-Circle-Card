# Mushroom Circle Card

A circular progress timer card with Mushroom design for Home Assistant.

## Features
- Progress indicator starting from 12 o'clock
- Direction options: clockwise or counter-clockwise
- Color conditions based on remaining time
- Layout grid compatibility
- Tick marks with inside/outside options

## Usage

### Basic Setup
```yaml
type: custom:mushroom-circle-card
entity: timer.thermostat_boost
icon: phu:hive
direction: counter-clockwise
guess_mode: true
