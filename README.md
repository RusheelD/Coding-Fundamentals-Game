# Code Quest – Block Coding Game

A Karel-style block-coding game where you drag-and-drop programming blocks to guide a character through levels. Built for GitHub Pages.

## Play

Visit the live site (once GitHub Pages is enabled) or open `pages/index.html` locally.

## Features

- **10 progressive levels** – from basic movement to mazes with loops and conditionals
- **Drag-and-drop blocks** – Move Forward, Turn, Repeat, While, If Wall, Pick Up, Paint
- **Star rating** – earn up to 3 stars per level by using fewer blocks
- **Progress saved** in localStorage
- **Step-through mode** for debugging your program one action at a time

## GitHub Pages Setup

1. Go to **Settings → Pages** in this repository
2. Set **Source** to `Deploy from a branch`
3. Set **Branch** to `main` and **folder** to `/pages`
4. Save — your site will be live at `https://<user>.github.io/Coding-Fundamentals-Game/`

## Project Structure

```text
pages/
├── index.html          # Main page
├── css/style.css       # Styles
└── js/
    ├── levels.js       # Level definitions & constants
    ├── engine.js       # Game state & execution engine
    ├── blocks.js       # Drag-and-drop block system
    ├── renderer.js     # Canvas rendering
    └── app.js          # Wiring & UI logic
```
