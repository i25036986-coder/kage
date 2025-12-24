# Design Guidelines for Desktop-Grade Media Container UI

## Design Approach
**System-Based**: Material Design principles for data-heavy, content-rich application with emphasis on clarity, hierarchy, and purposeful interactions.

## Core Design Principles

### Honesty & Transparency
- UI must always explain **WHY** something is unavailable, never vague "Unavailable" messages
- State visibility over convenience
- Show real state, not placeholders or loading patterns

### User Control
- No automatic actions without explicit user trigger
- All deeper processing requires user initiation
- Clear action triggers with visible results

---

## Layout System

### Global Structure
```
┌─────────────────────────────────────────────┐
│ Top Bar (Status & Info)                     │
├──────────┬──────────────────────────────────┤
│ Sidebar  │ Main Content Area                │
│          │ (Containers/Folder/Detail Views) │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### Spacing System
Use Tailwind spacing units: **2, 4, 6, 8, 12, 16** (as in p-2, m-4, gap-6, etc.)
- Tight spacing: 2-4 units (within components)
- Medium spacing: 6-8 units (between sections)
- Large spacing: 12-16 units (major separations)

### 3-Pane Folder View Layout
```
┌─────────┬──────────────┬─────────────┐
│ 20%     │ 50%          │ 30%         │
│ Folder  │ File Grid    │ File Detail │
│ Tree    │              │ Panel       │
└─────────┴──────────────┴─────────────┘
```

---

## Typography

**Primary Font**: Inter (Google Fonts)
**Monospace**: JetBrains Mono (for URLs, file paths)

### Hierarchy
- Page Titles: text-2xl font-semibold
- Section Headers: text-lg font-medium
- Card Titles: text-base font-medium
- Body Text: text-sm font-normal
- Metadata/Labels: text-xs font-normal text-gray-600
- Status Messages: text-sm font-medium (color varies by state)

---

## Component Library

### Virtual Container Card
**State 1: Basic Information**
- Large thumbnail area (16:9 ratio)
- Title/URL name (truncate with ellipsis)
- Type badge (Single file / Multiple files / Folder)
- Status indicator: "Basic information available"
- Subtle border, rounded corners (rounded-lg)
- Hover: subtle elevation shadow

**State 2: Expanded**
- Transforms into Folder View or File Grid
- Maintains same container ID visually

### File Card (Grid Item)
- Square thumbnail (1:1 ratio)
- Type icon badge (top-right corner)
- Size/duration badge (bottom-right, semi-transparent background)
- File name (1-line truncate below thumbnail)
- Selection state: border highlight
- Spacing: gap-4 in grid

### Status Indicators
**Active/Valid**: Green dot + text
**Expired**: Red dot + explanatory text
**Partial**: Orange dot + text
**Unknown**: Gray dot + text

Use dot-text combination consistently across all status displays.

### Breadcrumb Navigation
```
Root / Folder / Subfolder
```
- text-sm with separators
- Current level: font-medium
- Previous levels: clickable, text-gray-600
- Max 3 visible levels, collapse deeper with "..."

### File Detail Panel

**Section Order:**
1. Preview Area (top, largest)
2. Metadata (organized list)
3. Expiry Information (prominent, read-only)
4. Actions (button group)

**Preview Sizing:**
- Images: max-h-96, object-contain
- Video player: 16:9 aspect ratio
- Disabled state: semi-transparent overlay with icon

**Metadata Layout:**
- Label: value pairs
- Labels: text-xs text-gray-600
- Values: text-sm font-medium

**Expiry Information Box:**
- Distinct background (subtle gray)
- Padding: p-4
- Rounded: rounded-md
- Always visible when applicable
- Never inline - separate section

### Action Buttons

**Primary Actions**: Solid background
- ▶ Play
- ⬇ Download

**Secondary Actions**: Outline style
- 🖼 Change Thumbnail
- 💾 Save Thumbnail Locally

**Tertiary Actions**: Text style
- 🔐 Vault Lock/Unlock

**Disabled State:**
- Reduced opacity
- Not clickable
- Tooltip/text explanation below button group

### Thumbnail Picker Interface
```
┌─────────────────────┐
│ Active Preview      │
│ (Large Display)     │
└─────────────────────┘

Candidates:
┌────┐ ┌────┐ ┌────┐
│ 1  │ │ 2  │ │ 3  │
└────┘ └────┘ └────┘
Working Failed Unknown

Actions:
[Set Active] [Replace URL] [Mark Broken] [Save Locally]
```

### Folder Tree (Left Pane)
- Nested list with indent levels
- Expand/collapse icons (chevron-right/chevron-down)
- Folder icons
- Active folder: subtle background highlight
- Max visible depth: 3 levels

### Modal Overlays
**Image Viewer:**
- Full viewport black background
- Controls: minimal, bottom-aligned
- Navigation arrows: left/right edges
- Top-right: close (X) and action toolbar
- ESC key support

**Vault Lock Overlay:**
- Blur effect on thumbnails
- Dark semi-transparent overlay
- Centered unlock prompt
- No animations - instant state change

---

## Visual States

### Loading States
- Skeleton screens for containers/files
- Subtle pulse animation
- Never show spinners for content that may not load

### Error States
- Clear error message with reason
- Suggested action (if applicable)
- Muted visual treatment (not alarming red everywhere)

### Empty States
- Centered icon + message
- Suggested next action
- Never leave blank space without explanation

### Panic Mode
- Instant blur (no fade)
- All media stopped
- High contrast lock icon
- Minimal UI shown

---

## Interaction Patterns

### Click Behaviors
- Single click: Select
- Double click: Play/Open
- Right click: Context menu (optional)

### Hover States
- Cards: subtle elevation
- Buttons: background darken/lighten
- Tree items: background highlight

### Focus States
- Keyboard navigation support
- Visible focus rings (ring-2 ring-blue-500)
- Tab order: logical top-to-bottom, left-to-right

---

## Settings Panel

### Layout
- Left sidebar: category list
- Right content: settings for selected category

### Thumbnail Settings Section
```
Save Thumbnails Locally
├─ [ ] Only if remote fails
└─ [ ] Always prefer local

(Checkbox + explanatory text below)
```

### Vault Settings Section
```
Unlock Duration
● 30 minutes (default)
○ Until manually locked
○ Custom: [input] minutes
```

---

## Color Guidance (Structure Only)
- Primary actions: Bold, saturated
- Secondary actions: Medium saturation
- Backgrounds: Subtle, low contrast
- Status colors: Green (valid), Orange (partial), Red (expired), Gray (unknown)
- Focus: Blue accent

---

## Key UI Messages

Always use format: **State — Reason**

Examples:
- "Folder contents hidden — authentication required"
- "Playback disabled — download link expired"
- "Thumbnail unavailable — choose another or save locally"
- "Files not listed yet — unlock container to view"

---

## Critical Don'ts
- ❌ No auto-refresh indicators
- ❌ No retry buttons (user re-authenticates instead)
- ❌ No automatic expansions
- ❌ No vague loading states
- ❌ No silent failures