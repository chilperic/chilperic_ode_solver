# V71.37 — Header restore, analysis layout unclipping, Statistics next-step starter

## Purpose
Restore the static site header after the overly aggressive chrome attempt and make the analysis cockpit stop cutting the third panel on normal desktop widths.

## Changes
- Forces the existing static `.foko-ide-topbar` to remain visible on Data/Analysis pages.
- Hides old platform workflow/import ribbon only on Data/Analysis cockpit pages to avoid crowding.
- Uses a safer two-column plot workspace by default: primary + diagnostic on top, third analysis below.
- Allows three plot columns only on genuinely wide screens.
- Prevents plot header dropdown clipping through min-width/overflow guards.
- Keeps the working V71.35 cockpit instead of generated chrome.

## Limit
This is a stabilization step. It does not yet complete the full Statistics scientific-honesty release.
