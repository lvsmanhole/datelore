import { describe, it, expect } from 'vitest';
import { parseDayFromVideoPath, videoCampaign, videoSpecToOverlayText, videoSpecToQueueEntry, orderVideoSpecs } from './video-content';
import { SITE_ORIGIN } from './utm';
import type { VideoPinSpec } from './video-spec';

const spec: VideoPinSpec = {
  id: 'fireworks', kind: 'observance', board: 'On This Day in History',
  kicker: 'Fourth Of July', title: 'July 4 in History',
  lines: ['1776 · The Declaration of Independence is adopted'],
  hashtags: ['#FourthOfJuly'], effect: 'fireworks',
};

describe('parseDayFromVideoPath', () => {
  it('extracts mm/dd from a video-pin path', () => {
    expect(parseDayFromVideoPath('../data/video-pins/07/04/fireworks.json')).toEqual({ mm: 7, dd: 4 });
  });
  it('returns null when there is no MM/DD segment', () => {
    expect(parseDayFromVideoPath('../data/video-pins/fireworks.json')).toBeNull();
  });
});

describe('videoCampaign', () => {
  it('namespaces the UTM campaign by video + kind', () => {
    expect(videoCampaign('observance')).toBe('video-observance');
    expect(videoCampaign('release')).toBe('video-release');
  });
});

describe('videoSpecToOverlayText', () => {
  it('maps a spec to overlay text with the brand foot', () => {
    const t = videoSpecToOverlayText(spec);
    expect(t.title).toBe('July 4 in History');
    expect(t.kicker).toBe('Fourth Of July');
    expect(t.foot).toBe('datelore.com');
    expect(t.lines).toHaveLength(1);
  });
});

describe('videoSpecToQueueEntry', () => {
  const e = videoSpecToQueueEntry(spec, 7, 4);
  it('names the mp4 from day + id', () => {
    expect(e.mp4).toBe('july-4-fireworks.mp4');
  });
  it('builds a UTM day-page link with the video campaign', () => {
    expect(e.link).toContain('/july-4/');
    expect(e.link).toContain('utm_campaign=video-observance');
  });
  it('appends hashtags to the composed description', () => {
    expect(e.description).toContain('Declaration of Independence');
    expect(e.description.trim().endsWith('#FourthOfJuly')).toBe(true);
  });
  it('points the cover at the always-present static born PNG for the day', () => {
    expect(e.cover).toBe(`${SITE_ORIGIN}/pin/july-4-born.png`);
  });
});

describe('orderVideoSpecs', () => {
  it('sorts by calendar date then id', () => {
    const a = { mm: 7, dd: 4, spec: { ...spec, id: 'b' } };
    const b = { mm: 1, dd: 1, spec: { ...spec, id: 'a' } };
    const c = { mm: 7, dd: 4, spec: { ...spec, id: 'a' } };
    expect(orderVideoSpecs([a, b, c]).map((x) => x.spec.id)).toEqual(['a', 'a', 'b']);
  });
});
