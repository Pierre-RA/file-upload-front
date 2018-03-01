import { Status } from './status';

export interface Progress {
  id: string;
  position: number;
  status: Status;
  loaded?: number;
  total?: number;
}
