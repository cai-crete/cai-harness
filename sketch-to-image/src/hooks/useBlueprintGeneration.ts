'use client';

import { useState, useCallback, RefObject } from 'react';

export interface GenerationParams {
  userPrompt?: string;
  vizMode?: string;
  styleMode?: string;
  resolution?: string;
  aspectRatio?: string;
}

export interface GenerationResult {
  generatedImage: string | null;
  analysisReport: Record<string, unknown> | null;
}

export interface UseBlueprintGenerationReturn extends GenerationResult {
  isLoading: boolean;
  error: string | null;
  generate: (
    canvasRef: RefObject<HTMLCanvasElement | null>,
    originalImage: string | null,
    params?: GenerationParams
  ) => Promise<void>;
  reset: () => void;
}

export function useBlueprintGeneration(): UseBlueprintGenerationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<Record<string, unknown> | null>(null);

  const generate = useCallback(
    async (
      canvasRef: RefObject<HTMLCanvasElement | null>,
      originalImage: string | null,
      params: GenerationParams = {}
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        let sketchBase64: string;
        let mimeType = 'image/png';

        if (canvasRef.current) {
          sketchBase64 = canvasRef.current.toDataURL('image/png').split(',')[1];
        } else if (originalImage) {
          const match = originalImage.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            sketchBase64 = match[2];
          } else {
            sketchBase64 = originalImage;
          }
        } else {
          throw new Error('스케치 이미지가 없습니다. 캔버스에 그리거나 이미지를 업로드하세요.');
        }

        const body = {
          sketch_image: sketchBase64,
          mime_type: mimeType,
          user_prompt: params.userPrompt ?? '',
          viz_mode: params.vizMode ?? 'CONCEPT',
          style_mode: params.styleMode ?? 'NONE',
          resolution: params.resolution ?? 'NORMAL QUALITY',
          aspect_ratio: params.aspectRatio ?? '4:3',
        };

        const res = await fetch('/api/sketch-to-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? `API 오류: ${res.status}`);
        }

        const data = await res.json() as { generated_image: string; analysis_report: Record<string, unknown> };
        setGeneratedImage(data.generated_image);
        setAnalysisReport(data.analysis_report);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setGeneratedImage(null);
    setAnalysisReport(null);
    setError(null);
  }, []);

  return { isLoading, error, generatedImage, analysisReport, generate, reset };
}
