export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

export type PinType = 'input' | 'output' | 'control';

export interface Pin {
  id: string;
  name: string;
  type: PinType;
  activeLow: boolean;
  // Position relative to the component's top-left corner
  x: number;
  y: number;
}

export type ComponentType = 'memory' | 'decoder' | 'source';

export interface BaseComponent extends Rect {
  id: string;
  type: ComponentType;
  title: string;
  pins: Pin[];
  color?: string;
}

export interface MemoryComponent extends BaseComponent {
  type: 'memory';
  wordsStr: string; // e.g., "1K", "2M"
  bits: number;     // e.g., 8, 16
}

export interface DecoderComponent extends BaseComponent {
  type: 'decoder';
  inputs: number;   // e.g., 3
  outputs: number;  // e.g., 8
}

export interface SourceComponent extends BaseComponent {
  type: 'source';
}

export type DiagramComponent = MemoryComponent | DecoderComponent | SourceComponent;

export interface JointNode extends Point {
  id: string;
}

export interface PinReference {
  type: 'pin';
  componentId: string;
  pinId: string;
}

export interface NodeReference {
  type: 'joint';
  jointId: string;
}

export type ConnectionTarget = PinReference | NodeReference;

export interface Connection {
  id: string;
  source: ConnectionTarget;
  target: ConnectionTarget;
  waypoints: Point[];
  label?: string;
  labelOffset?: Point;
  busWidth?: number;
  widthPos?: Point;
  color?: string;
  isSubBus?: boolean;
}
