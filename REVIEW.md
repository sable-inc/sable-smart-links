# Sable Smart Links - Code Review Checklist

## 📋 File Review Checklist

### Main Entry Points

- [ ] `src/index.js` (547 lines)
- [ ] `src/index.d.ts` (527 lines)

### Core Engine Files

- [ ] `src/core/walkthroughEngine.js` (717 lines)
- [ ] `src/core/textAgentEngine.js` (1391 lines)

### Interactor

- [ ] `src/interactor/index.ts` (343 lines)

### React Integration

- [ ] `src/react/SableSmartLinksProvider.tsx` (518 lines)
- [ ] `src/react/index.ts` (2 lines)

### Tavily Integration

- [x] `src/tavily/server.ts` (384 lines) - **MOVED TO API SERVER**
- [x] `src/tavily/client.ts` (179 lines)
- [x] `src/tavily/index.ts` (18 lines)
- [x] `src/tavily/types.ts` (16 lines)
- [x] `src/tavily/README.md` (198 lines)

### UI Components

- [ ] `src/ui/GlobalPopupManager.js` (261 lines)
- [ ] `src/ui/PopupStateManager.js` (329 lines)
- [ ] `src/ui/MenuTriggerManager.js` (447 lines)
- [x] `src/ui/highlight.js` (171 lines)
- [x] `src/ui/spotlight.js` (197 lines)
- [x] `src/ui/tooltip.js` (403 lines)

### UI Components (components/)

- [ ] `src/ui/components/SimplePopup.js` (529 lines)
- [x] `src/ui/components/ArrowButton.js` (124 lines)
- [x] `src/ui/components/YesNoButtons.js` (72 lines)
- [x] `src/ui/components/CloseButton.js` (74 lines)
- [x] `src/ui/components/EndTourButton.js` (119 lines)
- [x] `src/ui/components/MenuTrigger.js` (76 lines)
- [ ] `src/ui/components/Sections.js` (127 lines)

### Utils

- [ ] `src/utils/analytics.js` (547 lines)
- [x] `src/utils/positioning.js` (229 lines)
- [x] `src/utils/browserAPI.js` (142 lines)
- [x] `src/utils/elementSelector.js` (147 lines)
- [x] `src/utils/events.js` (108 lines)
- [x] `src/utils/urlParser.js` (49 lines)

---

**Total Files to Review: 27**
**Total Lines of Code: ~9,236**
