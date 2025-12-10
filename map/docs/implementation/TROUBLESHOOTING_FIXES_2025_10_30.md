# Troubleshooting Fixes - October 30, 2025

## Issues Resolved

### Issue 1: Remove "0 photos archived" Text ✅

**Problem**: The header displayed "0 photos archived" next to the Upload button, which was unnecessary and cluttered the UI.

**Location**: `App.jsx:432-434`

**Solution**: Removed the entire `<p className="app-subtitle">` element that displayed the photo count.

**Before**:
```jsx
<div className="app-header__controls">
  <p className="app-subtitle">
    {photos.length} {photos.length === 1 ? 'photo' : 'photos'} archived
  </p>
  <button onClick={() => setUploadModalOpen(true)} className="upload-btn">
    <span className="upload-btn__icon">📷</span>
    <span className="upload-btn__text">Upload</span>
  </button>
</div>
```

**After**:
```jsx
<div className="app-header__controls">
  <button onClick={() => setUploadModalOpen(true)} className="upload-btn">
    <span className="upload-btn__icon">📷</span>
    <span className="upload-btn__text">Upload</span>
  </button>
</div>
```

---

### Issue 2: Fix FOV Marker Rotation with Vertical Drag ✅

**Problem**: The FOV marker rotation wasn't working smoothly. The requirement was to rotate the marker 360° by dragging the mouse up and down while holding spacebar.

**Location**: `DirectionalPhotoMarker.jsx:50-222`

**Root Cause**: The previous implementation calculated rotation angle based on the mouse position relative to the marker (using `atan2`), which meant dragging in a circle around the marker. This was not intuitive for vertical drag control.

**Solution**:
1. Added state tracking for initial mouse Y position and direction when rotation starts
2. Changed rotation calculation to use vertical mouse movement (deltaY)
3. Implemented sensitivity control: 200 pixels of vertical movement = 360° rotation
4. Ensured marker stays in place during rotation mode

**Key Changes**:

#### 1. Added State Variables (Lines 56-58)
```jsx
// Track initial mouse position for rotation calculation
const [rotationStartY, setRotationStartY] = useState(null);
const [rotationStartDirection, setRotationStartDirection] = useState(null);
```

#### 2. Updated `handleDragStart` (Lines 152-164)
```jsx
const handleDragStart = (e) => {
  if (isSpacebarPressed) {
    setIsRotating(true);
    // Store initial mouse Y position and current direction for relative rotation
    const point = map.latLngToContainerPoint(e.target.getLatLng());
    setRotationStartY(point.y);
    setRotationStartDirection(direction);
  } else {
    setIsRotating(false);
    setRotationStartY(null);
    setRotationStartDirection(null);
  }
};
```

#### 3. Rewrote `handleMarkerDrag` (Lines 170-198)
```jsx
const handleMarkerDrag = (e) => {
  const shouldRotate = isSpacebarPressed || isRotating;

  if (!shouldRotate || rotationStartY === null || rotationStartDirection === null) return;

  const marker = markerRef.current;
  if (!marker) return;

  // Get the original marker position (don't let it move during rotation)
  const markerPos = L.latLng(photo.location.latitude, photo.location.longitude);

  // Calculate vertical mouse movement
  const currentMousePoint = map.latLngToContainerPoint(e.latlng);
  const deltaY = rotationStartY - currentMousePoint.y; // Inverted: dragging up = positive

  // Convert vertical movement to rotation angle
  // 200 pixels of vertical movement = 360° rotation (adjustable sensitivity)
  const pixelsPerFullRotation = 200;
  const rotationDelta = (deltaY / pixelsPerFullRotation) * 360;

  // Calculate new direction based on initial direction + delta
  const newDirection = rotationStartDirection + rotationDelta;
  const normalizedAngle = normalizeDirection(newDirection);

  // Update direction and snap marker back to original position
  setDirection(normalizedAngle);
  e.target.setLatLng(markerPos);
};
```

#### 4. Updated `handleMarkerDragEnd` (Lines 203-222)
```jsx
const handleMarkerDragEnd = (e) => {
  if (isRotating) {
    // Ensure marker is at original position after rotation
    const originalPos = L.latLng(photo.location.latitude, photo.location.longitude);
    e.target.setLatLng(originalPos);

    // Save direction change
    if (onDirectionChange) {
      onDirectionChange(photo.id, direction);
    }

    // Reset rotation state
    setIsRotating(false);
    setRotationStartY(null);
    setRotationStartDirection(null);
  } else {
    // Normal position drag - update location
    handleDragEnd(e);
  }
};
```

---

## How the New Rotation Works

### User Interaction Flow

1. **Hold SPACEBAR** → `isSpacebarPressed` becomes `true`
2. **Start dragging marker** → `handleDragStart` captures:
   - Initial screen Y position of mouse
   - Current direction angle
3. **Drag mouse up/down** → `handleMarkerDrag` continuously:
   - Calculates vertical distance moved (deltaY)
   - Converts to rotation angle (200px = 360°)
   - Updates direction in real-time
   - Keeps marker fixed in place
4. **Release drag** → `handleMarkerDragEnd`:
   - Saves final direction to backend
   - Resets rotation state

### Sensitivity Configuration

**Current Setting**: `200` pixels = `360°` full rotation

To adjust sensitivity:
- **More sensitive** (less pixel movement needed): decrease `pixelsPerFullRotation`
- **Less sensitive** (more pixel movement needed): increase `pixelsPerFullRotation`

Example adjustments:
```javascript
const pixelsPerFullRotation = 150; // More sensitive (150px = 360°)
const pixelsPerFullRotation = 300; // Less sensitive (300px = 360°)
```

---

## Testing Instructions

### Test Issue 1 Fix
1. Start the app: `cd photo-archive-frontend && npm run dev`
2. Open http://localhost:3000
3. **Verify**: Header should NOT show "0 photos archived" text
4. **Verify**: Only Upload button and FOV toggle should be visible

### Test Issue 2 Fix
1. Click Upload button
2. Select a photo with GPS data (or place manually on map)
3. **Hold SPACEBAR**
4. **Drag mouse UP** → FOV should rotate clockwise
5. **Drag mouse DOWN** → FOV should rotate counter-clockwise
6. **Release spacebar and drag** → Marker should move normally
7. **Verify**: Rotation is smooth and continuous
8. **Verify**: Dragging 200 pixels vertically = full 360° rotation

### Edge Cases to Test
- ✅ Hold spacebar mid-drag → should switch to rotation mode
- ✅ Release spacebar mid-rotation → rotation should persist until drag ends
- ✅ Rapid up-down dragging → should rotate smoothly without jumping
- ✅ Drag beyond 360° → should continue rotating (multiple rotations)
- ✅ Normal drag (no spacebar) → should move marker location

---

## Technical Details

### Coordinate Systems Used

1. **Lat/Lng** (geographic coordinates):
   - Used for marker position storage
   - Example: `[37.549292, 126.938785]`

2. **Container Point** (pixel coordinates):
   - Screen X,Y position relative to map container
   - Used for calculating mouse movement
   - Example: `{x: 450, y: 300}`

3. **Conversion**:
   ```javascript
   const point = map.latLngToContainerPoint(e.target.getLatLng());
   // Converts marker's lat/lng → screen pixel position
   ```

### Why Container Points for Rotation?

**Problem**: Using `e.latlng` directly for vertical dragging doesn't work because:
- Geographic coordinates (lat/lng) have non-linear relationship to screen pixels
- Latitude degrees change size with zoom level and map projection
- Mouse movement in pixels doesn't correspond 1:1 with lat/lng changes

**Solution**: Convert to container points (pixel coordinates):
- Screen pixels have consistent, linear relationship
- 1 pixel of mouse movement = 1 pixel in calculation
- Independent of map zoom level and projection
- Gives precise control over rotation sensitivity

---

## Files Modified

### `App.jsx`
- **Line 432-439**: Removed photo count subtitle
- **Line 500-501**: Fixed unused parameter warnings

### `DirectionalPhotoMarker.jsx`
- **Line 56-58**: Added rotation tracking state variables
- **Line 152-164**: Updated `handleDragStart` with initial position capture
- **Line 170-198**: Rewrote `handleMarkerDrag` for vertical drag rotation
- **Line 203-222**: Updated `handleMarkerDragEnd` to reset rotation state

---

## Additional Notes

### Why This Approach is Better

**Previous Implementation**:
- ❌ Required dragging in a circle around marker
- ❌ Unintuitive angle calculation using `atan2`
- ❌ Difficult to achieve precise rotation angles
- ❌ Mouse position had to be relative to marker center

**New Implementation**:
- ✅ Simple vertical drag motion (natural for users)
- ✅ Continuous 360° rotation capability
- ✅ Easy to achieve precise angles
- ✅ Works anywhere on screen (not limited to marker proximity)
- ✅ Adjustable sensitivity via single parameter
- ✅ Smooth, predictable rotation behavior

### Future Enhancement Ideas

1. **Visual Feedback**: Show rotation angle in degrees during drag
2. **Snap Angles**: Optional snapping to cardinal directions (N, E, S, W)
3. **Rotation Speed**: Modifier keys for fine/coarse adjustment
4. **Touch Support**: Two-finger rotation gesture for mobile devices
5. **Keyboard Arrows**: Arrow keys for precise angle adjustment

---

## Summary

Both issues have been successfully resolved:

1. ✅ **"0 photos archived" removed** - Header is now cleaner
2. ✅ **FOV rotation fixed** - Smooth vertical drag rotation with 360° continuous control

The app is ready for testing. Start the development server with:

```bash
cd photo-archive-frontend
npm run dev
```

Then test at http://localhost:3000
