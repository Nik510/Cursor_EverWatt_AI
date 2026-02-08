# UI Style Map (Existing Primitives to Reuse)

This document inventories the **existing** UI primitives/patterns in this repo so new UI can compose them without introducing a new styling system.

## Page container / layout patterns
- **Simple page padding**: many pages use a top-level container like `div.p-8` for spacing.
  - Example: `src/pages/RateLibrary.tsx`

## Card / section wrapper
- **`SectionCard`**: canonical “card + header + body” wrapper used in analysis-style pages.
  - Path: `src/components/SectionCard.tsx`
  - Notes: white background, rounded-xl, border, shadow-sm, internal header slot + optional right-side slot.

## Badges / status pills
- **Badge styling pattern** (pill, border, small font):
  - Path: `src/components/BatteryReasonBadges.tsx`
  - Notes: `inline-flex px-2 py-1 rounded-full border text-[11px] font-semibold` with tone-based classes.

## Tabs pattern
- **Simple tab buttons** (underline + active color):
  - Path: `src/components/ee-training/ContentBlockRenderer.tsx` (`TabsBlock`)
  - Notes: `border-b`, `border-blue-500 text-blue-600` for active, `text-gray-500 hover:text-gray-700` for inactive.

## Tables
- **Simple table container** (rounded + border + overflow-x):
  - Path: `src/components/ee-training/ContentBlockRenderer.tsx` (markdown `table` renderer)
  - Notes: `overflow-x-auto rounded-xl border border-slate-200 shadow-sm`, header row `bg-slate-50`.

## Typography / markdown rendering
- **Markdown rendering** via `react-markdown` + `remark-gfm` with explicit element mapping:
  - Path: `src/components/ee-training/ContentBlockRenderer.tsx` (`TextBlock` markdown renderer)
  - Notes: defines consistent heading/body/list/code/table styles; reuse mapping rather than inventing a new markdown style.

## API request wrapper (for UI pages)
- **`apiRequest`** fetch wrapper:
  - Path: `src/shared/api/client.ts`
  - Notes: standardizes error handling and `success=false` response detection.

