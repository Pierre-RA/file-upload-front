export interface Progress {
  id: string;
  position: number;
  status: string;
  loaded?: number;
  total?: number;
}
