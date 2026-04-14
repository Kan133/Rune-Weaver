/**
 * War3 Adapter - Classic workspace file contract
 *
 * This is intentionally a thin contract for B-group's first slice.
 * It describes which files the scanner should care about before full parsing exists.
 */

export const CLASSIC_WAR3_REQUIRED_FILES = [
  "war3map.w3i",
  "war3map.w3e",
] as const;

export const CLASSIC_WAR3_SCRIPT_FILES = [
  "war3map.j",
  "war3map.lua",
] as const;

export const CLASSIC_WAR3_P0_OPTIONAL_FILES = [
  "war3mapunits.doo",
  "war3map.doo",
  "war3mapMisc.txt",
] as const;

export const CLASSIC_WAR3_P1_OPTIONAL_FILES = [
  "war3map.w3u",
  "war3map.w3a",
  "war3map.w3t",
  "war3map.w3q",
  "war3map.w3b",
  "war3map.w3d",
  "war3map.w3h",
  "war3map.imp",
  "war3map.wts",
  "war3map.wct",
  "war3map.wtg",
  "war3map.wpm",
  "war3map.shd",
  "war3mapPreview.tga",
  "war3mapMap.blp",
  "war3mapmap.blp",
] as const;

export type ClassicWar3RequiredFile = (typeof CLASSIC_WAR3_REQUIRED_FILES)[number];
export type ClassicWar3ScriptFile = (typeof CLASSIC_WAR3_SCRIPT_FILES)[number];
export type ClassicWar3P0OptionalFile = (typeof CLASSIC_WAR3_P0_OPTIONAL_FILES)[number];
export type ClassicWar3P1OptionalFile = (typeof CLASSIC_WAR3_P1_OPTIONAL_FILES)[number];
