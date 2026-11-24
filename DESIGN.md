---
name: Metro Manila Business Prospecting Scanner
description: A compact research catalog for business discovery and website evidence.
colors:
  teal: "#0b665e"
  teal-hover: "#084c46"
  ink: "#243840"
  muted: "#5c7078"
  canvas: "#f3f6f6"
  field: "#fff"
  scope: "#f9fbfb"
  line: "#dce4e5"
  field-border: "#bfced1"
  nav: "#18343e"
  nav-hover: "#244650"
  nav-current: "#2b535b"
  selected: "#e5f2ef"
  focus: "#27887f"
  not-listed-bg: "#fbf0dc"
  not-listed-text: "#78531d"
  social-bg: "#f0eaf7"
  social-text: "#654887"
  existing-bg: "#e5f3eb"
  existing-text: "#216451"
  unavailable-bg: "#faebe8"
  unavailable-text: "#973d34"
  review-bg: "#f0f3f3"
  review-text: "#425b65"
typography:
  headline:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "25px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 650
  section:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 650
  body:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  prose:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 550
rounded:
  badge: "4px"
  control: "6px"
  container: "8px"
spacing:
  inline: "8px"
  compact: "12px"
  control-x: "14px"
  section: "18px"
  panel: "20px"
  mobile-page: "16px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.field}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.teal-hover}"
  button-secondary:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
  navigation:
    backgroundColor: "{colors.nav}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  badge-not-listed:
    backgroundColor: "{colors.not-listed-bg}"
    textColor: "{colors.not-listed-text}"
    rounded: "{rounded.badge}"
    padding: "4px 6px"
  container:
    backgroundColor: "{colors.field}"
    rounded: "{rounded.container}"
  selected-record:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
    padding: "14px 18px"
---

# Design System: Metro Manila Business Prospecting Scanner

## Overview

**Creative North Star: "Library catalog"**

This interface is a readable working catalog. White reading surfaces, slate navigation and restrained teal actions support repeated searching and close inspection. Compact labels and aligned record rules give evidence a consistent place without crowding the business name.

The implemented system uses borders and tonal changes for everyday structure. Selection connects a record with its evidence; website assessments remain written labels so color supplements their meaning. The chosen code-led direction is recorded in the interface brief; reference images are development material.

**Key Characteristics:**

- White reading surfaces and slate navigation.
- Teal actions and pale selected records.
- Compact Inter typography with aligned data rows.
- Explicit source, uncertainty and website status text.
- Responsive controls and a scrollable evidence panel.

## Colors

The palette combines cool paper-like neutrals with a dark slate rail and a single teal action accent. Frontmatter carries the extracted values from the shipped stylesheet.

### Primary

- **Research teal:** links, primary actions and prospect state text.
- **Deep teal:** primary-button hover.
- **Pale teal selection:** the active business row.
- **Focus teal:** a visible keyboard outline around interactive controls.

### Neutral

- **Slate ink:** business names, headings and ordinary text.
- **Muted slate:** supporting addresses, dates and explanatory copy.
- **Cool canvas:** the surrounding workspace.
- **White field:** records, evidence and form controls.
- **Cool scope:** the area and category panel.
- **Fine line:** separators and container outlines.
- **Deep slate navigation:** persistent navigation, with tonal hover and current states.

### Status colors

Warm amber marks no website listed; violet marks social media only; green marks an existing website; muted red marks unavailable websites. Neutral slate marks needs review. Each status always carries its written name.

**The Written Status Rule.** Preserve a visible status label alongside every status color.

## Typography

The self-hosted **Inter Variable** family serves headings, records and controls, with Inter and sans-serif fallbacks. The root body size is compact; longer explanatory paragraphs use the prose role. Source tag dumps use the browser's monospace preformatted text.

### Hierarchy

- **Headline:** page headings with tight tracking and a medium-heavy variable weight.
- **Title:** panel headings. Selected business names use a larger contextual title (19px) with wrapping and a 1.45 line height.
- **Section:** evidence subsections and scope headings.
- **Body:** form values and ordinary workspace text.
- **Prose:** help, source explanations and long notes; source notes stop at 75ch.
- **Label:** control captions and primary/secondary button text.

Record names use a contextual size from 11px to 14px across desktop widths, and 13px on mobile. Supporting source details are smaller. These contextual sizes describe the current dense catalog rather than a general-purpose reading scale.

**The Legible Evidence Rule.** Allow business names, domains and addresses to wrap; preserve readable line spacing in evidence and source explanations.

## Layout

Desktop has a sticky slate navigation rail (174px) and a flexible workspace with outer padding (24px). Search and compact actions sit above a joined workbench: an independently scrolling catalog (340px) beside a flexible geographic view. The workbench height is the larger of 560px and the viewport height minus 230px. List view remains available as a full-width catalog.

At 1700px and above, the catalog expands to 380px. At 1100px and below, the rail becomes 154px and catalog 300px; at 800px and below they become 72px and 270px. The intermediate icon rail retains accessible names. Scan configuration, record filters and business evidence open in separate fixed, scrollable sheets (390px) at every desktop width.

At 620px and below, navigation moves above the workspace. The geographic view comes first (420px), followed by a collapsible catalog that expands to a maximum of 600px with its own scrolling. Configuration and evidence sheets occupy the full screen and remain scrollable to their actions. Primary and secondary actions have a 44px minimum height on this viewport.

## Elevation & Depth

Most resting surfaces are flat. Fine rules separate scope, records, evidence and row content; tonal backgrounds identify selection and navigation state.

### Shadow Vocabulary

- **Export menu:** a diffuse overlay shadow (`0 7px 22px #193e432b`) separates the export menu from records.
- **Configuration/evidence sheet:** a soft side shadow (`-15px 0 50px #18343e26`) separates desktop sheets from a translucent slate backdrop. Mobile sheets have no side shadow.
- **Map controls:** light diffuse shadows separate controls and temporary feedback from the geographic ground.

**The Flat Workspace Rule.** Use borders and tonal backgrounds for resting catalog sections; reserve the existing shadows for overlays.

## Shapes

Controls have gently curved corners, badges have smaller corners, and workbench/full-panel containers have a slightly larger radius. Thin borders and horizontal record rules establish structure. Status dots are circular and inherit the written label's color. Outline SVG icons accompany controls without replacing their accessible names.

## Components

### Buttons

Primary actions use research teal with white text and the deeper teal hover. Secondary actions use white with a fine border (`#c6d3d5`) and a pale hover. Both share compact padding and the control radius. Disabled buttons reduce opacity and expose the disabled cursor. All keyboard focus uses the same visible outline (3px, offset 3px).

### Inputs / Fields

White controls use the field border, the control radius and balanced inset padding. Search adds an inset outline icon and a pale background. Labels remain visible above the controls. Text areas resize vertically and use a 1.6 line height. Long input content is not used as a substitute for supporting evidence text.

### Navigation

Deep slate anchors the navigation. Current and hover states use distinct lighter slate tones with white text. Icons are stroked SVGs; each destination keeps an explicit accessible name when its visible text disappears on intermediate screen widths.

### Chips

Website status labels use a small rectangular badge with a tonal background and matching text. The dot is decorative reinforcement. The neutral needs-review badge is the baseline; missing source data keeps the specific “No website listed” label.

### Cards / Containers

Workbench and full panels use white fields, fine outlines and the container radius. The scope panel has a slightly cooler background. These are working containers, with section separators and content-driven height.

### Selected record and evidence

Selecting a record paints its row with pale teal and synchronizes business evidence and the map. Evidence includes identity, website observation, public contacts, source-listed social profiles, prospect editing and source tags in separated sections. Social links use pale neutral fields, teal platform names and wrapping account paths; source provenance appears in the link title and source-listed wording. Every viewport uses a scrollable sheet with an explicit close control, focus containment, Escape and focus restoration. Unsaved prospect drafts survive record switching and reopening.

The geographic view clusters matching records independently of list pagination. Cluster counts use DOM labels while business points use MapLibre layers; overlapping coordinates reveal a short choice list. Teal selection remains visible. Fit results and visible-area filtering are explicit controls. Street tiles load on request. Source attribution, completeness and missing-coordinate counts remain written below the map.

While a filtered query loads, realistic row skeletons replace the prior list and a spinner accompanies search. Map startup, map updates, uncached evidence and each pending action have distinct feedback. Skeletons pulse gently; no artificial delay or invented scan percentage is used.

The selected record title reveals through a short clipping animation (0.18s, `cubic-bezier(.16,1,.3,1)`). Progress icons rotate over one second. Reduced-motion preference disables animations and transitions.

## Do's and Don'ts

### Do:

- **Do** use teal for actions and pale teal for selected records.
- **Do** keep status and source meaning in visible text.
- **Do** preserve shared focus outlines and accessible navigation names.
- **Do** let long evidence wrap and keep the mobile editor reachable by scrolling.
- **Do** show loading when the displayed query scope changes.

### Don't:

- **Don't** use status color as the sole explanation of website evidence.
- **Don't** apply overlay shadows to ordinary catalog rows.
- **Don't** hide essential evidence or save controls behind a fixed-height panel.
- **Don't** show stale records or export actions as results of a newly selected filter.
