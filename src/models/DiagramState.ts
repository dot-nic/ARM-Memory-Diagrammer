import { DiagramComponent, MemoryComponent, DecoderComponent, Connection, JointNode, Point } from './types';

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

  public updateMemoryProps(id: string, wordsStr: string, bits: number, suppressNotify: boolean = false) {
    const component = this.components.find(c => c.id === id && c.type === 'memory') as MemoryComponent;
    if (component) {
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
      this.components = this.components.filter(c => !this.selectedComponentIds.includes(c.id));

      this.connections.forEach(c => {
        if (c.source.type === 'pin' && this.selectedComponentIds.includes(c.source.componentId)) {
          connectionsToDelete.add(c.id);
        }
        if (c.target.type === 'pin' && this.selectedComponentIds.includes(c.target.componentId)) {
          connectionsToDelete.add(c.id);
        }
      });

      this.selectedComponentIds = [];
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
    while(changed) {
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
    if (this.selectedComponentIds.length === 0) return;

    const newSelectedIds: string[] = [];

    this.selectedComponentIds.forEach(id => {
      const original = this.components.find(c => c.id === id);
      if (original) {
        // Deep clone but change ids
        const clone = JSON.parse(JSON.stringify(original)) as DiagramComponent;
        clone.id = Math.random().toString(36).substring(2, 9);
        clone.x += 20;
        clone.y += 20;

        // Regenerate pin IDs to prevent conflicts
        clone.pins.forEach(pin => {
          pin.id = Math.random().toString(36).substring(2, 9);
        });

        this.components.push(clone);
        newSelectedIds.push(clone.id);
      }
    });

    this.selectedComponentIds = newSelectedIds;
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
