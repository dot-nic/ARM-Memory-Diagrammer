import { DiagramComponent, MemoryComponent, DecoderComponent, LogicGateComponent, LogicGateType, Connection, JointNode, Point } from './types';

type Listener = () => void;

export class DiagramState {
  private components: DiagramComponent[] = [];
  private connections: Connection[] = [];
  private joints: JointNode[] = [];
  private selectedComponentIds: string[] = [];
  private selectedConnectionIds: string[] = [];
  private listeners: Set<Listener> = new Set();

  private history: string[] = [];
  private historyIndex: number = -1;

  private hoveredComponentId: string | null = null;

  constructor() {
    this.commit(); // Initial empty state
  }

  public commit() {
    const newState = this.exportState();
    if (this.history.length > 0 && this.history[this.historyIndex] === newState) {
      return; // No changes
    }
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(newState);
    this.historyIndex++;
  }

  public undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.importStateWithoutCommit(this.history[this.historyIndex]);
    }
  }

  public redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.importStateWithoutCommit(this.history[this.historyIndex]);
    }
  }

  private importStateWithoutCommit(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);
      this.components = data.components || [];
      this.connections = data.connections || [];
      this.joints = data.joints || [];
      this.selectedComponentIds = [];
      this.selectedConnectionIds = [];
      this.notify();
    } catch (e) {
      console.error("Error importing state:", e);
    }
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public addComponent(component: DiagramComponent) {
    this.components.push(component);
    this.notify();
  }

  public getComponents(): DiagramComponent[] {
    return this.components;
  }

  public getConnections(): Connection[] {
    return this.connections;
  }

  public getJoints(): JointNode[] {
    return this.joints;
  }

  public addConnection(connection: Connection) {
    this.connections.push(connection);
    this.notify();
  }

  public removeConnection(id: string) {
    this.connections = this.connections.filter(c => c.id !== id);
    this.notify();
  }

  public addJoint(joint: JointNode) {
    this.joints.push(joint);
    this.notify();
  }

  public getSelectedComponentIds(): string[] {
    return this.selectedComponentIds;
  }

  public setSelectedComponentIds(ids: string[]) {
    this.selectedComponentIds = [...ids];
    this.notify();
  }

  public getSelectedConnectionIds(): string[] {
    return this.selectedConnectionIds;
  }

  public setSelectedConnectionIds(ids: string[]) {
    this.selectedConnectionIds = [...ids];
    this.notify();
  }

  public getHoveredComponentId(): string | null {
    return this.hoveredComponentId;
  }

  public setHoveredComponentId(id: string | null, suppressNotify: boolean = false) {
    if (this.hoveredComponentId !== id) {
      this.hoveredComponentId = id;
      if (!suppressNotify) this.notify();
    }
  }

  public updateComponentPosition(id: string, x: number, y: number) {
    const component = this.components.find(c => c.id === id);
    if (component) {
      component.x = x;
      component.y = y;
      this.notify();
    }
  }

  public updateComponentRect(id: string, x: number, y: number, width: number, height: number) {
    const comp = this.components.find(c => c.id === id);
    if (!comp) return;

    const oldWidth = comp.width;
    const oldHeight = comp.height;

    comp.x = x;
    comp.y = y;
    comp.width = width;
    comp.height = height;

    // Scale pins position proportionally
    comp.pins.forEach(pin => {
      if (pin.x >= oldWidth - 1) pin.x = width;
      else if (pin.x > 0) pin.x = (pin.x / oldWidth) * width;

      if (pin.y >= oldHeight - 1) pin.y = height;
      else if (pin.y > 0) pin.y = (pin.y / oldHeight) * height;
    });

    this.notify();
  }

  public updateComponentBaseProps(id: string, width?: number, height?: number, color?: string, suppressNotify: boolean = false) {
    const comp = this.components.find(c => c.id === id);
    if (!comp) return;

    if (color !== undefined) comp.color = color;

    if (width !== undefined && height !== undefined) {
      const oldWidth = comp.width;
      const oldHeight = comp.height;

      comp.width = Math.max(40, width);
      comp.height = Math.max(40, height);

      // Scale pins position proportionally
      comp.pins.forEach(pin => {
        if (pin.x >= oldWidth - 1) pin.x = comp.width;
        else if (pin.x > 0) pin.x = (pin.x / oldWidth) * comp.width;

        if (pin.y >= oldHeight - 1) pin.y = comp.height;
        else if (pin.y > 0) pin.y = (pin.y / oldHeight) * comp.height;
      });
    }

    if (!suppressNotify) this.notify();
  }

  public updateMemoryProps(id: string, title: string, wordsStr: string, bits: number, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === id && c.type === 'memory') as MemoryComponent;
    if (component) {
      component.title = title;
      component.wordsStr = wordsStr;
      component.bits = bits;
      if (!suppressNotify) this.notify();
    }
  }

  public updateDecoderProps(id: string, inputs: number, outputs: number, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === id && c.type === 'decoder') as DecoderComponent;
    if (component) {
      component.inputs = inputs;
      component.outputs = outputs;
      component.title = `Decodificador ${inputs}x${outputs}`;

      // Recalculate height based on the maximum number of pins on either side (inputs vs outputs)
      // We need some padding on top and bottom. Let's say 20px per pin + 20px padding.
      const maxPins = Math.max(inputs, outputs);
      component.height = Math.max(100, maxPins * 25 + 40);

      // Regenerate Pins
      component.pins = [];

      // Control Pin (Enable)
      component.pins.push({
        id: Math.random().toString(36).substring(2, 9),
        name: 'En',
        type: 'control',
        activeLow: true, // Default to active low, though we could preserve previous state
        x: 0,
        y: 20
      });

      // Input Pins (left side)
      const inputStartY = (component.height - (inputs * 20)) / 2 + 10;
      for (let i = 0; i < inputs; i++) {
        component.pins.push({
          id: Math.random().toString(36).substring(2, 9),
          name: `A${i}`,
          type: 'input',
          activeLow: false,
          x: 0,
          y: inputStartY + i * 20
        });
      }

      // Output Pins (right side)
      const outputStartY = (component.height - (outputs * 20)) / 2 + 10;
      for (let i = 0; i < outputs; i++) {
        component.pins.push({
          id: Math.random().toString(36).substring(2, 9),
          name: `Q${i}`,
          type: 'output',
          activeLow: false,
          x: component.width,
          y: outputStartY + i * 20
        });
      }

      if (!suppressNotify) this.notify();
    }
  }

  public updateSourceProps(id: string, title: string, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === id && c.type === 'source');
    if (component) {
      component.title = title;
      const newWidth = Math.max(40, title.length * 10 + 20);
      component.width = newWidth;
      if (component.pins.length > 0) {
        component.pins[0].x = newWidth;
      }
      if (!suppressNotify) this.notify();
    }
  }

  public updateLogicGateProps(id: string, gateType: LogicGateType, negated: boolean, inputs: number, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === id && c.type === 'logicGate') as LogicGateComponent;
    if (component) {
      if (gateType === 'NOT') {
        inputs = 1; // NOT gates always have exactly 1 input
      }
      
      component.gateType = gateType;
      component.negated = negated;
      component.inputs = inputs;
      
      // Fixed width, dynamic height based on inputs
      component.width = 60;
      component.height = Math.max(60, inputs * 20 + 20);
      
      // Regenerate pins
      component.pins = [];
      
      // Input Pins (left side)
      const inputStartY = (component.height - (inputs * 20)) / 2 + 10;
      for (let i = 0; i < inputs; i++) {
        component.pins.push({
          id: Math.random().toString(36).substring(2, 9),
          name: inputs === 1 ? 'In' : `In${i}`,
          type: 'input',
          activeLow: false,
          x: 0,
          y: inputStartY + i * 20
        });
      }
      
      // Output Pin (right side)
      component.pins.push({
        id: Math.random().toString(36).substring(2, 9),
        name: 'Out',
        type: 'output',
        activeLow: negated,
        x: component.width,
        y: component.height / 2
      });

      if (!suppressNotify) this.notify();
    }
  }

  public setComponentLock(id: string, locked: boolean, suppressNotify: boolean = false) {
    const comp = this.components.find(c => c.id === id);
    if (comp) {
      comp.locked = locked;
      if (!suppressNotify) this.notify();
    }
  }

  public updateTextProps(id: string, text: string, fontSize: number, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === id && c.type === 'text') as any;
    if (component) {
      component.text = text;
      component.fontSize = fontSize;
      if (!suppressNotify) this.notify();
    }
  }

  public updateShapeProps(id: string, fillColor: string, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === id && c.type === 'shape') as any;
    if (component) {
      component.fillColor = fillColor;
      if (!suppressNotify) this.notify();
    }
  }

  public togglePinActiveLow(componentId: string, pinId: string, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === componentId);
    if (component) {
      const pin = component.pins.find(p => p.id === pinId);
      if (pin) {
        pin.activeLow = !pin.activeLow;
        if (!suppressNotify) this.notify();
      }
    }
  }

  public setComponentPinActiveLowByName(componentId: string, pinName: string, activeLow: boolean, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === componentId);
    if (component) {
      const pin = component.pins.find(p => p.name === pinName);
      if (pin) {
        pin.activeLow = activeLow;
        if (!suppressNotify) this.notify();
      }
    }
  }

  public updateConnectionProps(id: string, label: string | undefined, busWidth: number | undefined, color: string | undefined, suppressNotify: boolean = false) {
    const connection = this.connections.find(c => c.id === id);
    if (connection) {
      connection.label = label || undefined;
      connection.busWidth = busWidth;
      connection.color = color;
      if (!suppressNotify) this.notify();
    }
  }

  public updateConnectionAnnotations(id: string, labelOffset?: Point, widthPos?: Point, suppressNotify: boolean = false) {
    const conn = this.connections.find(c => c.id === id);
    if (conn) {
      if (labelOffset !== undefined) conn.labelOffset = labelOffset;
      if (widthPos !== undefined) conn.widthPos = widthPos;
      if (!suppressNotify) this.notify();
    }
  }

  public deleteSelected() {
    const connectionsToDelete = new Set<string>(this.selectedConnectionIds);

    if (this.selectedComponentIds.length > 0) {
      const componentsToDelete = this.selectedComponentIds.filter(id => {
        const comp = this.components.find(c => c.id === id);
        return comp && !comp.locked;
      });

      this.components = this.components.filter(c => !componentsToDelete.includes(c.id));

      this.connections.forEach(c => {
        if (c.source.type === 'pin' && componentsToDelete.includes(c.source.componentId)) {
          connectionsToDelete.add(c.id);
        }
        if (c.target.type === 'pin' && componentsToDelete.includes(c.target.componentId)) {
          connectionsToDelete.add(c.id);
        }
      });

      this.selectedComponentIds = this.selectedComponentIds.filter(id => !componentsToDelete.includes(id));
    }

    if (connectionsToDelete.size > 0) {
      const jointsToDelete = new Set<string>();

      let added = true;
      while (added) {
        added = false;

        this.connections.forEach(c => {
          if (connectionsToDelete.has(c.id)) {
            if (c.isSubBus) return;

            if (c.source.type === 'joint' && !jointsToDelete.has(c.source.jointId)) {
              jointsToDelete.add(c.source.jointId);
              added = true;
            }
            if (c.target.type === 'joint' && !jointsToDelete.has(c.target.jointId)) {
              jointsToDelete.add(c.target.jointId);
              added = true;
            }
          }
        });

        this.connections.forEach(c => {
          if (!connectionsToDelete.has(c.id)) {
            if ((c.source.type === 'joint' && jointsToDelete.has(c.source.jointId)) ||
              (c.target.type === 'joint' && jointsToDelete.has(c.target.jointId))) {
              connectionsToDelete.add(c.id);
              added = true;
            }
          }
        });
      }

      this.connections = this.connections.filter(c => !connectionsToDelete.has(c.id));
      this.joints = this.joints.filter(j => !jointsToDelete.has(j.id));
      this.selectedConnectionIds = [];
    }

    this.cleanOrphanedJoints();

    this.notify();
  }

  private cleanOrphanedJoints() {
    let changed = true;
    while (changed) {
      changed = false;
      const jointConnectionCount = new Map<string, number>();
      this.joints.forEach(j => jointConnectionCount.set(j.id, 0));

      this.connections.forEach(c => {
        if (c.source.type === 'joint') {
          jointConnectionCount.set(c.source.jointId, (jointConnectionCount.get(c.source.jointId) || 0) + 1);
        }
        if (c.target.type === 'joint') {
          jointConnectionCount.set(c.target.jointId, (jointConnectionCount.get(c.target.jointId) || 0) + 1);
        }
      });

      const jointsToRemove = new Set<string>();

      // Handle joints with exactly 2 connections (merge them back)
      for (const [id, count] of jointConnectionCount.entries()) {
        if (count === 2) {
          const conns = this.connections.filter(c => 
            (c.source.type === 'joint' && c.source.jointId === id) || 
            (c.target.type === 'joint' && c.target.jointId === id)
          );
          
          if (conns.length === 2) {
            let mainConn = conns[0];
            let subConn = conns[1];
            
            // Prefer keeping the one that is NOT a subBus
            if (conns[1].isSubBus === false || (!conns[1].isSubBus && conns[0].isSubBus)) {
              mainConn = conns[1];
              subConn = conns[0];
            }

            const joint = this.joints.find(j => j.id === id);
            if (!joint) continue;

            const mainConnectsAsTarget = mainConn.target.type === 'joint' && mainConn.target.jointId === id;
            const subConnectsAsSource = subConn.source.type === 'joint' && subConn.source.jointId === id;
            const subConnectsAsTarget = subConn.target.type === 'joint' && subConn.target.jointId === id;

            if (mainConnectsAsTarget) {
              if (subConnectsAsSource) {
                mainConn.target = subConn.target;
                mainConn.waypoints = [...(mainConn.waypoints || []), {x: joint.x, y: joint.y}, ...(subConn.waypoints || [])];
              } else if (subConnectsAsTarget) {
                mainConn.target = subConn.source;
                mainConn.waypoints = [...(mainConn.waypoints || []), {x: joint.x, y: joint.y}, ...(subConn.waypoints ? [...subConn.waypoints].reverse() : [])];
              }
            } else {
              if (subConnectsAsTarget) {
                mainConn.source = subConn.source;
                mainConn.waypoints = [...(subConn.waypoints || []), {x: joint.x, y: joint.y}, ...(mainConn.waypoints || [])];
              } else if (subConnectsAsSource) {
                mainConn.source = subConn.target;
                mainConn.waypoints = [...(subConn.waypoints ? [...subConn.waypoints].reverse() : []), {x: joint.x, y: joint.y}, ...(mainConn.waypoints || [])];
              }
            }

            // Remove the subConn and the joint
            this.connections = this.connections.filter(c => c.id !== subConn.id);
            this.joints = this.joints.filter(j => j.id !== id);
            changed = true;
            break; // Restart loop to handle cascading merges cleanly
          }
        }
      }
      
      if (changed) continue;

      jointConnectionCount.forEach((count, id) => {
        // If a joint has 0 or 1 connection, it's dangling/orphaned.
        if (count <= 1) {
          jointsToRemove.add(id);
          changed = true;
        }
      });

      if (jointsToRemove.size > 0) {
        this.joints = this.joints.filter(j => !jointsToRemove.has(j.id));
        this.connections = this.connections.filter(c => {
          const sDel = c.source.type === 'joint' && jointsToRemove.has(c.source.jointId);
          const tDel = c.target.type === 'joint' && jointsToRemove.has(c.target.jointId);
          return !sDel && !tDel;
        });
      }
    }
  }

  public cloneSelectedComponents() {
    if (this.selectedComponentIds.length === 0 && this.selectedConnectionIds.length === 0) return;

    const newSelectedCompIds: string[] = [];
    const newSelectedConnIds: string[] = [];

    const compIdMap = new Map<string, string>();
    const pinIdMap = new Map<string, string>();
    const jointIdMap = new Map<string, string>();

    // 1. Clone components
    this.selectedComponentIds.forEach(id => {
      const original = this.components.find(c => c.id === id);
      if (original) {
        const clone = JSON.parse(JSON.stringify(original)) as DiagramComponent;
        clone.id = Math.random().toString(36).substring(2, 9);
        clone.x += 20;
        clone.y += 20;

        compIdMap.set(original.id, clone.id);

        clone.pins.forEach((pin, index) => {
          const oldPinId = original.pins[index].id;
          pin.id = Math.random().toString(36).substring(2, 9);
          pinIdMap.set(oldPinId, pin.id);
        });

        this.components.push(clone);
        newSelectedCompIds.push(clone.id);
      }
    });

    // 2. Clone implicit joints from selected connections
    this.selectedConnectionIds.forEach(connId => {
      const conn = this.connections.find(c => c.id === connId);
      if (conn) {
        if (conn.source.type === 'joint' && !jointIdMap.has(conn.source.jointId)) {
          jointIdMap.set(conn.source.jointId, Math.random().toString(36).substring(2, 9));
        }
        if (conn.target.type === 'joint' && !jointIdMap.has(conn.target.jointId)) {
          jointIdMap.set(conn.target.jointId, Math.random().toString(36).substring(2, 9));
        }
      }
    });

    jointIdMap.forEach((newJointId, oldJointId) => {
      const original = this.joints.find(j => j.id === oldJointId);
      if (original) {
        this.joints.push({
          id: newJointId,
          x: original.x + 20,
          y: original.y + 20
        });
      }
    });

    // 3. Clone selected connections
    this.selectedConnectionIds.forEach(connId => {
      const original = this.connections.find(c => c.id === connId);
      if (original) {
        const clone = JSON.parse(JSON.stringify(original)) as Connection;
        clone.id = Math.random().toString(36).substring(2, 9);

        // Handle Source
        if (clone.source.type === 'pin') {
          if (compIdMap.has(clone.source.componentId)) {
            clone.source.componentId = compIdMap.get(clone.source.componentId)!;
            clone.source.pinId = pinIdMap.get(clone.source.pinId)!;
          } else {
            // Dangling start -> convert to joint
            const uncopiedComp = this.components.find(c => c.id === (clone.source as any).componentId);
            const pin = uncopiedComp?.pins.find(p => p.id === (clone.source as any).pinId);
            const jId = Math.random().toString(36).substring(2, 9);
            this.joints.push({
              id: jId,
              x: (uncopiedComp?.x || 0) + (pin?.x || 0) + 20,
              y: (uncopiedComp?.y || 0) + (pin?.y || 0) + 20
            });
            clone.source = { type: 'joint', jointId: jId };
          }
        } else if (clone.source.type === 'joint') {
          clone.source.jointId = jointIdMap.get(clone.source.jointId)!;
        }

        // Handle Target
        if (clone.target.type === 'pin') {
          if (compIdMap.has(clone.target.componentId)) {
            clone.target.componentId = compIdMap.get(clone.target.componentId)!;
            clone.target.pinId = pinIdMap.get(clone.target.pinId)!;
          } else {
            // Dangling end -> convert to joint
            const uncopiedComp = this.components.find(c => c.id === (clone.target as any).componentId);
            const pin = uncopiedComp?.pins.find(p => p.id === (clone.target as any).pinId);
            const jId = Math.random().toString(36).substring(2, 9);
            this.joints.push({
              id: jId,
              x: (uncopiedComp?.x || 0) + (pin?.x || 0) + 20,
              y: (uncopiedComp?.y || 0) + (pin?.y || 0) + 20
            });
            clone.target = { type: 'joint', jointId: jId };
          }
        } else if (clone.target.type === 'joint') {
          clone.target.jointId = jointIdMap.get(clone.target.jointId)!;
        }

        if (clone.waypoints) {
          clone.waypoints = clone.waypoints.map(w => ({ x: w.x + 20, y: w.y + 20 }));
        }
        if (clone.widthPos) {
          clone.widthPos = { x: clone.widthPos.x + 20, y: clone.widthPos.y + 20 };
        }

        this.connections.push(clone);
        newSelectedConnIds.push(clone.id);
      }
    });

    this.selectedComponentIds = newSelectedCompIds;
    this.selectedConnectionIds = newSelectedConnIds;
    this.notify();
  }

  public exportState(): string {
    return JSON.stringify({
      components: this.components,
      connections: this.connections,
      joints: this.joints
    }, null, 2);
  }

  public importState(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);
      if (data.components && Array.isArray(data.components)) {
        this.components = data.components;
      }
      if (data.connections && Array.isArray(data.connections)) {
        this.connections = data.connections;
      }
      if (data.joints && Array.isArray(data.joints)) {
        this.joints = data.joints;
      }

      this.selectedComponentIds = [];
      this.selectedConnectionIds = [];
      this.notify();
      this.commit();
    } catch (e) {
      console.error("Error importing state:", e);
      throw e;
    }
  }
}
