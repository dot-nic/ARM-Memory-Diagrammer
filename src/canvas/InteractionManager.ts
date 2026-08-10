import { CanvasManager } from './CanvasManager';
import { DiagramState } from '../models/DiagramState';
import { Point, DiagramComponent, Pin, PinReference, ConnectionTarget, Connection } from '../models/types';
import { GridRenderer } from './GridRenderer';

export class InteractionManager {
  private canvasManager: CanvasManager;
  private state: DiagramState;
  private grid: GridRenderer;

  private isDraggingComponent: boolean = false;
  private dragOffset: Point = { x: 0, y: 0 };
  private draggingComponentId: string | null = null;
  private dragStartPositions: Map<string, Point> = new Map();
  private dragStartWaypoints: Map<string, Point[]> = new Map();
  private dragStartJointPositions: Map<string, Point> = new Map();

  // Hover Connection State
  private hoveredConnection: Connection | null = null;
  private hoveredConnectionPos: Point | null = null;

  // Selection Box State
  private isSelectingBox: boolean = false;
  private selectionStartPos: Point | null = null;
  private selectionEndPos: Point | null = null;

  // Connection Drawing State
  private isDrawingConnection: boolean = false;
  private activeConnectionSource: ConnectionTarget | null = null;
  private activeConnectionStartPos: Point | null = null;
  private mouseWorldPos: Point = { x: 0, y: 0 };
  private activeRevertConnection: Connection | null = null;
  private pendingBranchConnection: { connection: Connection, pos: Point } | null = null;

  // Segment Dragging State
  private isDraggingConnectionSegment: boolean = false;
  private draggedConnectionId: string | null = null;
  private draggedSegmentIndex: number = -1;
  private dragSegmentStartPos: Point | null = null;

  // Joint Dragging State
  private isDraggingJoint: boolean = false;
  private draggedJointId: string | null = null;
  private draggedJointAxis: 'x' | 'y' | null = null;

  // Component Resizing State
  private isResizingComponent: boolean = false;
  private resizeHandle: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null = null;
  private resizingComponentId: string | null = null;
  private resizeStartRect: { x: number, y: number, width: number, height: number } | null = null;
  private resizeStartMousePos: Point | null = null;

  // Annotation Dragging State
  private isDraggingAnnotation: boolean = false;
  private draggedAnnotationType: 'label' | 'width' | null = null;
  private draggedAnnotationConnId: string | null = null;
  private dragAnnotationStartOffset: Point | null = null;

  constructor(canvasManager: CanvasManager, state: DiagramState, grid: GridRenderer) {
    this.canvasManager = canvasManager;
    this.state = state;
    this.grid = grid;

    this.attachEvents();
  }

  private attachEvents() {
    const canvas = this.canvasManager.canvas;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Avoid deleting if typing in an input field or textarea
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
      this.state.deleteSelected();
      this.state.commit();
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          this.state.redo();
        } else {
          this.state.undo();
        }
        e.preventDefault();
        return;
      }
      if (e.key === 'y' || e.key === 'Y') {
        this.state.redo();
        e.preventDefault();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
      }
      if (e.key === 'v' || e.key === 'V') {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        this.state.cloneSelectedComponents();
        this.state.commit();
      }
    }
  }

  private getMouseWorldPos(e: MouseEvent): Point {
    const rect = this.canvasManager.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return {
      x: (x - this.canvasManager.offset.x) / this.canvasManager.scale,
      y: (y - this.canvasManager.offset.y) / this.canvasManager.scale
    };
  }

  private hitTestPin(worldPos: Point): { component: DiagramComponent, pin: Pin } | null {
    const components = this.state.getComponents();
    for (const comp of components) {
      for (const pin of comp.pins) {
        const pinWorldX = comp.x + pin.x;
        const pinWorldY = comp.y + pin.y;
        if (Math.abs(worldPos.x - pinWorldX) < 12 && Math.abs(worldPos.y - pinWorldY) < 12) {
          return { component: comp, pin };
        }
      }
    }
    return null;
  }

  private hitTestResizeHandle(worldPos: Point): { component: DiagramComponent, handle: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' } | null {
    const selectedIds = this.state.getSelectedComponentIds();
    if (selectedIds.length !== 1) return null;

    const comp = this.state.getComponents().find(c => c.id === selectedIds[0]);
    if (!comp || comp.locked) return null;

    const handles = {
      top: { x: comp.x + comp.width / 2, y: comp.y - 4 },
      bottom: { x: comp.x + comp.width / 2, y: comp.y + comp.height + 4 },
      left: { x: comp.x - 4, y: comp.y + comp.height / 2 },
      right: { x: comp.x + comp.width + 4, y: comp.y + comp.height / 2 },
      'top-left': { x: comp.x - 4, y: comp.y - 4 },
      'top-right': { x: comp.x + comp.width + 4, y: comp.y - 4 },
      'bottom-left': { x: comp.x - 4, y: comp.y + comp.height + 4 },
      'bottom-right': { x: comp.x + comp.width + 4, y: comp.y + comp.height + 4 }
    };

    for (const [handle, pos] of Object.entries(handles)) {
      if (Math.hypot(worldPos.x - pos.x, worldPos.y - pos.y) < 8) {
        return { component: comp, handle: handle as any };
      }
    }

    return null;
  }

  private hitTestComponent(worldPos: Point): DiagramComponent | null {
    const components = this.state.getComponents();
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      if (
        worldPos.x >= comp.x &&
        worldPos.x <= comp.x + comp.width &&
        worldPos.y >= comp.y &&
        worldPos.y <= comp.y + comp.height
      ) {
        return comp;
      }
    }
    return null;
  }

  private hitTestPadlock(worldPos: Point): DiagramComponent | null {
    const components = this.state.getComponents();
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      const padX = comp.x + comp.width - 12;
      const padY = comp.y + 12;

      if (Math.abs(worldPos.x - padX) < 12 && Math.abs(worldPos.y - padY) < 12) {
        if (comp.locked || this.state.getHoveredComponentId() === comp.id) {
          return comp;
        }
      }
    }
    return null;
  }

  // Simple point to segment distance
  private pointToSegmentDist(p: Point, v: Point, w: Point) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  private hitTestConnection(worldPos: Point): Connection | null {
    const res = this.hitTestConnectionSegment(worldPos);
    return res ? res.connection : null;
  }

  private projectPointOnPath(p: Point, path: Point[]): Point {
    let minDist = Infinity;
    let bestPoint = p;

    for (let i = 0; i < path.length - 1; i++) {
      const v = path[i];
      const w = path[i + 1];
      const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
      let t = 0;
      if (l2 !== 0) {
        t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
      }
      const projX = v.x + t * (w.x - v.x);
      const projY = v.y + t * (w.y - v.y);
      const dist = Math.hypot(p.x - projX, p.y - projY);

      if (dist < minDist) {
        minDist = dist;
        bestPoint = { x: projX, y: projY };
      }
    }
    return bestPoint;
  }

  private hitTestConnectionAnnotations(worldPos: Point): { connection: Connection, type: 'label' | 'width' } | null {
    const connections = this.state.getConnections();

    for (const conn of connections) {
      const path = this.getComputedPath(conn);

      let longestSegmentIndex = 0;
      let maxDist = -1;
      for (let i = 0; i < path.length - 1; i++) {
        const dist = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
        if (dist > maxDist) {
          maxDist = dist;
          longestSegmentIndex = i;
        }
      }

      if (maxDist > 10) {
        const p1 = path[longestSegmentIndex];
        const p2 = path[longestSegmentIndex + 1];

        let lx = (p1.x + p2.x) / 2;
        let ly = (p1.y + p2.y) / 2;

        let wx = lx;
        let wy = ly;

        if (conn.widthPos) {
          wx = conn.widthPos.x;
          wy = conn.widthPos.y;
        }

        if (conn.labelOffset) {
          lx += conn.labelOffset.x;
          ly += conn.labelOffset.y;
        }

        // Width bounding box
        if (conn.busWidth && conn.busWidth > 1) {
          if (Math.abs(worldPos.x - (wx + 8)) < 15 && Math.abs(worldPos.y - (wy - 6)) < 15) {
            return { connection: conn, type: 'width' };
          }
        }

        // Label bounding box
        if (conn.label) {
          const offset = (conn.busWidth && conn.busWidth > 1) ? 20 : 8;
          if (Math.abs(worldPos.x - lx) < 20 && Math.abs(worldPos.y - (ly - offset)) < 15) {
            return { connection: conn, type: 'label' };
          }
        }
      }
    }

    return null;
  }

  private hitTestConnectionSegment(worldPos: Point): { connection: Connection, segmentIndex: number } | null {
    const connections = this.state.getConnections();

    for (const conn of connections) {
      const path = this.getComputedPath(conn);

      for (let i = 0; i < path.length - 1; i++) {
        const dist = this.pointToSegmentDist(worldPos, path[i], path[i + 1]);
        if (dist < 8) {
          return { connection: conn, segmentIndex: i };
        }
      }
    }
    return null;
  }

  private getComputedPath(conn: Connection): Point[] {
    const startPos = this.getTargetPosition(conn.source);
    const endPos = this.getTargetPosition(conn.target);

    if (!startPos || !endPos) return [];

    let path: Point[] = [];
    if (conn.waypoints && conn.waypoints.length >= 4) {
      path = conn.waypoints.map((p: Point) => ({ x: p.x, y: p.y }));
      const oldStart = { ...path[0] };
      const oldEnd = { ...path[path.length - 1] };

      path[0] = { x: startPos.x, y: startPos.y };
      path[path.length - 1] = { x: endPos.x, y: endPos.y };

      if (Math.abs(oldStart.y - path[1].y) < 0.1) path[1].y = startPos.y;
      else path[1].x = startPos.x;

      if (Math.abs(oldEnd.y - path[path.length - 2].y) < 0.1) path[path.length - 2].y = endPos.y;
      else path[path.length - 2].x = endPos.x;
    } else {
      path = this.calculateOrthogonalPath(startPos, endPos);
    }
    return path;
  }

  private hitTestConnectionEndpoint(worldPos: Point): { connection: Connection, endpoint: 'source' | 'target' } | null {
    const connections = this.state.getConnections();
    const selectedIds = this.state.getSelectedConnectionIds();

    // We only test selected connections for endpoints to avoid accidental grabs
    for (const conn of connections) {
      if (!selectedIds.includes(conn.id)) continue;

      if (conn.source.type !== 'joint') {
        const startPos = this.getTargetPosition(conn.source);
        if (startPos && Math.hypot(worldPos.x - startPos.x, worldPos.y - startPos.y) < 8) {
          return { connection: conn, endpoint: 'source' };
        }
      }

      if (conn.target.type !== 'joint') {
        const endPos = this.getTargetPosition(conn.target);
        if (endPos && Math.hypot(worldPos.x - endPos.x, worldPos.y - endPos.y) < 8) {
          return { connection: conn, endpoint: 'target' };
        }
      }
    }
    return null;
  }

  private hitTestJoint(worldPos: Point): string | null {
    const joints = this.state.getJoints();
    for (const joint of joints) {
      if (Math.hypot(worldPos.x - joint.x, worldPos.y - joint.y) < 8) {
        return joint.id;
      }
    }
    return null;
  }

  private getTargetPosition(target: ConnectionTarget): Point | null {
    if (target.type === 'pin') {
      const component = this.state.getComponents().find(c => c.id === target.componentId);
      if (!component) return null;
      const pin = component.pins.find(p => p.id === target.pinId);
      if (!pin) return null;
      return { x: component.x + pin.x, y: component.y + pin.y };
    } else if (target.type === 'joint') {
      const joint = this.state.getJoints().find(j => j.id === target.jointId);
      if (!joint) return null;
      return { x: joint.x, y: joint.y };
    }
    return null;
  }

  private calculateOrthogonalPath(start: Point, end: Point): Point[] {
    const midX = start.x + (end.x - start.x) / 2;
    return [
      { x: start.x, y: start.y },
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      { x: end.x, y: end.y }
    ];
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // Only left click

    const worldPos = this.getMouseWorldPos(e);
    this.mouseWorldPos = worldPos;

    if (e.shiftKey) {
      this.isSelectingBox = true;
      this.selectionStartPos = worldPos;
      this.selectionEndPos = worldPos;
      this.state.setSelectedComponentIds([]);
      this.state.setSelectedConnectionIds([]);
      e.preventDefault();
      return;
    }

    // 0.5. Try to hit resize handle
    const hitHandle = this.hitTestResizeHandle(worldPos);
    if (hitHandle) {
      this.isResizingComponent = true;
      this.resizingComponentId = hitHandle.component.id;
      this.resizeHandle = hitHandle.handle;
      this.resizeStartRect = { x: hitHandle.component.x, y: hitHandle.component.y, width: hitHandle.component.width, height: hitHandle.component.height };
      this.resizeStartMousePos = worldPos;
      e.preventDefault();
      return;
    }

    // 0.75 Try to hit padlock
    const hitPadlock = this.hitTestPadlock(worldPos);
    if (hitPadlock) {
      const newLockedState = !hitPadlock.locked;
      const selectedIds = this.state.getSelectedComponentIds();

      if (selectedIds.includes(hitPadlock.id) && selectedIds.length > 1) {
        selectedIds.forEach(id => this.state.setComponentLock(id, newLockedState, true));
        this.state.commit();
        this.canvasManager.render();
      } else {
        this.state.setComponentLock(hitPadlock.id, newLockedState);
        this.state.commit();
        this.canvasManager.render();
      }
      e.preventDefault();
      return;
    }

    // 0. Try to hit a connection endpoint handle (has highest priority)
    const hitEndpoint = this.hitTestConnectionEndpoint(worldPos);
    if (hitEndpoint) {
      this.activeRevertConnection = hitEndpoint.connection;
      this.state.removeConnection(hitEndpoint.connection.id); // Temporarily hide it

      this.isDrawingConnection = true;
      // If we grabbed the source, the fixed part is the target, and vice versa.
      this.activeConnectionSource = hitEndpoint.endpoint === 'source' ? hitEndpoint.connection.target : hitEndpoint.connection.source;
      this.activeConnectionStartPos = this.getTargetPosition(this.activeConnectionSource);

      e.preventDefault();
      return;
    }

    // 1. Try to hit a Pin to start drawing a connection
    const hitPin = this.hitTestPin(worldPos);
    if (hitPin) {
      this.isDrawingConnection = true;
      this.activeConnectionSource = { type: 'pin', componentId: hitPin.component.id, pinId: hitPin.pin.id };
      this.activeConnectionStartPos = { x: hitPin.component.x + hitPin.pin.x, y: hitPin.component.y + hitPin.pin.y };
      e.preventDefault();
      return;
    }

    // 1.5 Try to hit a JointNode to drag it along its axis
    const hitJointId = this.hitTestJoint(worldPos);
    if (hitJointId) {
      // Find the collinear connections that form the main bus
      const conns = this.state.getConnections().filter(c =>
        (c.source.type === 'joint' && c.source.jointId === hitJointId) ||
        (c.target.type === 'joint' && c.target.jointId === hitJointId)
      );

      // Determine the axis. If there's a horizontal segment and a vertical one,
      // we can check the path of the connections attached.
      // A simple heuristic: if it's connected to two collinear segments, we can infer axis.
      // But let's just allow dragging in X and Y and snap it to grid for simplicity,
      // or we can just restrict to the axis of the longest connected segment.
      // For now, allow both X and Y drag, it will naturally slide if constrained, or just free drag.
      // But the user requested "junto con el eje". We will determine axis by checking the two connections
      // that have the same busWidth/color (the main bus).

      this.isDraggingJoint = true;
      this.draggedJointId = hitJointId;

      let axis: 'x' | 'y' | null = null;
      const joint = this.state.getJoints().find(j => j.id === hitJointId);
      
      if (joint) {
        for (let i = 0; i < conns.length; i++) {
          for (let j = i + 1; j < conns.length; j++) {
            const path1 = this.getComputedPath(conns[i]);
            const path2 = this.getComputedPath(conns[j]);
            
            if (path1.length >= 2 && path2.length >= 2) {
              const p1 = conns[i].target.type === 'joint' && conns[i].target.jointId === hitJointId 
                  ? path1[path1.length - 2] : path1[1];
              const p2 = conns[j].target.type === 'joint' && conns[j].target.jointId === hitJointId 
                  ? path2[path2.length - 2] : path2[1];
                  
              if (Math.abs(p1.y - joint.y) < 5 && Math.abs(p2.y - joint.y) < 5) {
                axis = 'x';
                break;
              } else if (Math.abs(p1.x - joint.x) < 5 && Math.abs(p2.x - joint.x) < 5) {
                axis = 'y';
                break;
              }
            }
          }
          if (axis) break;
        }
      }
      this.draggedJointAxis = axis;

      e.preventDefault();
      return;
    }

    // 2. Try to hit a component to drag it
    const hitComponent = this.hitTestComponent(worldPos);
    if (hitComponent) {
      let selectedIds = this.state.getSelectedComponentIds();
      // If we clicked on an unselected component, select only it and clear connections
      if (!selectedIds.includes(hitComponent.id)) {
        this.state.setSelectedConnectionIds([]);
        this.state.setSelectedComponentIds([hitComponent.id]);
        selectedIds = [hitComponent.id];
      }

      const anyLocked = selectedIds.some(id => {
        const c = this.state.getComponents().find(comp => comp.id === id);
        return c && c.locked;
      });

      if (anyLocked) {
        e.preventDefault();
        return;
      }

      this.isDraggingComponent = true;
      this.draggingComponentId = hitComponent.id;

      // Save starting positions for all selected components
      this.dragStartPositions.clear();
      this.dragStartWaypoints.clear();
      this.dragStartJointPositions.clear();
      this.state.getComponents().forEach(c => {
        if (selectedIds.includes(c.id)) {
          this.dragStartPositions.set(c.id, { x: c.x, y: c.y });
        }
      });
      // Find all connections that attach to these components
      const selectedConnectionIds = this.state.getSelectedConnectionIds();
      this.state.getConnections().forEach(conn => {
        const sourceHit = conn.source.type === 'pin' && selectedIds.includes(conn.source.componentId);
        const targetHit = conn.target.type === 'pin' && selectedIds.includes(conn.target.componentId);

        if (sourceHit || targetHit) {
          const isBusOrSubBus = (conn.busWidth && conn.busWidth > 1) || conn.isSubBus;
          if (!isBusOrSubBus || selectedConnectionIds.includes(conn.id)) {
            if (conn.waypoints && conn.waypoints.length > 0) {
              this.dragStartWaypoints.set(conn.id, conn.waypoints.map(w => ({ ...w })));
            }
            if (conn.isSubBus) {
              const jointTarget = conn.source.type === 'joint' ? conn.source : (conn.target.type === 'joint' ? conn.target : null);
              if (jointTarget) {
                const joint = this.state.getJoints().find(j => j.id === jointTarget.jointId);
                if (joint) {
                  this.dragStartJointPositions.set(joint.id, { x: joint.x, y: joint.y });
                }
              }
            }
          }
        }
      });

      this.dragOffset = {
        x: worldPos.x - hitComponent.x,
        y: worldPos.y - hitComponent.y
      };
      e.preventDefault();
      return;
    }

    // 2.5 Try to hit the hover connection point to branch
    if (this.hoveredConnection && this.hoveredConnectionPos) {
      if (Math.hypot(worldPos.x - this.hoveredConnectionPos.x, worldPos.y - this.hoveredConnectionPos.y) < 12) {
        this.isDrawingConnection = true;
        this.pendingBranchConnection = {
          connection: this.hoveredConnection,
          pos: { ...this.hoveredConnectionPos }
        };
        this.activeConnectionSource = null;
        this.activeConnectionStartPos = { ...this.hoveredConnectionPos };

        this.hoveredConnection = null;
        this.hoveredConnectionPos = null;
        e.preventDefault();
        return;
      }
    }

    // 2.7 Try to hit an annotation on a connection
    const hitAnnotation = this.hitTestConnectionAnnotations(worldPos);
    if (hitAnnotation) {
      this.isDraggingAnnotation = true;
      this.draggedAnnotationType = hitAnnotation.type;
      this.draggedAnnotationConnId = hitAnnotation.connection.id;

      const conn = hitAnnotation.connection;
      if (hitAnnotation.type === 'label') {
        this.dragAnnotationStartOffset = conn.labelOffset ? { ...conn.labelOffset } : { x: 0, y: 0 };
      } else {
        // for width, we don't strictly need a start offset since we snap it to the path based on absolute mouse pos
        this.dragAnnotationStartOffset = null;
      }

      this.mouseWorldPos = worldPos;

      e.preventDefault();
      return;
    }

    // 3. Try to hit a connection to select it or drag a segment
    const hitSegment = this.hitTestConnectionSegment(worldPos);
    if (hitSegment) {
      this.state.setSelectedComponentIds([]);
      this.state.setSelectedConnectionIds([hitSegment.connection.id]);

      this.isDraggingConnectionSegment = true;
      this.draggedConnectionId = hitSegment.connection.id;
      this.draggedSegmentIndex = hitSegment.segmentIndex;
      this.dragSegmentStartPos = worldPos;

      if (!hitSegment.connection.waypoints || hitSegment.connection.waypoints.length < 4) {
        hitSegment.connection.waypoints = this.getComputedPath(hitSegment.connection);
      }

      e.preventDefault();
      return;
    }

    // Deselect
    this.state.setSelectedComponentIds([]);
    this.state.setSelectedConnectionIds([]);
  }

  private onMouseMove(e: MouseEvent) {
    const worldPos = this.getMouseWorldPos(e);
    this.mouseWorldPos = worldPos;

    if (this.isDraggingJoint && this.draggedJointId) {
      const joint = this.state.getJoints().find(j => j.id === this.draggedJointId);
      if (joint) {
        let newX = worldPos.x;
        let newY = worldPos.y;

        if (this.draggedJointAxis === 'x') {
          newY = joint.y; // constrain Y
        } else if (this.draggedJointAxis === 'y') {
          newX = joint.x; // constrain X
        }

        joint.x = this.grid.snap(newX);
        joint.y = this.grid.snap(newY);

        this.canvasManager.render();
      }
      return;
    }

    if (!this.isDraggingComponent && !this.isDraggingConnectionSegment && !this.isDrawingConnection && !this.isResizingComponent && !this.isSelectingBox && !this.isDraggingJoint && !this.isDraggingAnnotation) {
      const hitSegment = this.hitTestConnectionSegment(worldPos);
      if (hitSegment && !this.state.getSelectedConnectionIds().includes(hitSegment.connection.id)) {
        this.hoveredConnection = hitSegment.connection;
        const path = this.getComputedPath(hitSegment.connection);

        let snappedToCorner = false;
        for (let i = 1; i < path.length - 1; i++) {
          if (Math.hypot(worldPos.x - path[i].x, worldPos.y - path[i].y) < 15) {
            this.hoveredConnectionPos = { x: path[i].x, y: path[i].y };
            snappedToCorner = true;
            break;
          }
        }

        if (!snappedToCorner) {
          const p1 = path[hitSegment.segmentIndex];
          const p2 = path[hitSegment.segmentIndex + 1];
          this.hoveredConnectionPos = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
          };
        }
      } else {
        this.hoveredConnection = null;
        this.hoveredConnectionPos = null;
      }

      const hitComponent = this.hitTestComponent(worldPos);
      this.state.setHoveredComponentId(hitComponent ? hitComponent.id : null);

      this.canvasManager.render();
    }

    if (this.isDraggingAnnotation && this.draggedAnnotationConnId) {
      const conn = this.state.getConnections().find(c => c.id === this.draggedAnnotationConnId);
      if (conn) {
        if (this.draggedAnnotationType === 'label' && this.dragAnnotationStartOffset) {
          const path = this.getComputedPath(conn);
          let longestSegmentIndex = 0;
          let maxDist = -1;
          for (let i = 0; i < path.length - 1; i++) {
            const dist = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
            if (dist > maxDist) { maxDist = dist; longestSegmentIndex = i; }
          }

          if (maxDist > 10) {
            const p1 = path[longestSegmentIndex];
            const p2 = path[longestSegmentIndex + 1];
            const baseLx = (p1.x + p2.x) / 2;
            const baseLy = (p1.y + p2.y) / 2;

            // The offset is simply mouse pos minus base pos
            const newOffset = {
              x: worldPos.x - baseLx,
              y: worldPos.y - baseLy
            };
            this.state.updateConnectionAnnotations(conn.id, newOffset, conn.widthPos, true);
          }
        } else if (this.draggedAnnotationType === 'width') {
          const path = this.getComputedPath(conn);
          const projected = this.projectPointOnPath(worldPos, path);
          this.state.updateConnectionAnnotations(conn.id, conn.labelOffset, projected, true);
        }
        this.canvasManager.render();
      }
      return;
    }

    if (this.isSelectingBox) {
      this.selectionEndPos = worldPos;
      this.canvasManager.render();
      return;
    }

    if (this.isDrawingConnection) {
      // Just update mouse pos and re-render
      this.canvasManager.render(); // This will trigger drawActiveConnection if we hook it up
      return;
    }

    if (this.isResizingComponent && this.resizingComponentId && this.resizeStartRect && this.resizeHandle && this.resizeStartMousePos) {
      let { x, y, width, height } = this.resizeStartRect;
      const dx = worldPos.x - this.resizeStartMousePos.x;
      const dy = worldPos.y - this.resizeStartMousePos.y;

      const snappedDx = this.grid.snap(dx);
      const snappedDy = this.grid.snap(dy);

      if (this.resizeHandle.includes('right')) {
        width = Math.max(40, width + dx);
        width = this.grid.snap(width);
      }
      if (this.resizeHandle.includes('bottom')) {
        height = Math.max(40, height + dy);
        height = this.grid.snap(height);
      }
      if (this.resizeHandle.includes('left')) {
        const newWidth = Math.max(40, width - snappedDx);
        if (newWidth > 40 || width - snappedDx === 40) {
          x += snappedDx;
          width = newWidth;
        }
      }
      if (this.resizeHandle.includes('top')) {
        const newHeight = Math.max(40, height - snappedDy);
        if (newHeight > 40 || height - snappedDy === 40) {
          y += snappedDy;
          height = newHeight;
        }
      }

      this.state.updateComponentRect(this.resizingComponentId, x, y, width, height);
      return;
    }

    if (this.isDraggingConnectionSegment && this.draggedConnectionId && this.dragSegmentStartPos) {
      const conn = this.state.getConnections().find(c => c.id === this.draggedConnectionId);
      if (conn && conn.waypoints && conn.waypoints.length >= 4) {
        const dx = worldPos.x - this.dragSegmentStartPos.x;
        const dy = worldPos.y - this.dragSegmentStartPos.y;

        const i = this.draggedSegmentIndex;
        const p1 = conn.waypoints[i];
        const p2 = conn.waypoints[i + 1];

        const isHorizontal = Math.abs(p1.y - p2.y) < 0.1;

        if (isHorizontal) {
          p1.y += dy;
          p2.y += dy;
        } else {
          p1.x += dx;
          p2.x += dx;
        }

        this.dragSegmentStartPos = worldPos;
        this.canvasManager.render();
      }
      return;
    }

    if (this.isDraggingComponent && this.draggingComponentId) {
      let dx = worldPos.x - this.dragOffset.x - this.dragStartPositions.get(this.draggingComponentId)!.x;
      let dy = worldPos.y - this.dragOffset.y - this.dragStartPositions.get(this.draggingComponentId)!.y;

      const selectedIds = this.state.getSelectedComponentIds();

      const startPos = this.dragStartPositions.get(this.draggingComponentId);
      let snappedDx = 0;
      let snappedDy = 0;
      if (startPos) {
        let newX = this.grid.snap(startPos.x + dx);
        let newY = this.grid.snap(startPos.y + dy);
        snappedDx = newX - startPos.x;
        snappedDy = newY - startPos.y;
      }

      selectedIds.forEach(id => {
        const p = this.dragStartPositions.get(id);
        if (p) {
          this.state.updateComponentPosition(id, p.x + snappedDx, p.y + snappedDy);
        }
      });

      this.dragStartWaypoints.forEach((originalWaypoints, connId) => {
        const conn = this.state.getConnections().find(c => c.id === connId);
        if (conn && conn.waypoints) {
          conn.waypoints = originalWaypoints.map(w => ({ x: w.x + snappedDx, y: w.y + snappedDy }));
        }
      });

      this.dragStartJointPositions.forEach((startPos, jointId) => {
        const joint = this.state.getJoints().find(j => j.id === jointId);
        if (joint) {
          joint.x = startPos.x + snappedDx;
          joint.y = startPos.y + snappedDy;

          this.state.getConnections().forEach(c => {
            if (!c.isSubBus && ((c.source.type === 'joint' && c.source.jointId === joint.id) ||
              (c.target.type === 'joint' && c.target.jointId === joint.id))) {
              c.waypoints = [];
            }
          });
        }
      });
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (this.isSelectingBox && this.selectionStartPos && this.selectionEndPos) {
      const minX = Math.min(this.selectionStartPos.x, this.selectionEndPos.x);
      const maxX = Math.max(this.selectionStartPos.x, this.selectionEndPos.x);
      const minY = Math.min(this.selectionStartPos.y, this.selectionEndPos.y);
      const maxY = Math.max(this.selectionStartPos.y, this.selectionEndPos.y);

      const components = this.state.getComponents();
      const selectedIds = components.filter(c =>
        c.x + c.width >= minX && c.x <= maxX &&
        c.y + c.height >= minY && c.y <= maxY
      ).map(c => c.id);

      this.state.setSelectedComponentIds(selectedIds);

      const connections = this.state.getConnections();
      const selectedConnIds = connections.filter(conn => {
        const path = this.getComputedPath(conn);
        return path.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
      }).map(c => c.id);

      this.state.setSelectedConnectionIds(selectedConnIds);

      this.isSelectingBox = false;
      this.selectionStartPos = null;
      this.selectionEndPos = null;
      this.canvasManager.render();
      return;
    }

    if (this.isDraggingJoint) {
      this.isDraggingJoint = false;
      this.draggedJointId = null;
      this.draggedJointAxis = null;
      this.state.commit();
      return;
    }

    if (this.isDraggingAnnotation) {
      this.isDraggingAnnotation = false;
      this.draggedAnnotationType = null;
      this.draggedAnnotationConnId = null;
      this.dragAnnotationStartOffset = null;
      this.state.commit();
      return;
    }

    if (this.isDrawingConnection && (this.activeConnectionSource || this.pendingBranchConnection)) {
      const worldPos = this.getMouseWorldPos(e);
      let connectionCreated = false;

      // Try to connect to a pin
      const targetPin = this.hitTestPin(worldPos);
      if (targetPin) {
        if (this.pendingBranchConnection) {
          // We found a pin, so we finally execute the branch creation!
          const parentConn = this.pendingBranchConnection.connection;
          const pos = this.pendingBranchConnection.pos;
          let jointId = Math.random().toString(36).substring(2, 9);
          this.state.addJoint({
            id: jointId,
            x: pos.x,
            y: pos.y
          });

          if (!e.shiftKey) {

            // Always split the parent connection
            let wp1: Point[] = [];
            let wp2: Point[] = [];

            const path = this.getComputedPath(parentConn);
            let splitIndex = -1;
            for (let i = 0; i < path.length - 1; i++) {
              if (this.pointToSegmentDist(pos, path[i], path[i + 1]) < 1) {
                splitIndex = i;
                break;
              }
            }
            if (splitIndex !== -1) {
              wp1 = path.slice(0, splitIndex + 1);
              wp1.push({ x: pos.x, y: pos.y });
              while (wp1.length < 4) wp1.splice(1, 0, { ...wp1[1] });

              wp2 = [{ x: pos.x, y: pos.y }];
              wp2.push(...path.slice(splitIndex + 1));
              while (wp2.length < 4) wp2.splice(1, 0, { ...wp2[1] });
            }

            const oldTarget = parentConn.target;
            parentConn.target = { type: 'joint', jointId };
            if (wp1.length > 0) parentConn.waypoints = wp1;

            this.state.addConnection({
              id: Math.random().toString(36).substring(2, 9),
              source: { type: 'joint', jointId },
              target: oldTarget,
              waypoints: wp2,
              color: parentConn.color,
              isSubBus: true
            });
          }

          // Create the sub bus
          this.state.addConnection({
            id: Math.random().toString(36).substring(2, 9),
            source: { type: 'joint', jointId },
            target: { type: 'pin', componentId: targetPin.component.id, pinId: targetPin.pin.id },
            waypoints: [],
            color: parentConn.color,
            isSubBus: true
          });
          connectionCreated = true;
        } else if (this.activeConnectionSource) {
          // Prevent connecting to self
          if (!(targetPin.component.id === (this.activeConnectionSource as PinReference).componentId && targetPin.pin.id === (this.activeConnectionSource as PinReference).pinId)) {
            this.state.addConnection({
              id: this.activeRevertConnection ? this.activeRevertConnection.id : Math.random().toString(36).substring(2, 9),
              source: this.activeConnectionSource,
              target: { type: 'pin', componentId: targetPin.component.id, pinId: targetPin.pin.id },
              waypoints: [],
              label: this.activeRevertConnection?.label,
              busWidth: this.activeRevertConnection?.busWidth,
              color: this.activeRevertConnection?.color
            });
            connectionCreated = true;
          }
        }
      } else if (!this.pendingBranchConnection && this.activeConnectionSource) {
        // Try to connect to a connection (Joint Node)
        const targetConnection = this.hitTestConnection(worldPos);
        if (targetConnection) {
          const jointId = Math.random().toString(36).substring(2, 9);
          this.state.addJoint({
            id: jointId,
            x: worldPos.x,
            y: worldPos.y
          });
          
          if (!e.shiftKey) {

            // Always split the target connection
            let wp1: Point[] = [];
            let wp2: Point[] = [];

            const path = this.getComputedPath(targetConnection);
            let splitIndex = -1;
            for (let i = 0; i < path.length - 1; i++) {
              if (this.pointToSegmentDist(worldPos, path[i], path[i + 1]) < 8) {
                splitIndex = i;
                break;
              }
            }
            if (splitIndex !== -1) {
              wp1 = path.slice(0, splitIndex + 1);
              wp1.push({ x: worldPos.x, y: worldPos.y });
              while (wp1.length < 4) wp1.splice(1, 0, { ...wp1[1] });

              wp2 = [{ x: worldPos.x, y: worldPos.y }];
              wp2.push(...path.slice(splitIndex + 1));
              while (wp2.length < 4) wp2.splice(1, 0, { ...wp2[1] });
            }

            // Redirect old connection target to joint
            const oldTarget = targetConnection.target;
            targetConnection.target = { type: 'joint', jointId };
            if (wp1.length > 0) targetConnection.waypoints = wp1;

            // Create connection from joint to old target
            this.state.addConnection({
              id: Math.random().toString(36).substring(2, 9),
              source: { type: 'joint', jointId },
              target: oldTarget,
              waypoints: wp2,
              color: targetConnection.color,
              isSubBus: true
            });
          }

          // Create new connection from our source to joint
          this.state.addConnection({
            id: this.activeRevertConnection ? this.activeRevertConnection.id : Math.random().toString(36).substring(2, 9),
            source: this.activeConnectionSource,
            target: { type: 'joint', jointId },
            waypoints: [],
            label: this.activeRevertConnection?.label,
            busWidth: this.activeRevertConnection?.busWidth,
            color: this.activeRevertConnection?.color || targetConnection.color,
            isSubBus: true
          });
          connectionCreated = true;
        }
      }

      if (!connectionCreated && this.activeRevertConnection) {
        // Revert to original connection if dropped in empty space
        this.state.addConnection(this.activeRevertConnection);
      }

      this.isDrawingConnection = false;
      this.activeConnectionSource = null;
      this.activeConnectionStartPos = null;
      this.pendingBranchConnection = null;
      this.activeRevertConnection = null;
      this.canvasManager.render();
    }

    if (this.isDraggingConnectionSegment) {
      this.isDraggingConnectionSegment = false;
      this.draggedConnectionId = null;
      this.draggedSegmentIndex = -1;
      this.dragSegmentStartPos = null;
      this.state.updateConnectionProps(
        this.state.getSelectedConnectionIds()[0],
        this.state.getConnections().find(c => c.id === this.state.getSelectedConnectionIds()[0])?.label || '',
        this.state.getConnections().find(c => c.id === this.state.getSelectedConnectionIds()[0])?.busWidth,
        this.state.getConnections().find(c => c.id === this.state.getSelectedConnectionIds()[0])?.color
      );
    }

    if (this.isResizingComponent) {
      this.isResizingComponent = false;
      this.resizingComponentId = null;
      this.resizeHandle = null;
      this.resizeStartRect = null;
      this.resizeStartMousePos = null;
    }

    this.isDraggingComponent = false;
    this.draggingComponentId = null;
    this.dragStartPositions.clear();
    this.dragStartWaypoints.clear();

    this.state.commit();
  }

  // Called by main.ts or CanvasManager to draw ephemeral UI
  public draw(ctx: CanvasRenderingContext2D) {
    if (this.hoveredConnection && this.hoveredConnectionPos) {
      const color = this.hoveredConnection.color || '#3b82f6';
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(this.hoveredConnectionPos.x, this.hoveredConnectionPos.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.hoveredConnectionPos.x - 3, this.hoveredConnectionPos.y);
      ctx.lineTo(this.hoveredConnectionPos.x + 3, this.hoveredConnectionPos.y);
      ctx.moveTo(this.hoveredConnectionPos.x, this.hoveredConnectionPos.y - 3);
      ctx.lineTo(this.hoveredConnectionPos.x, this.hoveredConnectionPos.y + 3);
      ctx.stroke();
      ctx.restore();
    }

    if (this.isDrawingConnection && this.activeConnectionStartPos) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#9ca3af'; // Gray for active drawing
      ctx.setLineDash([5, 5]);

      const path = this.calculateOrthogonalPath(this.activeConnectionStartPos, this.mouseWorldPos);

      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (this.isSelectingBox && this.selectionStartPos && this.selectionEndPos) {
      ctx.save();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;

      const width = this.selectionEndPos.x - this.selectionStartPos.x;
      const height = this.selectionEndPos.y - this.selectionStartPos.y;

      ctx.fillRect(this.selectionStartPos.x, this.selectionStartPos.y, width, height);
      ctx.strokeRect(this.selectionStartPos.x, this.selectionStartPos.y, width, height);

      ctx.restore();
    }
  }
}
