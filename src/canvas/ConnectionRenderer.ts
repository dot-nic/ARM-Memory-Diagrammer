import { DiagramState } from '../models/DiagramState';
import { ConnectionTarget, Point } from '../models/types';

export class ConnectionRenderer {
  private ctx: CanvasRenderingContext2D;
  private state: DiagramState;

  constructor(ctx: CanvasRenderingContext2D, state: DiagramState) {
    this.ctx = ctx;
    this.state = state;
  }

  public setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // Resolves a target to a specific Point (x, y) on the canvas
  public getTargetPosition(target: ConnectionTarget): Point | null {
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

  // Generates orthogonal waypoints if they don't exist
  // A simple Z-shape route: move halfway horizontally, then vertically, then horizontally
  public calculateOrthogonalPath(start: Point, end: Point): Point[] {
    const midX = start.x + (end.x - start.x) / 2;
    return [
      { x: start.x, y: start.y },
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      { x: end.x, y: end.y }
    ];
  }

  public getComputedPath(conn: any): Point[] {
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

  public draw() {
    this.ctx.save();
    
    // Draw Connections
    const connections = this.state.getConnections();
    const selectedIds = this.state.getSelectedConnectionIds();
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    connections.forEach(conn => {
      const path = this.getComputedPath(conn);
        
      if (path.length > 0) {
        const isSelected = selectedIds.includes(conn.id);
        
        // Draw handles for selected
        if (isSelected) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.strokeStyle = '#2563eb';
          this.ctx.lineWidth = 2;
          
          this.ctx.beginPath();
          this.ctx.arc(path[0].x, path[0].y, 4, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 4, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        }

        // Glow for selected
        if (isSelected) {
          this.ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
          this.ctx.shadowBlur = 8;
        } else {
          this.ctx.shadowBlur = 0;
        }
        
        const color = conn.color || '#2563eb';
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.strokeStyle = isSelected ? '#60a5fa' : color;
        
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          this.ctx.lineTo(path[i].x, path[i].y);
        }
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0; // reset shadow for text

        // Find longest segment to draw label/width
        let longestSegmentIndex = 0;
        let maxDist = -1;
        for (let i = 0; i < path.length - 1; i++) {
          const dist = Math.hypot(path[i+1].x - path[i].x, path[i+1].y - path[i].y);
          if (dist > maxDist) {
            maxDist = dist;
            longestSegmentIndex = i;
          }
        }
        
        if (maxDist > 10) {
          const p1 = path[longestSegmentIndex];
          const p2 = path[longestSegmentIndex+1];
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

          // Draw bus width marker (a small diagonal slash and a number)
          const isLight = document.body.classList.contains('light-theme');
          const textAndSlashColor = isLight ? '#334155' : '#e2e8f0';
          const labelTextColor = isLight ? '#334155' : '#94a3b8';

          if (conn.busWidth && conn.busWidth > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(wx - 5, wy + 5);
            this.ctx.lineTo(wx + 5, wy - 5);
            this.ctx.strokeStyle = textAndSlashColor;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = textAndSlashColor;
            this.ctx.font = '10px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(conn.busWidth.toString(), wx + 8, wy - 6);
          }
          
          // Draw label
          if (conn.label) {
            this.ctx.fillStyle = labelTextColor;
            this.ctx.font = '12px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'bottom';
            const offset = (conn.busWidth && conn.busWidth > 1) ? 20 : 8;
            this.ctx.fillText(conn.label, lx, ly - offset);
          }
        }
      }
    });

    // Draw Joints
    const joints = this.state.getJoints();
    joints.forEach(joint => {
      const parentConn = this.state.getConnections().find(c => 
        (c.source.type === 'joint' && c.source.jointId === joint.id) || 
        (c.target.type === 'joint' && c.target.jointId === joint.id)
      );
      this.ctx.fillStyle = (parentConn && parentConn.color) ? parentConn.color : (document.body.classList.contains('light-theme') ? '#0f172a' : '#ffffff');
      this.ctx.beginPath();
      this.ctx.arc(joint.x, joint.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }
}
