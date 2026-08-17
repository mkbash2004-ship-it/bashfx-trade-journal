# Project TODO

- [x] Create a dark BashFX dashboard layout with responsive navigation and branded visual tokens.
- [x] Add secure database models for uploaded documents, extracted trades, and generated weekly summaries.
- [x] Add authenticated S3 upload workflow for JPG, PNG, and PDF trade-result files.
- [x] Add server-side vision AI extraction of pair, direction, entry, exit, P&L, pips, and result from uploads.
- [x] Build an editable trade-review table with validation and save/correction support.
- [x] Build the weekly trade log grouped by trading day with win, loss, and breakeven indicators.
- [x] Add the current-week dashboard metrics for total trades, win rate, and pips/profit.
- [x] Add server-side AI weekly-summary image generation using the BashFX reference layout and brand palette.
- [x] Add generated-summary preview, historical access, and PNG download/export.
- [x] Add automated tests for trade math and extraction normalization.
- [x] Verify desktop and mobile UI rendering, type checks, and core flows before delivery.
- [x] Superseded the image-upload validation flow with the approved structured daily-journal workflow; no fabricated trade records were inserted.
- [x] Replace all BashFX labels with the approved "Bashfx VIP GOLD ROOM" brand name during the questionnaire-led journal revision.
- [x] Configure the approved daily-journal form for XAUUSD only, London/New York sessions only, and M5 as the fixed default timeframe.
- [x] Make the date a mandatory, prominent, individually saved field on every trade card and use it as the authoritative weekly-summary grouping date.
- [x] Add configurable end-of-day journal reminders plus Friday-evening and Saturday-morning weekly-summary prompts.
- [x] Set the approved default reminder times to 20:00 daily, 18:00 Friday, and 09:00 Saturday in UTC+1, with in-app controls to change or pause them.
- [ ] Publish the updated app, then activate and verify the three scheduled reminder jobs end-to-end from the in-app controls.
