import { describe, expect, it } from "vitest";

import {
  CreationOrderOutOfRangeError,
  DuplicateCreationOrderError,
  MissingCreationOrderError,
  StoryboardError,
  UnsupportedSchemaVersionError,
} from "../errors";

describe("storyboard error taxonomy (#259)", () => {
  it("DuplicateCreationOrderError carries code + structured details", () => {
    const err = new DuplicateCreationOrderError(
      "01JSBSTORYBOARDXXXXXXXXXXXX",
      5,
      ["01JSCSCENE1XXXXXXXXXXXXXXX", "01JSCSCENE2XXXXXXXXXXXXXXX"],
    );
    expect(err).toBeInstanceOf(StoryboardError);
    expect(err.code).toBe("DuplicateCreationOrder");
    expect(err.storyboardId).toBe("01JSBSTORYBOARDXXXXXXXXXXXX");
    expect(err.creationOrder).toBe(5);
    expect(err.conflictingSceneIds).toEqual([
      "01JSCSCENE1XXXXXXXXXXXXXXX",
      "01JSCSCENE2XXXXXXXXXXXXXXX",
    ]);
    expect(err.message).toContain("Duplicate creation_order=5");
  });

  it("CreationOrderOutOfRangeError carries code + bounds detail", () => {
    const err = new CreationOrderOutOfRangeError(
      "01JSBSTORYBOARDXXXXXXXXXXXX",
      "01JSCSCENE1XXXXXXXXXXXXXXX",
      99,
      3,
    );
    expect(err.code).toBe("CreationOrderOutOfRange");
    expect(err.providedIndex).toBe(99);
    expect(err.tiedGroupSize).toBe(3);
    expect(err.message).toContain("out of range");
  });

  it("MissingCreationOrderError names the offending Scene + Storyboard", () => {
    const err = new MissingCreationOrderError(
      "01JSBSTORYBOARDXXXXXXXXXXXX",
      "01JSCSCENE1XXXXXXXXXXXXXXX",
    );
    expect(err.code).toBe("MissingCreationOrder");
    expect(err.storyboardId).toBe("01JSBSTORYBOARDXXXXXXXXXXXX");
    expect(err.sceneId).toBe("01JSCSCENE1XXXXXXXXXXXXXXX");
    expect(err.message).toContain("creation_order");
  });

  it("UnsupportedSchemaVersionError defaults required minimum to 2", () => {
    const err = new UnsupportedSchemaVersionError(
      "01JSBSTORYBOARDXXXXXXXXXXXX",
      1,
    );
    expect(err.code).toBe("UnsupportedSchemaVersion");
    expect(err.foundVersion).toBe(1);
    expect(err.requiredMinimum).toBe(2);
    expect(err.message).toContain("schema_version=1");
  });
});
