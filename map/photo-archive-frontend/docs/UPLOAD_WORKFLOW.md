# Photo Upload Workflow - Complete User Cycle

## Overview
This document defines the complete photo upload workflow cycle from map loading to uploading multiple photos with FOV marker direction adjustment and location confirmation.

## User Journey Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. LOAD MAP                                                     │
│    Map centers at 37.549292, 126.938785                         │
│    PhotoUpload panel visible in sidebar                         │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. UPLOAD PHOTO                                                 │
│    User selects file (drag/drop or browse)                      │
│    System extracts EXIF metadata:                               │
│    - GPS coordinates (if available)                             │
│    - Camera direction (if available)                            │
│    - Camera info, timestamp                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
                    ┌──────┴──────┐
                    │  GPS Data?  │
                    └──┬───────┬──┘
                  Yes  │       │  No
                       ▼       ▼
        ┌──────────────────────────────────┐
        │ 3a. AUTO-PLACE                   │  3b. MANUAL PLACEMENT
        │     Preview marker at GPS coords │      User clicks map
        │     FOV cone shown with EXIF dir │      Preview marker appears
        └──────────────┬───────────────────┘      Default North direction
                       │                           │
                       └───────────┬───────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. REVIEW & ADJUST                                              │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ Preview Marker on Map:                                  │ │
│    │  - Semi-transparent FOV cone                            │ │
│    │  - Draggable for location adjustment                    │ │
│    │  - Alt+Drag to rotate direction                         │ │
│    │  - Different visual style (dashed outline)              │ │
│    └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ PhotoUpload Panel Shows:                                │ │
│    │  📷 Photo preview thumbnail                             │ │
│    │  📍 Location: [lat, lng]                                │ │
│    │  🧭 Direction: [degrees]° (adjustable)                  │ │
│    │  📊 Metadata: camera, timestamp                         │ │
│    │                                                          │ │
│    │  Instructions:                                          │ │
│    │  "Review location and direction on map"                 │ │
│    │  "Drag marker to adjust location"                       │ │
│    │  "Alt+Drag marker to rotate direction"                  │ │
│    │                                                          │ │
│    │  [Cancel]  [Confirm & Upload]                           │ │
│    └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. CONFIRM UPLOAD                                               │
│    User clicks "Confirm & Upload"                               │
│    System uploads: file + location + direction + metadata       │
│    Preview marker shows spinner: "Uploading..."                 │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
                    ┌──────┴──────┐
                    │   Success?  │
                    └──┬───────┬──┘
                  Yes  │       │  No
                       ▼       ▼
        ┌──────────────────────────────────┐
        │ 6a. SUCCESS                      │  6b. ERROR
        │     Preview → Permanent marker   │      Error notification
        │     Success notification:        │      "Retry" button
        │     "✓ Photo uploaded!"          │      "Cancel" button
        │                                  │      Preview marker remains
        │     PhotoUpload Panel:           │
        │     ┌──────────────────────────┐ │
        │     │ ✓ Upload Successful      │ │
        │     │                          │ │
        │     │ [Upload Another Photo]   │ │
        │     └──────────────────────────┘ │
        └──────────────┬───────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. CONTINUE CYCLE                                               │
│    User clicks "Upload Another Photo"                           │
│    System resets to step 2 (Upload Photo)                       │
│    Previously uploaded photos remain visible on map             │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine

### Application States

```javascript
// App.jsx State Variables
const [uploadState, setUploadState] = useState('idle');
// States: 'idle' | 'file_selected' | 'reviewing' | 'uploading' | 'success' | 'error'

const [pendingUpload, setPendingUpload] = useState(null);
// Structure: { file, metadata, location: {lat, lng}, direction }

const [previewMarker, setPreviewMarker] = useState(null);
// Temporary marker for preview before confirmation
```

### State Transitions

| Current State | Action | Next State | Side Effects |
|---------------|--------|------------|--------------|
| idle | Select file | file_selected | EXIF extraction starts |
| file_selected | EXIF complete + GPS | reviewing | Preview marker placed at GPS |
| file_selected | EXIF complete, no GPS | reviewing | Wait for map click |
| reviewing | Map click (no GPS) | reviewing | Preview marker placed |
| reviewing | Adjust location/direction | reviewing | Preview marker updates |
| reviewing | Click "Confirm" | uploading | API call starts |
| reviewing | Click "Cancel" | idle | Reset all state |
| uploading | API success | success | Preview → Permanent marker |
| uploading | API error | error | Show error message |
| success | Click "Upload Another" | idle | Reset upload state |
| error | Click "Retry" | uploading | Retry API call |
| error | Click "Cancel" | idle | Reset all state |

## Component Responsibilities

### App.jsx
**Responsibilities:**
- Global state management (uploadState, pendingUpload, previewMarker)
- Map event handling (click for manual placement)
- Upload orchestration (API calls, state transitions)
- Preview marker lifecycle management

**Key Functions:**
```javascript
handleFileSelect(file, metadata)
  → setPendingUpload({ file, metadata, location: null, direction: 0 })
  → If GPS: setPreviewMarker({ lat, lng, direction })
  → setUploadState('reviewing')

handleMapClick(lat, lng)
  → If uploadState === 'reviewing' && !pendingUpload.location:
    → setPendingUpload({ ...pendingUpload, location: {lat, lng} })
    → setPreviewMarker({ lat, lng, direction: 0 })

handlePreviewDirectionChange(direction)
  → setPendingUpload({ ...pendingUpload, direction })
  → Update preview marker direction

handleConfirmUpload()
  → setUploadState('uploading')
  → uploadPhoto(pendingUpload)
  → On success:
    - setPhotos([...photos, newPhoto])
    - setUploadState('success')
    - Convert preview → permanent marker
  → On error:
    - setUploadState('error')

handleCancelUpload()
  → setPendingUpload(null)
  → setPreviewMarker(null)
  → setUploadState('idle')

handleUploadAnother()
  → setPendingUpload(null)
  → setPreviewMarker(null)
  → setUploadState('idle')
```

### PhotoUpload.jsx
**Responsibilities:**
- File selection UI (drag/drop, browse)
- EXIF extraction
- Upload state display
- Confirmation UI

**UI States:**
```javascript
// State: idle
<UploadDropZone onFileSelect={handleFileSelect} />

// State: file_selected (EXIF extracting)
<PreviewImage src={previewUrl} />
<Spinner text="Extracting metadata..." />

// State: reviewing
<PreviewImage src={previewUrl} />
<MetadataDisplay metadata={metadata} />
<LocationDisplay location={pendingUpload.location} />
<DirectionDisplay direction={pendingUpload.direction} />
<Instructions>
  "Review location and direction on map"
  "Drag marker to adjust location"
  "Alt+Drag marker to rotate direction"
</Instructions>
<ButtonGroup>
  <Button onClick={onCancel}>Cancel</Button>
  <Button onClick={onConfirm} primary>Confirm & Upload</Button>
</ButtonGroup>

// State: uploading
<Spinner text="Uploading photo..." />

// State: success
<SuccessMessage>✓ Photo uploaded successfully!</SuccessMessage>
<Button onClick={onUploadAnother} primary>Upload Another Photo</Button>

// State: error
<ErrorMessage>{errorMessage}</ErrorMessage>
<ButtonGroup>
  <Button onClick={onCancel}>Cancel</Button>
  <Button onClick={onRetry} primary>Retry</Button>
</ButtonGroup>
```

### DirectionalPhotoMarker.jsx
**Responsibilities:**
- Render permanent photo markers
- Allow direction adjustment (Alt+Drag)
- Display popup with photo details

**New Feature: Preview Mode**
```javascript
<DirectionalPhotoMarker
  photo={previewData}
  isPreview={true}  // NEW PROP
  onDirectionChange={handlePreviewDirectionChange}
/>

// Preview marker visual differences:
// - Dashed border on FOV cone
// - Lower opacity (0.6 vs 1.0)
// - Different icon badge ("Preview")
// - Pulsing animation to indicate temporary state
```

### PreviewMarker.jsx (New Component)
**Purpose:** Dedicated component for preview markers
```javascript
const PreviewMarker = ({
  location,
  direction,
  metadata,
  onDirectionChange,
  onLocationChange
}) => {
  // Similar to DirectionalPhotoMarker but:
  // - Dashed FOV cone
  // - Pulsing animation
  // - "Preview" badge
  // - Always draggable
  // - Always rotatable
}
```

## API Integration

### Upload Endpoint
```javascript
POST /api/photos/upload

Request (multipart/form-data):
  file: [image file]
  latitude: "37.549292"
  longitude: "126.938785"
  direction: "45" (optional)
  metadata: JSON string {
    camera: { make, model },
    timestamp: "...",
    direction: { degrees, hasDirection }
  }

Response (success):
{
  id: 123,
  filename: "photo.jpg",
  location: { latitude: 37.549292, longitude: 126.938785 },
  metadata: { ... },
  upload_date: "2025-10-29T13:20:00Z",
  thumbnail_url: "/photos/123/thumbnail",
  image_url: "/photos/123/image"
}

Response (error):
{
  error: "Upload failed",
  details: "File too large"
}
```

## Error Handling

### Common Errors & Recovery

| Error Type | User Message | Recovery Options |
|------------|--------------|------------------|
| File too large | "File exceeds 10MB limit" | Select smaller file |
| Invalid format | "Only JPEG, PNG, WEBP supported" | Select valid format |
| EXIF extraction failed | "Metadata extraction failed (proceeding without metadata)" | Continue with upload |
| Network error | "Upload failed - check connection" | Retry button |
| Server error | "Server error - please try again" | Retry button |
| Location not set | "Please click map to set location" | Wait for map click |

### Error State UI
```javascript
<ErrorNotification type={errorType}>
  <ErrorIcon />
  <ErrorMessage>{message}</ErrorMessage>
  <ErrorActions>
    <Button onClick={handleRetry}>Retry</Button>
    <Button onClick={handleCancel} secondary>Cancel</Button>
  </ErrorActions>
</ErrorNotification>
```

## Success Metrics

### User Experience Goals
- **Upload cycle < 30 seconds** (from file select to success)
- **FOV adjustment < 5 seconds** (Alt+Drag feedback immediate)
- **Location adjustment < 3 seconds** (Drag marker smooth)
- **Success rate > 95%** (excluding user cancellations)

### Quality Metrics
- **Preview marker visual distinction:** Clearly different from permanent markers
- **State feedback:** User always knows current step in workflow
- **Error recovery:** All errors have clear recovery path
- **Continuation flow:** "Upload Another" button obvious and accessible

## Implementation Checklist

### Phase 1: State Management (App.jsx)
- [ ] Add `uploadState` state variable
- [ ] Add `pendingUpload` state variable
- [ ] Add `previewMarker` state variable
- [ ] Implement `handleFileSelect` (remove auto-upload)
- [ ] Implement `handleMapClick` (conditional on reviewMode)
- [ ] Implement `handlePreviewDirectionChange`
- [ ] Implement `handleConfirmUpload`
- [ ] Implement `handleCancelUpload`
- [ ] Implement `handleUploadAnother`

### Phase 2: PhotoUpload Component
- [ ] Add uploadState prop
- [ ] Implement "reviewing" state UI
- [ ] Add location/direction display
- [ ] Add adjustment instructions
- [ ] Add "Confirm & Upload" button
- [ ] Add "Cancel" button
- [ ] Implement "success" state UI
- [ ] Add "Upload Another Photo" button
- [ ] Implement "error" state UI

### Phase 3: Preview Marker
- [ ] Create PreviewMarker component (or add preview mode to DirectionalPhotoMarker)
- [ ] Implement dashed FOV cone style
- [ ] Add pulsing animation
- [ ] Add "Preview" badge
- [ ] Ensure draggable for location
- [ ] Ensure rotatable for direction
- [ ] Emit direction/location change events

### Phase 4: Integration & Testing
- [ ] Connect all state management functions
- [ ] Test GPS photo workflow
- [ ] Test non-GPS photo workflow
- [ ] Test direction adjustment
- [ ] Test location adjustment
- [ ] Test success flow → upload another
- [ ] Test error scenarios
- [ ] Test cancel at each stage

## Testing Scenarios

### Scenario 1: GPS Photo Upload
1. Load map → Verify centered at 37.549292, 126.938785
2. Select photo with GPS → Verify EXIF extraction
3. Verify preview marker placed at GPS coordinates
4. Verify FOV cone direction matches EXIF (if available)
5. Alt+Drag to rotate → Verify smooth rotation
6. Click "Confirm & Upload" → Verify API call
7. Verify success message + "Upload Another"
8. Click "Upload Another" → Verify reset to idle state

### Scenario 2: Non-GPS Photo Upload
1. Load map → Verify centered
2. Select photo without GPS → Verify EXIF extraction
3. Verify instruction: "Click map to set location"
4. Click map → Verify preview marker appears
5. Verify default North direction
6. Drag marker → Verify location updates
7. Alt+Drag → Verify direction updates
8. Click "Confirm & Upload" → Verify upload
9. Verify success flow

### Scenario 3: Cancel at Review
1. Select photo → EXIF extracted
2. Preview marker placed
3. Click "Cancel" → Verify:
   - Preview marker removed
   - Upload state reset to idle
   - File selection cleared
   - PhotoUpload shows drop zone

### Scenario 4: Upload Error Recovery
1. Select photo → Preview marker placed
2. Click "Confirm & Upload"
3. Simulate network error
4. Verify error message displayed
5. Click "Retry" → Verify re-upload attempt
6. Simulate success → Verify success state

### Scenario 5: Multiple Photo Upload
1. Upload photo 1 → Success
2. Click "Upload Another"
3. Verify photo 1 remains on map
4. Upload photo 2 → Success
5. Verify both photos visible
6. Verify each has correct location/direction

## Visual Design Notes

### Preview Marker Style
```css
/* Preview marker distinguishing features */
.preview-marker {
  opacity: 0.8;
  animation: previewPulse 2s ease-in-out infinite;
}

.preview-marker__fov-cone {
  stroke: #5E6AD2;
  stroke-width: 3;
  stroke-dasharray: 10, 5; /* Dashed outline */
  fill: rgba(94, 106, 210, 0.15);
}

.preview-marker__badge {
  background: rgba(245, 158, 11, 0.95);
  color: white;
  content: "Preview";
}

@keyframes previewPulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1.0; }
}
```

### Confirmation UI Style
```css
.photo-upload__review-panel {
  background: var(--color-bg-elevated);
  border: 2px solid var(--color-indigo);
  border-radius: 12px;
  padding: 1.5rem;
}

.photo-upload__confirm-button {
  background: var(--color-indigo);
  color: white;
  font-weight: 600;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.photo-upload__confirm-button:hover {
  background: var(--color-indigo-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(94, 106, 210, 0.4);
}
```

## Future Enhancements

### Phase 2 Features (Not in Current Scope)
1. **Batch Upload:** Upload multiple photos at once
2. **Direction Slider:** Numeric input + slider for precise direction
3. **Location Search:** Search address to set marker location
4. **Photo Editing:** Crop, rotate, adjust brightness before upload
5. **Template Metadata:** Save common metadata as templates
6. **Bulk Direction Adjustment:** Set direction for multiple photos
7. **Keyboard Shortcuts:** Arrow keys for direction, Esc to cancel
8. **Undo/Redo:** Step back through adjustments

### Analytics & Monitoring
1. Track average time per upload cycle
2. Monitor success/failure rates
3. Track most common error types
4. Measure FOV adjustment frequency
5. Analyze location adjustment patterns

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Status:** Ready for Implementation
