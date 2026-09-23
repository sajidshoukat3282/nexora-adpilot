import { describe, expect, it } from "vitest";
import { canScheduleCreativeOnAsset, checkCreativeTechnicalCompatibility } from "@/domain/technicalCompatibility";

describe("creative technical compatibility", () => {
  const asset = {
    id: "screen-1",
    mediaType: "digital" as const,
    orientation: "landscape" as const,
    technicalCapabilities: {
      supportedFileTypes: ["mp4"],
      supportedCodecs: ["h264"],
      nativeResolution: { widthPx: 1920, heightPx: 1080 },
      supportedResolutions: [{ widthPx: 1920, heightPx: 1080 }],
      audioSupported: false,
    },
    digitalResolution: undefined,
    supportedResolutions: { supported: [{ widthPx: 1920, heightPx: 1080 }] },
  };

  it("accepts a compatible creative", () => {
    const result = checkCreativeTechnicalCompatibility({
      asset,
      creative: {
        id: "creative-1",
        format: "mp4",
        dimensions: { widthPx: 1920, heightPx: 1080 },
        durationSec: 15,
        fileSizeKb: 5000,
      },
      requirements: { maxDurationSec: 30 },
    });

    expect(result.status).toBe("compatible");
    expect(canScheduleCreativeOnAsset(result)).toBe(true);
  });

  it("blocks an incompatible creative", () => {
    const result = checkCreativeTechnicalCompatibility({
      asset,
      creative: {
        id: "creative-2",
        format: "jpg",
        dimensions: { widthPx: 1080, heightPx: 1920 },
        durationSec: 15,
        fileSizeKb: 5000,
      },
    });

    expect(result.status).toBe("incompatible");
    expect(canScheduleCreativeOnAsset(result)).toBe(false);
  });
});
