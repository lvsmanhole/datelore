// Shared types for the baked day dataset. Kept separate from dates.ts so the
// build-time transform (src/lib/transform.ts) and the data loader can both
// import them without a cycle.
export interface DayEvent { year: number; title: string; desc: string; tag: string; }
export interface DayBirth { monogram: string; name: string; year: number; line: string; }
export interface DayDeath { year: number; text: string; }
export interface DayObservance { text: string; }
export interface DayEntry {
  lede: string;
  events: DayEvent[];
  births: DayBirth[];
  deaths: DayDeath[];
  observances: DayObservance[];
}
