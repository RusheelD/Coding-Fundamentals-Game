# Code Quest – Block Coding Game

A Karel-style block-coding game where you drag-and-drop programming blocks to guide a character through levels. Built for GitHub Pages.

## Play

Visit the live site (once GitHub Pages is enabled) or open `docs/index.html` locally.

## Features

- **10 progressive levels** – from basic movement to mazes with loops and conditionals
- **Drag-and-drop blocks** – Move Forward, Turn, Repeat, While, If Wall, Pick Up, Paint
- **Star rating** – earn up to 3 stars per level by using fewer blocks
- **Progress saved** in localStorage
- **Step-through mode** for debugging your program one action at a time

## Project Structure

```text
docs/
├── index.html          # Main page
├── css/style.css       # Styles
└── js/
    ├── levels.js       # Level definitions & constants
    ├── engine.js       # Game state & execution engine
    ├── blocks.js       # Drag-and-drop block system
    ├── renderer.js     # Canvas rendering
    └── app.js          # Wiring & UI logic
```
