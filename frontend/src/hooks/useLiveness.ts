import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

/**
 * Client-side face verification.
 *
 * Face detection, 68-point landmarks, and 128-d face descriptors (embeddings)
 * run entirely in the browser via face-api.js, which itself is built on
 * TensorFlow.js — satisfying the "TensorFlow.js for face embeddings"
 * requirement without sending the live camera feed to the server.
 *
 * (If you would rather use Google's MediaPipe Face Landmarker directly for
 * the liveness/blink gesture instead of face-api.js's 68-point landmarks,
 * swap the landmark source in `computeEAR` below — the rest of this hook,
 * including the embedding + cosine-similarity flow, stays the same.)
 *
 * SETUP REQUIRED: download the face-api.js "tiny_face_detector",
 * "face_landmark_68" and "face_recognition" model weight files into
 * frontend/public/models (see frontend/public/models/README.md).
 */

const MODEL_URL = '/models';

// Eye landmark indices (68-point model)
const LEFT_EYE = [36, 37, 38, 39, 40, 41];
const RIGHT_EYE = [42, 43, 44, 45, 46, 47];
const EAR_BLINK_THRESHOLD = 0.22;

function euclidean(a: faceapi.Point, b: faceapi.Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(points: faceapi.Point[], indices: number[]) {
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => points[i]);
  const vertical1 = euclidean(p2, p6);
  const vertical2 = euclidean(p3, p5);
  const horizontal = euclidean(p1, p4);
  return (vertical1 + vertical2) / (2 * horizontal);
}

export function useLiveness() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState('');
  const [blinkDetected, setBlinkDetected] = useState(false);
  const wasEyesClosed = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        setModelLoadError(
          'Could not load face verification models. Make sure the model files are present in /public/models (see public/models/README.md).',
        );
      }
    })();
  }, []);

  // Call on every animation frame while the webcam liveness step is active.
  const processVideoFrame = useCallback(async (video: HTMLVideoElement) => {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (!detection) return null;

    const points = detection.landmarks.positions;
    const leftEAR = eyeAspectRatio(points, LEFT_EYE);
    const rightEAR = eyeAspectRatio(points, RIGHT_EYE);
    const avgEAR = (leftEAR + rightEAR) / 2;

    if (avgEAR < EAR_BLINK_THRESHOLD) {
      wasEyesClosed.current = true;
    } else if (wasEyesClosed.current) {
      // Eyes were closed and are now open again -> a blink occurred.
      setBlinkDetected(true);
      wasEyesClosed.current = false;
    }

    return detection;
  }, []);

  // Detects a face and returns its 128-d descriptor plus the detection confidence.
  // A low `score` means the model is unsure a real face is present (e.g. random
  // pictures, scenery, or heavily blurred photos) — callers should reject those.
  const detectFace = useCallback(
    async (imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
      const result = await faceapi
        .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!result) return null;
      return { descriptor: Array.from(result.descriptor), score: result.detection.score };
    },
    [],
  );

  // Convenience wrapper returning only the descriptor (used for the selfie frame).
  const extractDescriptor = useCallback(
    async (imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
      const result = await detectFace(imageElement);
      return result?.descriptor ?? null;
    },
    [detectFace],
  );

  const resetBlink = () => {
    setBlinkDetected(false);
    wasEyesClosed.current = false;
  };

  return { modelsLoaded, modelLoadError, blinkDetected, processVideoFrame, detectFace, extractDescriptor, resetBlink };
}
