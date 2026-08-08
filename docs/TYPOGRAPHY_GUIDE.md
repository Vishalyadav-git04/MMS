# Application Typography & Font Size Control Guide

This guide provides a single reference document explaining how to change font sizes across **every single UI element** in the MMS application whenever client requirements or design specifications change.

---

## Quick Reference Summary Table

| UI Area / Element | Target File | CSS Selector / Class | Current Font Size |
| :--- | :--- | :--- | :--- |
| **Form Inputs & Selects** | `src/mms.css` | `.mms-form input, .mms-form select` | `14.5px` (36px height) |
| **Form Field Labels** | `src/mms.css` | `.mms-form label, .mms-form-row > label` | `13.5px` font-semibold |
| **Table Data Cells** | `src/mms.css` | `.mms-panel table td, .mms-form table td` | `15.5px` |
| **Table Header Cells** | `src/mms.css` | `.mms-panel table th, .mms-form table th` | `14.5px` font-bold |
| **Standalone Search Inputs** | `src/mms.css` | `.mms-panel input, [role="combobox"]` | `15.5px` (38px height) |
| **Dropdown Option Items** | `src/mms.css` | `[role="option"]` | `15.5px` |
| **Action & Footer Buttons** | `src/mms.css` | `.mms-panel button, .mms-panel__foot button` | `15px` font-semibold |
| **Page Main Title** | `src/mms.css` | `.mms-page-header h1, .mms-page-header__title` | `27px` font-bold |
| **Page Subtitle** | `src/mms.css` | `.mms-page-header__subtitle` | `15px` font-medium |
| **Sub-Module Card Title** | `src/mms.css` | `.mms-tile__title` | `17px` font-bold |
| **Sub-Module Card Description** | `src/mms.css` | `.mms-tile__desc` | `14.5px` |
| **Sidebar Module Links** | `src/components/layout/SectionNav.tsx` | `mms-sidebar-item` | `14.5px` font-semibold |
| **Sidebar Screen Links** | `src/components/layout/SectionNav.tsx` | `mms-sidebar-subitem` | `13.5px` font-semibold |
| **Breadcrumbs Trail** | `src/components/AppLayout.tsx` | `.mms-breadcrumb` | `14.5px` font-semibold |
| **Top Banner Title** | `src/components/AppLayout.tsx` | `<h1 className="...">` | `18px` font-bold |

---

## 1. Global Forms, Tables & Panels (`frontend/src/mms.css`)

All form fields, table columns, labels, placeholders, and action buttons are controlled centrally in `src/mms.css`:

### A. Side-by-Side Forms (Add Eqpt, Capture MLCCS, etc.)
Edit lines 242–295 in `src/mms.css`:

```css
/* Form Input & Dropdown Sizing */
.mms-form input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
.mms-form select,
.mms-form [data-slot="select-trigger"],
.mms-form button[role="combobox"] {
  height: 36px !important;            /* CHANGE INPUT BOX HEIGHT HERE */
  font-size: 14.5px !important;        /* CHANGE TYPED INPUT FONT SIZE HERE */
}

/* Form Input Placeholders */
.mms-form input::placeholder,
.mms-form textarea::placeholder {
  font-size: 14px !important;          /* CHANGE PLACEHOLDER FONT SIZE HERE */
}

/* Form Field Labels */
.mms-form label,
.mms-form .mms-form__label,
.mms-form-row > label {
  font-size: 13.5px !important;        /* CHANGE LABEL FONT SIZE HERE */
  font-weight: 600 !important;
}
```

### B. Table Headers & Data Rows
Edit lines 359–382 in `src/mms.css`:

```css
/* Table Column Headers */
.mms-panel table th,
.mms-form table th {
  font-size: 14.5px !important;        /* CHANGE TABLE HEADER FONT SIZE HERE */
  font-weight: 700;
}

/* Table Data Cells */
.mms-panel table td,
.mms-form table td {
  font-size: 15.5px !important;        /* CHANGE TABLE ROW FONT SIZE HERE */
}
```

### C. Standalone Panels & Filter Dropdowns (View MLCCS)
Edit lines 384–425 in `src/mms.css`:

```css
/* Standalone Search Bars & Textareas */
.mms-panel input,
.mms-panel textarea {
  font-size: 15.5px !important;
  min-height: 38px !important;
}

/* Dropdown Option Menus */
[role="option"] {
  font-size: 15.5px !important;        /* CHANGE DROPDOWN OPTIONS FONT SIZE HERE */
}

/* Footer & Action Buttons */
.mms-panel button,
.mms-panel__foot button {
  font-size: 15px !important;          /* CHANGE BUTTON FONT SIZE HERE */
  font-weight: 600;
}
```

---

## 2. Page Titles, Subtitles & Module Cards (`frontend/src/mms.css`)

Page headings and module overview cards are controlled in `src/mms.css`:

### A. Page Headers
Edit lines 92–125 in `src/mms.css`:

```css
.mms-page-header__eyebrow {
  font-size: 13px !important;          /* "OVERVIEW" / Section Eyebrow */
}

.mms-page-header h1,
.mms-page-header__title {
  font-size: 27px !important;          /* Main Screen Title (e.g. Reports) */
}

.mms-page-header__subtitle {
  font-size: 15px !important;          /* Screen Subtitle */
}
```

### B. Sub-Module Overview Cards / Tiles
Edit lines 600–615 in `src/mms.css`:

```css
.mms-tile__title {
  font-size: 17px !important;          /* Card Title (e.g. ALL INDIA HOLDING) */
}

.mms-tile__desc {
  font-size: 14.5px !important;        /* Card Description Text */
}
```

---

## 3. Sidebar Navigation (`frontend/src/components/layout/SectionNav.tsx`)

Sidebar labels and links are styled in `src/components/layout/SectionNav.tsx`:

- **Navigation Header ("NAVIGATION")**: Line 78 → `text-[13.5px] font-bold`
- **Section Headers ("MODULES", "WEAPON SCREENS")**: Lines 108, 159 → `text-[12px] font-bold`
- **Main Modules ("Dashboard", "Weapon", "IT Asset")**: Line 126 → `text-[14.5px] font-semibold`
- **Search Screens Input**: Line 173 → `text-[13.5px] placeholder:text-[13.5px]`
- **Screen Links ("MLCCS", "Unit Holding", etc.)**: Line 194 → `text-[13.5px] font-semibold`

---

## 4. Top Banner & Breadcrumb Trail (`frontend/src/components/AppLayout.tsx`)

Header banner elements are styled in `src/components/AppLayout.tsx`:

- **Main Banner Title ("MANAGEMENT INFORMATION SYSTEM ORGANISATION")**: Line 141 → `text-base sm:text-[18px] font-bold`
- **Banner Subtitle ("MISO · Version 5.0")**: Line 144 → `text-[13.5px]`
- **Emblem Title ("Indian Army / भारतीय सेना")**: Lines 131, 134 → `text-[12.5px] font-bold` / `text-[13.5px] font-semibold`
- **Clock & Date Display**: Line 204 → `text-[13.5px]`
- **User Role Badge & Logout Button**: Lines 216, 224 → `text-[13.5px] font-semibold`
- **Breadcrumbs Path ("Home / Weapon / Reports")**: Line 232 → `text-[14.5px] font-semibold`

---

## 5. UI Primitives Defaults (`frontend/src/components/ui/`)

Default Tailwind classes on shared primitives can be edited if needed:

- **`Input` (`src/components/ui/input.tsx`)**: Line 11 → `text-[15.5px] placeholder:text-[15.5px]`
- **`Select` (`src/components/ui/select.tsx`)**: Line 22 → `text-[15.5px]` (Trigger) and Line 114 → `text-[15.5px]` (Item)
- **`Label` (`src/components/ui/label.tsx`)**: Line 10 → `text-[14.5px] font-semibold`

---

## How to Apply a Global Scaling Adjustment

If a client asks to make **everything larger** or **everything smaller** across the entire application by 1px or 2px, simply update the `font-size` properties in `src/mms.css` following the sections above!
