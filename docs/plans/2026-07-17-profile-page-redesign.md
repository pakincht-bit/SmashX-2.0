# Profile Page Redesign

## Goal
Redesign the SmashX player profile into a hybrid identity card with on-page activity and frame achievements, using Wabi/Tonal layout references while staying in the SmashX esports aesthetic.

## Layout (top → bottom)
1. Sticky header: back + "Player Profile"
2. Identity row: avatar (left) + name/rank/pts + settings gear next to name (right)
3. Stats strip: Played / W-L / Win Rate + thin next-tier progress bar
4. Activity: current-month calendar heatmap only (green/red/neutral by pts)
5. Frames: 2-column achievement grid (unlocked + locked)
6. Logout button

## Data
- Activity: fetch sessions for current month containing the user; build day → {count, pts} map
- Frames: rank tiers by points + cosmetic frames; locked frames shown grayscale with unlock hint
- Day tap: bottom sheet listing that day's sessions → `onSessionClick`
- Frame tap (unlocked): open settings to equip; locked: haptic only / no action

## Out of scope
- Multi-month activity history (full Activity Log modal remains elsewhere)
- Inline frame equip without settings
- Battle History session list on profile
