import { describe, expect, it, vi } from "vitest";
import { createClientUuid } from "./ids";

describe("createClientUuid", () => {
  it("uses the native UUID API when available", () => {
    const nativeId = "123e4567-e89b-42d3-a456-426614174000";
    const getRandomValues = vi.fn(<T extends ArrayBufferView>(array: T) => array);

    expect(createClientUuid({ randomUUID: () => nativeId, getRandomValues })).toBe(nativeId);
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it("creates a v4 UUID from secure random values when the native API is unavailable", () => {
    const getRandomValues = <T extends ArrayBufferView>(array: T): T => {
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0);
      return array;
    };

    expect(createClientUuid({ getRandomValues })).toBe("00000000-0000-4000-8000-000000000000");
  });
});
