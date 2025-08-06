# Walkthrough stepId Refactoring Summary

## Overview

This refactoring adds a required `stepId` string field to walkthrough steps and ensures it's passed down in all analytics events. This provides better tracking and identification of individual steps in analytics data.

## Changes Made

### 1. TypeScript Definitions (`src/index.d.ts`)

- **Added `stepId` field to `WalkthroughStep` interface**: Made it a required string field for unique step identification
- **Updated documentation**: Added JSDoc comment explaining the field is required for analytics tracking

### 2. Analytics Schema (`api/ANALYTICS.md`)

- **Updated Walkthrough Analytics Schema**: Added `stepId: String` as a required field
- **Updated API documentation**: Added `stepId` to the request body examples
- **Updated field descriptions**: Clarified that `stepId` is the unique identifier from config

### 3. Analytics Utility (`src/utils/analytics.js`)

- **Updated `logWalkthroughEvent` function**: Added `stepId` parameter and validation
- **Updated all walkthrough analytics functions**:
  - `logWalkthroughStart`
  - `logWalkthroughNext`
  - `logWalkthroughEnd`
  - `logWalkthroughStepExecuted`
  - `logWalkthroughStepError`
- **Added validation**: Ensures `stepId` is provided for all walkthrough events

### 4. Walkthrough Engine (`src/core/walkthroughEngine.js`)

- **Added stepId validation**: Checks that all steps have a `stepId` field during registration
- **Updated all analytics calls**: Passes `stepId` from the current step to all analytics events
- **Enhanced error handling**: Provides clear error messages when `stepId` is missing

### 5. Documentation Updates

- **README.md**: Updated examples to include `stepId` in all walkthrough step configurations
- **Example files**: Updated all example walkthroughs to include `stepId`:
  - `examples/index.html`
  - `examples/apiWalkthrough.html`
  - `examples/createTeam.html`

### 6. API Server Updates (`api/server.js`)

- **Updated walkthrough analytics validation**: Added `stepId` as a required field in validation
- **Updated analytics entry creation**: Added `stepId` to the database document structure
- **Added database indexes**: Created index for `stepId` field for better query performance
- **Updated GET endpoint**: Added support for filtering by `stepId` in query parameters

### 7. Test Files

- **Created `test/stepId-validation-test.js`**: Test file to verify stepId validation works correctly
- **Created `test/walkthrough-stepid-database-test.html`**: Integration test to verify stepId is saved to database

## Breaking Changes

### Required Changes for Existing Code

All existing walkthrough configurations must be updated to include `stepId` for each step:

**Before:**

```javascript
{
  selector: '#element',
  tooltip: 'Step content'
}
```

**After:**

```javascript
{
  stepId: 'unique-step-identifier',
  selector: '#element',
  tooltip: 'Step content'
}
```

### Validation Behavior

- **Registration validation**: Walkthrough registration will fail if any step is missing `stepId`
- **Error messages**: Clear error messages indicate which step is missing `stepId`
- **Analytics validation**: Analytics events will not be logged if `stepId` is missing

## Benefits

1. **Better Analytics Tracking**: Each step can be uniquely identified in analytics data
2. **Improved Debugging**: Easier to track which specific steps are being executed
3. **Enhanced Reporting**: Analytics reports can now show step-specific metrics
4. **Consistency**: Aligns with text agent analytics which already uses `stepId`

## Migration Guide

### For Developers

1. **Update all walkthrough configurations** to include `stepId` for each step
2. **Use descriptive stepId values** that clearly identify the step purpose
3. **Test walkthrough registration** to ensure all steps have valid `stepId` values

### Example Migration

```javascript
// Before
SableSmartLinks.registerWalkthrough("onboarding", [
  {
    selector: "#welcome",
    tooltip: "Welcome!",
  },
  {
    selector: "#next",
    tooltip: "Next step",
  },
]);

// After
SableSmartLinks.registerWalkthrough("onboarding", [
  {
    stepId: "welcome-step",
    selector: "#welcome",
    tooltip: "Welcome!",
  },
  {
    stepId: "navigation-step",
    selector: "#next",
    tooltip: "Next step",
  },
]);
```

## Testing

Run the validation test to ensure stepId validation works:

```javascript
// In browser console
testStepIdValidation();
```

## Analytics Impact

All walkthrough analytics events now include:

- `stepId`: Unique identifier from the step configuration
- `stepIndex`: Numeric index (0-based)
- `stepSelector`: CSS selector or XPath (if applicable)

This provides both human-readable step identification (`stepId`) and programmatic access (`stepIndex`) for analytics processing.
