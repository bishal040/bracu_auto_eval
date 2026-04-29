# BRACU Auto Evaluator - Chrome Extension

A Chrome extension that automatically completes BRAC University course evaluations with a single click.

## ⚡ Features

- **One-click evaluation** for all courses at once
- **Customizable rating** (1-5) — choose the score for all questions
- **Speed control** — Fast, Normal, or Slow automation
- **Progress tracking** — Real-time progress bar in the popup
- **Beautiful UI** — Premium dark-themed interface
- **Floating indicator** — Shows ⚡ on the evaluation page

## 📦 Installation

### Step 1: Open Chrome Extensions
1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar and press Enter

### Step 2: Enable Developer Mode
1. Toggle **"Developer mode"** switch in the top-right corner

### Step 3: Load the Extension
1. Click **"Load unpacked"** button (top-left)
2. Navigate to and select the `bracu-auto-eval` folder:
   ```
   ~/Desktop/BracuEvaluation/bracu-auto-eval/
   ```
3. The extension will appear in your extensions list

### Step 4: Pin the Extension
1. Click the puzzle piece icon 🧩 in Chrome toolbar
2. Find **"BRACU Auto Evaluator"** and click the pin 📌 icon

## 🚀 Usage

1. Go to [courseevaluation.bracu.ac.bd](https://courseevaluation.bracu.ac.bd/)
2. Log in with your BRACU Google account
3. Click the ⚡ extension icon in your toolbar
4. Choose your **rating** (1-5) and **speed**
5. Click **"Auto Evaluate All Courses"**
6. Sit back and watch! 🎉

## ⚙️ Options

| Option | Description |
|--------|-------------|
| Rating 1 😠 | Strongly Disagree |
| Rating 2 😟 | Disagree |
| Rating 3 😐 | Neutral |
| Rating 4 🙂 | Agree |
| Rating 5 😊 | Strongly Agree |
| ⚡ Fast | 300ms between steps |
| 🚀 Normal | 600ms between steps |
| 🐢 Slow | 1200ms between steps |

## 📁 Files

```
bracu-auto-eval/
├── manifest.json      # Extension configuration
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── content.js         # Core automation script
├── content.css        # Page-injected styles
├── icons/
│   ├── icon16.png     # 16x16 icon
│   ├── icon48.png     # 48x48 icon
│   └── icon128.png    # 128x128 icon
└── README.md          # This file
```

## ⚠️ Disclaimer

This extension is for personal use only. Use responsibly.
