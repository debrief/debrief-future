# Webview Message Contract: Thumbnail Capture

**Feature**: 174-thumbnail-capture
**Date**: 2026-03-29

## Overview

Extends the existing webview message protocol (`apps/vscode/src/webview/messages.ts`) with a request/response pair for thumbnail capture. Follows the existing `RequestExportPngRequest` pattern using `requestId` for correlation.

## Messages

### RequestThumbnailCaptureMessage (Extension → Webview)

Sent by the extension host after a successful session save. Instructs the webview to capture the current map state as PNG images.

```typescript
export interface RequestThumbnailCaptureMessage extends RequestMessage {
  type: 'requestThumbnailCapture';
}
```

Inherits `requestId: string` from `RequestMessage`.

### ThumbnailCaptureResponseMessage (Webview → Extension)

Sent by the webview after capture attempt. Contains base64-encoded PNG data for both sizes, or null/error on failure.

```typescript
export interface ThumbnailCaptureResponseMessage extends ResponseMessage {
  type: 'thumbnailCaptureResponse';
  largePngBase64: string | null;
  smallPngBase64: string | null;
  error?: string;
}
```

Inherits `requestId: string` from `ResponseMessage`.

## Sequence

```
Extension Host                    Webview (MapPanel)
      │                                  │
      │  1. saveSession() succeeds       │
      │                                  │
      │  requestThumbnailCapture ──────> │
      │  (requestId: "abc-123")          │
      │                                  │ 2. domToPng(mapContainer)
      │                                  │ 3. resize to 200x150
      │                                  │
      │ <── thumbnailCaptureResponse ──  │
      │  (requestId: "abc-123",          │
      │   largePngBase64: "iVBOR...",    │
      │   smallPngBase64: "iVBOR...")    │
      │                                  │
      │  4. decode base64 → bytes        │
      │  5. write thumbnail.png          │
      │  6. write thumbnail-sm.png       │
      │  7. update item.json assets      │
      │                                  │
```

## Error Handling

- If `domToPng()` fails (e.g., canvas tainted by cross-origin tiles), `error` is set and both base64 fields are null.
- Extension logs a warning but does NOT retry or show an error to the user.
- The session save is already complete before this message is sent, so capture failure has no impact on saved data.

## Union Type Updates

Add to `ExtensionToWebviewMessage`:
```typescript
| RequestThumbnailCaptureMessage
```

Add to `WebviewToExtensionMessage`:
```typescript
| ThumbnailCaptureResponseMessage
```
