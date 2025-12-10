# FOV Adjustment & Metadata Display Fixes

## Overview
Fixed two issues with the Photo Archive application:
1. **FOV angle adjustment clarity** - Improved instructions for Alt+Drag functionality
2. **Metadata display optimization** - Removed FOV area display and added user ID

## Date
2025-10-30 00:20 AM

---

## Issue 1: FOV Angle Adjustment

### Problem
User reported inability to adjust FOV angle direction.

### Root Cause Analysis
The FOV angle adjustment functionality **was working correctly** but:
- Feature requires holding ALT key while dragging marker
- Instructions were not sufficiently clear or prominent
- User may not have noticed the Alt+Drag requirement

### Implementation Details
The feature works as follows:
1. Normal drag: Moves marker location
2. **Alt+Drag**: Rotates viewing direction without moving marker
3. Direction updates in real-time during drag
4. Changes saved on drag end

**Code Location:** `DirectionalPhotoMarker.jsx:132-174`

```javascript
const handleMarkerDrag = (e) => {
  const shouldRotate = e.originalEvent.altKey || isRotating;
  if (!shouldRotate) return;

  // Calculate angle and update direction
  // Marker stays in place during rotation
};
```

### Solution Applied
**Enhanced instruction clarity throughout the UI:**

#### 1. Notification Messages (App.jsx)
```javascript
// Before:
'Review location and direction, then confirm upload'
'Location set! Adjust direction if needed, then confirm upload'

// After:
'✓ Location set! Hold ALT and drag marker to adjust direction'
```

#### 2. Upload Modal Instructions (PhotoUploadModal.jsx)
```html
<!-- Before -->
<li>Alt+Drag to adjust the Field of View direction</li>

<!-- After -->
<li><strong>Hold ALT and drag</strong> marker to adjust viewing direction</li>
```

#### 3. Marker Popup Hint (DirectionalPhotoMarker.jsx)
```html
<!-- Before -->
💡 Alt+Drag to rotate direction

<!-- After -->
💡 Hold ALT and drag marker to adjust direction
```

#### 4. Photo Upload Instructions (PhotoUpload.jsx)
```html
<!-- Before -->
• Alt+Drag marker to rotate direction

<!-- After -->
• <strong>Hold ALT and drag</strong> marker to adjust direction
```

### Benefits
- ✅ **Clearer language**: "Hold ALT and drag" vs "Alt+Drag"
- ✅ **Visual emphasis**: Bold text on critical instructions
- ✅ **Consistent messaging**: Same wording across all UI locations
- ✅ **User-friendly**: More explicit about the key+action combination

---

## Issue 2: Metadata Display Optimization

### Problem
Photo metadata displayed FOV area information that wasn't needed. Required metadata:
- ✅ User ID
- ✅ Date
- ✅ Location (lat/lon)
- ✅ FOV angle direction
- ❌ FOV area (not needed)

### Changes Made

#### Removed FOV Area Display
**File:** `DirectionalPhotoMarker.jsx:262-266`

```javascript
// REMOVED:
{showFOV && (
  <p className="photo-popup__fov">
    👁️ FOV: {fovParams.fovAngle}° × {fovParams.distance}m
  </p>
)}
```

#### Added User ID Display
**File:** `DirectionalPhotoMarker.jsx:243-248`

```javascript
// ADDED:
{photo.user_id && (
  <p className="photo-popup__user">
    👤 User: {photo.user_id}
  </p>
)}
```

#### Reorganized Metadata Display Order
**New order for better UX:**
1. **Filename** (heading)
2. **User ID** (who uploaded)
3. **Date** (when uploaded)
4. **Location** (lat/lon coordinates)
5. **Direction** (FOV angle)
6. **Camera** (optional, if available)

### Before vs After

**Before:**
```
📷 test-photo.jpg
📅 Oct 30, 2025
📷 Canon EOS R5
🧭 Direction: 45°
👁️ FOV: 65° × 50m          ← Removed
📍 37.54929, 126.93878
```

**After:**
```
📷 test-photo.jpg
👤 User: john-doe-001       ← Added
📅 Oct 30, 2025
📍 37.54929, 126.93878
🧭 Direction: 45°
📷 Canon EOS R5
```

### Benefits
- ✅ **User ID visible** - Know who uploaded each photo
- ✅ **Cleaner display** - Removed unnecessary FOV area info
- ✅ **Better organization** - Prioritized essential metadata
- ✅ **Reduced clutter** - Simplified popup interface

---

## Files Modified

### Core Changes
1. **DirectionalPhotoMarker.jsx** - Metadata display updates
2. **App.jsx** - Notification message improvements
3. **PhotoUploadModal.jsx** - Upload instructions clarity
4. **PhotoUpload.jsx** - Review instructions emphasis

### Line Changes Summary
- **Added**: ~15 lines (user ID display + improved instructions)
- **Modified**: ~8 lines (instruction text updates)
- **Removed**: ~5 lines (FOV area display)
- **Net Change**: +10 lines

---

## Testing Checklist

### FOV Adjustment
- ✅ Preview marker shows during upload
- ✅ Marker is draggable without Alt key (moves location)
- ✅ Holding Alt + dragging rotates direction without moving marker
- ✅ Direction updates in real-time during Alt+Drag
- ✅ Direction persists after releasing Alt key
- ✅ Clear instructions visible in multiple places

### Metadata Display
- ✅ User ID displays in photo popup
- ✅ Date displays correctly
- ✅ Location coordinates display with 5 decimal precision
- ✅ FOV direction displays in degrees
- ✅ FOV area removed from display
- ✅ Camera info shows when available
- ✅ Metadata order logical and user-friendly

---

## User Guide

### How to Adjust FOV Direction

1. **Upload a photo** or **select existing photo marker**
2. **Hold the ALT key** on your keyboard
3. **While holding ALT, click and drag the marker**
4. **Watch the FOV cone rotate** in real-time
5. **Release mouse button** to save new direction
6. **Release ALT key** when done

### Visual Feedback
- FOV cone rotates smoothly during Alt+Drag
- Marker stays in place (doesn't move) during rotation
- Direction value updates in popup display

### Platform Notes
- **Windows/Linux**: ALT key
- **macOS**: Option key (labeled Alt on some keyboards)

---

## Technical Notes

### Alt Key Detection
```javascript
const shouldRotate = e.originalEvent.altKey || isRotating;
```

Uses native browser event `altKey` property for reliable cross-platform detection.

### Direction Calculation
```javascript
const dy = mousePos.lat - markerPos.lat;
const dx = mousePos.lng - markerPos.lng;
const angle = Math.atan2(dx, dy) * (180 / Math.PI);
const normalizedAngle = normalizeDirection(angle);
```

Calculates bearing from marker to mouse cursor position.

### State Management
- Local state: `direction` (DirectionalPhotoMarker component)
- Parent callback: `onDirectionChange(id, direction)` on drag end
- Persistent: Saved to database on upload confirmation

---

## Impact

### User Experience
- **Clearer instructions**: Users understand how to adjust direction
- **Better metadata**: Essential info visible, clutter removed
- **Professional display**: Clean, organized photo information

### Code Quality
- **Consistent messaging**: Same instructions across all components
- **Maintainability**: Centralized instruction text patterns
- **Scalability**: Easy to add more metadata fields if needed

---

## Future Enhancements (Optional)

### Potential Improvements
1. **Visual indicator** when Alt key is pressed (e.g., cursor change)
2. **Rotation handle** on FOV cone for more intuitive adjustment
3. **Keyboard shortcuts** for precise angle adjustments
4. **Direction presets** (North, East, South, West quick buttons)

### Additional Metadata Options
1. **Capture device** (phone model, camera model)
2. **Weather conditions** (if available from EXIF)
3. **Altitude** (if GPS elevation available)
4. **Tags/categories** (user-defined labels)
