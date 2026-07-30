# Face verification model files

The liveness/face-match step (`src/hooks/useLiveness.ts`) uses **face-api.js**
(built on TensorFlow.js) entirely in the browser. It needs three pre-trained
model weight files that are NOT bundled in this repo (they're a few MB each).

## Download

Get them from the official face-api.js "weights" folder and place them in
this `public/models` directory (keep the exact filenames):

```
tiny_face_detector_model-weights_manifest.json
tiny_face_detector_model-shard1
face_landmark_68_model-weights_manifest.json
face_landmark_68_model-shard1
face_recognition_model-weights_manifest.json
face_recognition_model-shard1
face_recognition_model-shard2
weights/face_landmark_68_tiny_model-weights_manifest.json
weights/face_recognition_model-shard1
```

Source: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

You can fetch them with a quick script, e.g.:

```bash
BASE=https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights
for f in tiny_face_detector_model-weights_manifest.json tiny_face_detector_model-shard1 \
         face_landmark_68_model-weights_manifest.json face_landmark_68_model-shard1 \
         face_recognition_model-weights_manifest.json face_recognition_model-shard1 face_recognition_model-shard2; do
  curl -L -o "$f" "$BASE/$f"
done
```

Run that from inside `frontend/public/models`.

## Swapping in Google MediaPipe instead

If you'd rather use MediaPipe Face Landmarker for the on-screen liveness
gesture (blink/head-turn) instead of face-api.js's 68-point landmarks, you
can replace the landmark detection inside `useLiveness.ts` with MediaPipe's
`FaceLandmarker` — the rest of the flow (extracting a face embedding and
comparing it via cosine similarity on the backend) stays the same.
